import { randomUUID } from "node:crypto"
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"
import { readFile } from "node:fs/promises"
import { isAbsolute, join } from "node:path"
import { Clock, Data, Effect, Either } from "effect"
import type { BacklogStore } from "../agent-registry/backlog.ts"
import {
  type RegistryError,
  type RegistryStore,
} from "../agent-registry/registry.ts"
import {
  governedAllowanceCheckpoints,
  isAllowancePool,
  isAllowanceSource,
  providerCallAllowanceCheckpoints,
  type AllowancePool,
  type ProviderAllowanceCheckpoint,
} from "./allowance-pool.ts"
import { sampleCodexWeeklyAllowance } from "./codex-allowance.ts"
import { decodeHarnessReviewHandoff } from "./harness-protocol.ts"
import {
  decodeJobSpec,
  isRegisteredKindFilter,
  JobRuntimeError,
  type Job,
} from "./job-runtime.ts"
import type { CanonicalPath } from "./review-duty-profile.ts"
import { ThrottleActivity } from "./throttle-activity.ts"
import {
  agentAllocation,
  allowanceRunway,
  calibrateProviderTokens,
  isAutonomousRole,
  providerTokenPolicy,
  rolePollingPolicy,
  usagePolicy,
  workflowTokenBudget,
  type AutonomousRole,
  type ProviderUsagePoint,
} from "./usage-policy.ts"
import { dashboardBacklogProjection } from "./backlog-projection.ts"
import {
  JobStoreError,
  type SqliteJobStore,
  type StoredJob,
} from "./sqlite-job-store.ts"

export const CONTROL_PLANE_PROTOCOL_VERSION = 1
export const CONTROL_PLANE_SCHEMA_VERSION = 6
const MAX_REQUEST_BODY_BYTES = 16 * 1_024
const LOOPBACK_HOSTS = ["127.0.0.1", "::1"] as const
const USAGE_SAMPLE_INTERVAL_MS = 60_000
const CODEX_ALLOWANCE_SAMPLE_INTERVAL_MS = 15 * 60_000
const USAGE_HISTORY_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000
const MAX_RESEARCH_SCHEDULE_SKEW_MS = 7 * 24 * 60 * 60 * 1_000
const OPENAI_AUTONOMOUS_ROLES: readonly AutonomousRole[] = [
  "general",
  "reviewer",
  "yielduck-operator",
  "moneymentum-operator",
]

const openAiControlCheckpoints = (
  checkpoints: readonly ProviderAllowanceCheckpoint[],
  now: number,
): readonly ProviderAllowanceCheckpoint[] => {
  const providerCheckpoints = providerCallAllowanceCheckpoints(
    checkpoints,
    "openai",
  )
  const manualCheckpoints = providerCheckpoints.filter(
    checkpoint => checkpoint.source === "manual",
  )
  if (allowanceRunway(manualCheckpoints, now)) return manualCheckpoints
  const observedCheckpoints = providerCheckpoints.filter(
    checkpoint => checkpoint.source === "codex-app-server",
  )
  return allowanceRunway(observedCheckpoints, now)
    ? observedCheckpoints
    : governedAllowanceCheckpoints(checkpoints)
}

const openAiControlSnapshot = (
  checkpoints: readonly ProviderAllowanceCheckpoint[],
  samples: readonly ProviderUsagePoint[],
  now: number,
  activity: ThrottleActivity,
) => {
  const controlCheckpoints = openAiControlCheckpoints(checkpoints, now)
  const latest = controlCheckpoints.toSorted(
    (left, right) => right.capturedAt - left.capturedAt,
  )[0]
  const policy = usagePolicy(controlCheckpoints, now)
  const calibration = calibrateProviderTokens(controlCheckpoints, samples)
  const providerBudget = providerTokenPolicy(policy, calibration)
  return {
    computedAt: now,
    provider: "openai" as const,
    pool: latest?.pool ?? "chatgpt-shared-weekly",
    source: latest?.source ?? "unavailable",
    profile: {
      kind: "flat-until-reset" as const,
      participants: 1,
    },
    policy,
    ...(calibration ? { calibration } : {}),
    ...(providerBudget ? { providerBudget } : {}),
    roles: OPENAI_AUTONOMOUS_ROLES.map(role =>
      rolePollingPolicy(role, policy.pace, policy.throttleRatio),
    ),
    activity: activity.snapshot(now),
  }
}

/** Delay before an unsuccessful harness attempt becomes claimable again. */
const HARNESS_RETRY_DELAY_MS = 5 * 60 * 1_000

export class ControlPlaneServerError extends Data.TaggedError(
  "ControlPlaneServerError",
)<{
  readonly code:
    | "invalid_bind"
    | "invalid_json"
    | "body_too_large"
    | "invalid_payload"
    | "request_failed"
    | "listen_failed"
    | "invalid_dashboard"
  readonly message: string
}> {}

/**
 * Every failure a request handler can produce. Naming the union keeps the
 * translator below exhaustive, so a new failure mode cannot reach a client
 * without being given a status here.
 */
export type ControlPlaneFailure =
  | ControlPlaneServerError
  | JobRuntimeError
  | JobStoreError

/**
 * The store operations a request can reach. Naming them keeps the routes
 * honest about what they touch — cancellation, recovery and the raw database
 * are not among them — and lets a caller supply exactly those.
 */
export type ControlPlaneJobStore = Pick<
  SqliteJobStore,
  | "enqueue"
  | "get"
  | "list"
  | "claimDue"
  | "complete"
  | "fail"
  | "recoverExpired"
  | "recordUsage"
  | "listUsage"
  | "recordAllowanceCheckpoint"
  | "listAllowanceCheckpoints"
  | "claimAutonomousAdmission"
  | "recordAgentIntervention"
  | "agentIntervention"
  | "reserveProviderCall"
  | "settleProviderCall"
>

export type ControlPlaneRegistryStore = RegistryStore &
  BacklogStore<RegistryError>

export interface ControlPlaneServerOptions {
  readonly host: string
  readonly port: number
  readonly store: ControlPlaneJobStore
  /** Home the harness payloads of enqueued jobs are admitted against. */
  readonly home: CanonicalPath
  readonly dashboardDirectory?: string
  readonly codexExecutable?: string
  readonly registryStore?: ControlPlaneRegistryStore
}

interface UsageSamplingStatus {
  status: "unavailable" | "sampling" | "ok" | "error"
  lastAttemptAt?: number
  lastCapturedAt?: number
  error?: "registry" | "store"
  allowance: {
    status: "unavailable" | "sampling" | "ok" | "error"
    lastAttemptAt?: number
    lastCapturedAt?: number
    error?: "provider" | "store"
  }
}

export interface RunningControlPlaneServer {
  readonly host: string
  readonly port: number
  readonly origin: string
  readonly close: Effect.Effect<void, ControlPlaneServerError>
}

const serverError = (
  code: ControlPlaneServerError["code"],
  message: string,
): ControlPlaneServerError => new ControlPlaneServerError({ code, message })

const sendJson = (
  response: ServerResponse,
  status: number,
  value: unknown,
): void => {
  const body = JSON.stringify(value)
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  })
  response.end(body)
}

const sendAsset = (
  response: ServerResponse,
  contentType: string,
  body: Buffer,
): void => {
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-length": body.length,
    "content-security-policy":
      "default-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "content-type": contentType,
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  })
  response.end(body)
}

const sendError = (
  response: ServerResponse,
  status: number,
  code: string,
  message: string,
): void => sendJson(response, status, { error: { code, message } })

const readBody = (
  request: IncomingMessage,
): Effect.Effect<string, ControlPlaneServerError> =>
  Effect.async(resume => {
    const chunks: Buffer[] = []
    let size = 0
    let settled = false
    const finish = (effect: Effect.Effect<string, ControlPlaneServerError>) => {
      if (settled) return
      settled = true
      resume(effect)
    }
    request.on("data", (chunk: Buffer | string) => {
      if (settled) return
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.length
      if (size > MAX_REQUEST_BODY_BYTES) {
        finish(
          Effect.fail(
            serverError(
              "body_too_large",
              `request body exceeds ${MAX_REQUEST_BODY_BYTES} bytes`,
            ),
          ),
        )
        return
      }
      chunks.push(buffer)
    })
    request.once("end", () =>
      finish(Effect.succeed(Buffer.concat(chunks).toString("utf8"))),
    )
    request.once("error", () =>
      finish(
        Effect.fail(serverError("request_failed", "request body read failed")),
      ),
    )
  })

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const parseJson = (
  body: string,
): Effect.Effect<unknown, ControlPlaneServerError> =>
  Effect.try({
    try: () => JSON.parse(body) as unknown,
    catch: () => serverError("invalid_json", "request body is malformed JSON"),
  })

const sendRequestFailure = (
  response: ServerResponse,
  failure: ControlPlaneServerError,
): Effect.Effect<void> =>
  Effect.sync(() => {
    if (failure.code === "body_too_large")
      sendError(response, 413, "body_too_large", "request body is too large")
    else if (failure.code === "invalid_json")
      sendError(response, 400, "invalid_json", "request body is malformed JSON")
    else if (failure.code === "invalid_payload")
      sendError(response, 400, "invalid_input", "request payload is invalid")
    else
      sendError(response, 400, "invalid_request", "request could not be read")
  })

const sendRuntimeFailure = (
  response: ServerResponse,
  failure: JobRuntimeError,
): Effect.Effect<void> =>
  Effect.sync(() => {
    if (failure.code === "invalid_input")
      sendError(response, 400, "invalid_input", "job request is invalid")
    else if (failure.code === "stale_lease")
      sendError(response, 409, "stale_lease", "job lease is stale")
    else sendError(response, 409, "invalid_transition", "job state has changed")
  })

const sendStoreFailure = (
  response: ServerResponse,
  failure: JobStoreError,
): Effect.Effect<void> =>
  Effect.sync(() => {
    if (failure.code === "not_found")
      sendError(response, 404, "not_found", "job was not found")
    else if (failure.code === "idempotency_conflict")
      sendError(
        response,
        409,
        "idempotency_conflict",
        "job key conflicts with existing input",
      )
    else if (failure.code === "capacity")
      sendError(response, 503, "capacity", "job store is at capacity")
    else
      sendError(response, 500, "internal_error", "control plane request failed")
  })

const handleAgents = (
  request: IncomingMessage,
  response: ServerResponse,
  registryStore: RegistryStore | undefined,
): Effect.Effect<void> => {
  if (request.method !== "GET") {
    sendError(response, 405, "method_not_allowed", "method is not allowed")
    return Effect.void
  }
  if (!registryStore) {
    sendJson(response, 200, { agents: [] })
    return Effect.void
  }
  const now = Date.now()
  return Effect.matchEffect(registryStore.snapshot(now), {
    onFailure: () =>
      Effect.sync(() =>
        sendError(
          response,
          500,
          "internal_error",
          "agent registry snapshot failed",
        ),
      ),
    onSuccess: registry =>
      Effect.sync(() =>
        sendJson(response, 200, {
          agents: (registry.agents ?? []).map(agent => ({
            id: agent.identity.id,
            presence: "runtime" as const,
            label: agent.label,
            cwd: agent.cwd,
            ...(agent.identity.model ? { model: agent.identity.model } : {}),
            usage: agent.usage,
            activities: agent.activities ?? [],
            roles: registry.leases
              .filter(
                lease =>
                  lease.owner.id === agent.identity.id &&
                  lease.status === "active",
              )
              .map(({ project, role, mode }) => ({ project, role, mode })),
            heartbeatAt: agent.heartbeatAt,
            expiresAt: agent.expiresAt,
          })),
        }),
      ),
  })
}

const handleBacklog = (
  request: IncomingMessage,
  response: ServerResponse,
  registryStore: ControlPlaneRegistryStore | undefined,
): Effect.Effect<void> => {
  if (request.method !== "GET") {
    sendError(response, 405, "method_not_allowed", "method is not allowed")
    return Effect.void
  }
  if (!registryStore) {
    sendJson(response, 200, dashboardBacklogProjection([]))
    return Effect.void
  }
  const projection = Effect.gen(function* () {
    const projects = yield* registryStore.backlogProjects()
    const states = yield* Effect.all(
      projects.map(project =>
        Effect.map(registryStore.backlogSnapshot(project), state => ({
          project,
          state,
        })),
      ),
      { concurrency: 1 },
    )
    return dashboardBacklogProjection(states)
  })
  return Effect.matchEffect(projection, {
    onFailure: () =>
      Effect.sync(() =>
        sendError(response, 500, "internal_error", "backlog projection failed"),
      ),
    onSuccess: value => Effect.sync(() => sendJson(response, 200, value)),
  })
}

const handleUsage = (
  request: IncomingMessage,
  response: ServerResponse,
  store: ControlPlaneJobStore,
  sampling: UsageSamplingStatus,
  activity: ThrottleActivity,
): Effect.Effect<void, ControlPlaneFailure> => {
  const now = Date.now()
  const since = Math.max(0, now - USAGE_HISTORY_WINDOW_MS)
  if (request.method === "GET")
    return Effect.map(
      Effect.all({
        samples: store.listUsage(since),
        checkpoints: store.listAllowanceCheckpoints(since),
      }),
      ({ samples, checkpoints }) =>
        sendJson(response, 200, {
          samples,
          checkpoints,
          sampling,
          control: openAiControlSnapshot(checkpoints, samples, now, activity),
        }),
    )
  if (request.method !== "POST") {
    sendError(response, 405, "method_not_allowed", "method is not allowed")
    return Effect.void
  }
  if (
    request.headers["content-type"]?.split(";", 1)[0]?.trim() !==
    "application/json"
  ) {
    sendError(
      response,
      415,
      "unsupported_media_type",
      "application/json is required",
    )
    return Effect.void
  }
  return Effect.gen(function* () {
    const input = yield* Effect.flatMap(readBody(request), parseJson)
    const isRefill =
      isRecord(input) &&
      exactKeys(input, [
        "provider",
        "pool",
        "source",
        "capturedAt",
        "remainingPercent",
        "event",
      ]) &&
      input.event === "refill"
    const isSample =
      isRecord(input) &&
      exactKeys(input, [
        "provider",
        "pool",
        "source",
        "capturedAt",
        "remainingPercent",
        "resetAt",
      ]) &&
      typeof input.resetAt === "number"
    if (
      !isRecord(input) ||
      (!isRefill && !isSample) ||
      !isAllowancePool(input.provider, input.pool) ||
      !isAllowanceSource(input.source) ||
      typeof input.capturedAt !== "number" ||
      typeof input.remainingPercent !== "number"
    ) {
      return yield* Effect.fail(
        new JobStoreError({
          code: "invalid_input",
          message: "allowance checkpoint shape is invalid",
        }),
      )
    }
    const checkpoint = yield* store.recordAllowanceCheckpoint({
      provider: input.provider,
      pool: input.pool as AllowancePool,
      source: input.source,
      capturedAt: input.capturedAt,
      remainingPercent: input.remainingPercent,
      ...(isRefill
        ? { event: "refill" as const }
        : { resetAt: input.resetAt as number }),
    })
    sendJson(response, 201, { checkpoint })
  })
}

const handleUsageControl = (
  request: IncomingMessage,
  response: ServerResponse,
  store: ControlPlaneJobStore,
  activity: ThrottleActivity,
  url: URL,
): Effect.Effect<void, ControlPlaneFailure> => {
  if (request.method !== "GET") {
    sendError(response, 405, "method_not_allowed", "method is not allowed")
    return Effect.void
  }
  const agentId = url.searchParams.get("agentId")
  const cwd = url.searchParams.get("cwd")
  const keys = [...url.searchParams.keys()]
  if (
    keys.some(key => key !== "agentId" && key !== "cwd") ||
    (agentId === null) !== (cwd === null) ||
    (agentId !== null && (agentId.length < 1 || agentId.length > 128)) ||
    (cwd !== null && (!isAbsolute(cwd) || cwd.length > 4_096))
  ) {
    sendError(response, 400, "invalid_payload", "throttle scope is invalid")
    return Effect.void
  }
  const now = Date.now()
  const since = Math.max(0, now - USAGE_HISTORY_WINDOW_MS)
  return Effect.gen(function* () {
    const { samples, checkpoints } = yield* Effect.all({
      samples: store.listUsage(since),
      checkpoints: store.listAllowanceCheckpoints(since),
    })
    const control = openAiControlSnapshot(checkpoints, samples, now, activity)
    if (agentId === null || cwd === null) {
      sendJson(response, 200, control)
      return
    }
    const interactionAt = yield* store.agentIntervention(agentId)
    sendJson(response, 200, {
      ...control,
      allocation: agentAllocation(cwd, interactionAt, now),
    })
  })
}

const handleUsageAdmission = (
  request: IncomingMessage,
  response: ServerResponse,
  store: ControlPlaneJobStore,
  activity: ThrottleActivity,
  url: URL,
): Effect.Effect<void, ControlPlaneFailure> => {
  if (request.method !== "POST") {
    sendError(response, 405, "method_not_allowed", "method is not allowed")
    return Effect.void
  }
  const role = url.searchParams.get("role")
  const kind = url.searchParams.get("kind") ?? "turn"
  const requestedText = url.searchParams.get("requestedTokens")
  const keys = [...url.searchParams.keys()]
  const requestedTokens =
    requestedText === null || !/^\d+$/u.test(requestedText)
      ? undefined
      : Number(requestedText)
  const validTurn = kind === "turn" && requestedText === null
  const validWorkflow =
    kind === "workflow" &&
    requestedTokens !== undefined &&
    Number.isSafeInteger(requestedTokens) &&
    requestedTokens >= 4_000 &&
    requestedTokens <= 5_000_000
  if (
    !role ||
    !isAutonomousRole(role) ||
    keys.some(
      key => key !== "role" && key !== "kind" && key !== "requestedTokens",
    ) ||
    (!validTurn && !validWorkflow)
  ) {
    sendError(response, 400, "invalid_payload", "usage admission is invalid")
    return Effect.void
  }

  const now = Date.now()
  const since = Math.max(0, now - USAGE_HISTORY_WINDOW_MS)
  return Effect.gen(function* () {
    const { samples, checkpoints } = yield* Effect.all({
      samples: store.listUsage(since),
      checkpoints: store.listAllowanceCheckpoints(since),
    })
    const control = openAiControlSnapshot(checkpoints, samples, now, activity)
    const rolePolicy = rolePollingPolicy(
      role,
      control.policy.pace,
      control.policy.throttleRatio,
    )
    const workflowBudget =
      validWorkflow && requestedTokens !== undefined
        ? workflowTokenBudget(requestedTokens, rolePolicy)
        : undefined
    const retryAt = Math.max(
      now + control.policy.minimumIntervalMs,
      control.policy.planningHorizonAt ?? 0,
    )
    if (rolePolicy.tokenScale <= 0 || workflowBudget?.allowed === false) {
      activity.record({
        at: now,
        kind: validWorkflow ? "workflow" : "turn",
        outcome: "blocked",
        role,
        ...(requestedTokens === undefined ? {} : { requestedTokens }),
        retryAt,
      })
      sendJson(response, 200, {
        admission: {
          allowed: false,
          retryAt,
          policy: control.policy,
          ...(validWorkflow ? { grantedTokens: 0 } : {}),
        },
      })
      return
    }
    const admission = yield* store.claimAutonomousAdmission(
      role,
      now,
      control.policy.minimumIntervalMs,
      rolePolicy.effectiveIntervalMs,
    )
    if (!admission.allowed) {
      activity.record({
        at: now,
        kind: validWorkflow ? "workflow" : "turn",
        outcome: "deferred",
        role,
        ...(requestedTokens === undefined ? {} : { requestedTokens }),
        retryAt: admission.retryAt,
      })
      sendJson(response, 200, {
        admission: {
          allowed: false,
          retryAt: admission.retryAt,
          policy: control.policy,
          ...(validWorkflow ? { grantedTokens: 0 } : {}),
        },
      })
      return
    }
    const grantedTokens = workflowBudget?.grantedTokens
    activity.record({
      at: now,
      kind: validWorkflow ? "workflow" : "turn",
      outcome:
        grantedTokens !== undefined && grantedTokens < (requestedTokens ?? 0)
          ? "scaled"
          : "admitted",
      role,
      ...(requestedTokens === undefined ? {} : { requestedTokens }),
      ...(grantedTokens === undefined ? {} : { grantedTokens }),
    })
    sendJson(response, 200, {
      admission: {
        allowed: true,
        policy: control.policy,
        ...(grantedTokens === undefined ? {} : { grantedTokens }),
      },
    })
  })
}

const validProviderReservationInput = (
  input: unknown,
  now: number,
): input is {
  readonly reservationId: string
  readonly agentId: string
  readonly cwd: string
  readonly role: AutonomousRole
  readonly provider: "openai"
  readonly requestedTokens: number
  readonly lane: "human" | "responsive" | "autonomous"
  readonly ownerInteractionAt: number | null
} =>
  isRecord(input) &&
  exactKeys(input, [
    "reservationId",
    "agentId",
    "cwd",
    "role",
    "provider",
    "requestedTokens",
    "lane",
    "ownerInteractionAt",
  ]) &&
  typeof input.reservationId === "string" &&
  input.reservationId.length > 0 &&
  input.reservationId.length <= 128 &&
  typeof input.agentId === "string" &&
  input.agentId.length > 0 &&
  input.agentId.length <= 128 &&
  typeof input.cwd === "string" &&
  input.cwd.startsWith("/") &&
  input.cwd.length <= 4_096 &&
  isAutonomousRole(input.role) &&
  input.provider === "openai" &&
  Number.isSafeInteger(input.requestedTokens) &&
  (input.requestedTokens as number) >= 1 &&
  (input.requestedTokens as number) <= 2_000_000 &&
  (input.lane === "human" ||
    input.lane === "responsive" ||
    input.lane === "autonomous") &&
  (input.ownerInteractionAt === null ||
    (typeof input.ownerInteractionAt === "number" &&
      Number.isSafeInteger(input.ownerInteractionAt) &&
      input.ownerInteractionAt >= 0 &&
      input.ownerInteractionAt <= now))

const handleProviderCallReserve = (
  request: IncomingMessage,
  response: ServerResponse,
  store: ControlPlaneJobStore,
  activity: ThrottleActivity,
): Effect.Effect<void, ControlPlaneFailure> => {
  if (request.method !== "POST") {
    sendError(response, 405, "method_not_allowed", "method is not allowed")
    return Effect.void
  }
  if (!hasJsonContentType(request)) {
    sendError(
      response,
      415,
      "unsupported_media_type",
      "application/json is required",
    )
    return Effect.void
  }
  return Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis
    const input = yield* Effect.flatMap(readBody(request), parseJson)
    if (!validProviderReservationInput(input, now))
      return yield* Effect.fail(
        serverError("invalid_payload", "provider reservation is invalid"),
      )

    const since = Math.max(0, now - USAGE_HISTORY_WINDOW_MS)
    const { samples, checkpoints } = yield* Effect.all({
      samples: store.listUsage(since),
      checkpoints: store.listAllowanceCheckpoints(since),
    })
    const control = openAiControlSnapshot(checkpoints, samples, now, activity)
    const budget = control.providerBudget
    if (!budget) {
      const retryAt = Math.max(
        now + 60_000,
        control.policy.planningHorizonAt ?? 0,
      )
      activity.record({
        at: now,
        kind: "provider-call",
        outcome: "blocked",
        role: input.role,
        requestedTokens: input.requestedTokens,
        retryAt,
      })
      sendJson(response, 200, { reservation: { allowed: false, retryAt } })
      return
    }

    if (input.ownerInteractionAt !== null) {
      yield* store.recordAgentIntervention({
        agentId: input.agentId,
        cwd: input.cwd,
        ownerInteractionAt: input.ownerInteractionAt,
      })
      activity.ownerInteracted(input.ownerInteractionAt, now)
    }
    const storedInteractionAt = yield* store.agentIntervention(input.agentId)
    const ownerInteractionAt = Math.max(
      input.ownerInteractionAt ?? 0,
      storedInteractionAt ?? 0,
    )
    const allocation = agentAllocation(
      input.cwd,
      ownerInteractionAt === 0 ? undefined : ownerInteractionAt,
      now,
    )
    const reservation = yield* store.reserveProviderCall({
      reservationId: input.reservationId,
      agentId: input.agentId,
      role: input.role,
      provider: input.provider,
      requestedTokens: input.requestedTokens,
      capacityTokens: budget.capacityTokens,
      windowMs: budget.windowMs,
      minimumIntervalMs: control.policy.minimumIntervalMs,
      allocationWeight: allocation.effectiveWeight,
      now,
    })
    if (reservation.allowed)
      activity.providerReserved(
        reservation.reservationId,
        input.role,
        reservation.reservedTokens,
        now,
      )
    else
      activity.record({
        at: now,
        kind: "provider-call",
        outcome: "deferred",
        role: input.role,
        requestedTokens: input.requestedTokens,
        retryAt: reservation.retryAt,
      })
    sendJson(response, 200, { reservation })
  })
}

const handleProviderCallSettle = (
  request: IncomingMessage,
  response: ServerResponse,
  store: ControlPlaneJobStore,
  activity: ThrottleActivity,
): Effect.Effect<void, ControlPlaneFailure> => {
  if (request.method !== "POST") {
    sendError(response, 405, "method_not_allowed", "method is not allowed")
    return Effect.void
  }
  if (!hasJsonContentType(request)) {
    sendError(
      response,
      415,
      "unsupported_media_type",
      "application/json is required",
    )
    return Effect.void
  }
  return Effect.gen(function* () {
    const input = yield* Effect.flatMap(readBody(request), parseJson)
    if (
      !isRecord(input) ||
      !exactKeys(input, ["reservationId", "actualTokens"]) ||
      typeof input.reservationId !== "string" ||
      input.reservationId.length === 0 ||
      input.reservationId.length > 128 ||
      typeof input.actualTokens !== "number" ||
      !Number.isSafeInteger(input.actualTokens) ||
      input.actualTokens < 0 ||
      input.actualTokens > 2_000_000
    )
      return yield* Effect.fail(
        serverError("invalid_payload", "provider settlement is invalid"),
      )
    const now = yield* Clock.currentTimeMillis
    const settlement = yield* store.settleProviderCall({
      reservationId: input.reservationId,
      actualTokens: input.actualTokens,
      now,
    })
    activity.providerSettled(settlement.reservationId, now)
    sendJson(response, 200, { settlement })
  })
}

/**
 * Reports the stored jobs and enqueues new ones. A job whose stored document
 * no longer decodes is listed separately by identifier and reason instead of
 * failing the read, so one unreadable row cannot blank the dashboard.
 */
const handleJobs = (
  request: IncomingMessage,
  response: ServerResponse,
  store: ControlPlaneJobStore,
  home: CanonicalPath,
): Effect.Effect<void, ControlPlaneFailure> => {
  if (request.method === "GET") {
    return Effect.flatMap(store.list(), stored =>
      Effect.sync(() =>
        sendJson(response, 200, {
          jobs: stored.flatMap(readableJob),
          unreadable: stored.flatMap(unreadableJob),
        }),
      ),
    )
  }
  if (request.method !== "POST") {
    sendError(response, 405, "method_not_allowed", "method is not allowed")
    return Effect.void
  }
  const contentType = request.headers["content-type"]?.split(";", 1)[0]?.trim()
  if (contentType !== "application/json") {
    sendError(
      response,
      415,
      "unsupported_media_type",
      "application/json is required",
    )
    return Effect.void
  }
  return Effect.gen(function* () {
    const body = yield* readBody(request)
    const input = yield* parseJson(body)
    const spec = yield* decodeJobSpec(input, home)
    if (spec.kind === "harness.research") {
      const now = yield* Clock.currentTimeMillis
      if (spec.runAt < now - MAX_RESEARCH_SCHEDULE_SKEW_MS)
        return yield* Effect.fail(
          serverError(
            "invalid_payload",
            "harness research schedule is implausibly old",
          ),
        )
    }
    const result = yield* store.enqueue(spec)
    sendJson(response, result.created ? 201 : 200, { job: result.job })
  })
}

/** A job the store holds but can no longer read, as the API reports it. */
interface UnreadableJobReport {
  readonly id: string
  readonly reason: string
}

const readableJob = (stored: StoredJob): readonly Job[] =>
  stored.outcome === "readable" ? [stored.job] : []

const unreadableJob = (stored: StoredJob): readonly UnreadableJobReport[] =>
  stored.outcome === "unreadable"
    ? [{ id: stored.id, reason: stored.reason }]
    : []

const hasJsonContentType = (request: IncomingMessage): boolean =>
  request.headers["content-type"]?.split(";", 1)[0]?.trim() ===
  "application/json"

const exactKeys = (
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean =>
  Object.keys(value).length === expected.length &&
  Object.keys(value).every(key => expected.includes(key))

const handleClaim = (
  request: IncomingMessage,
  response: ServerResponse,
  store: ControlPlaneJobStore,
): Effect.Effect<void, ControlPlaneFailure> => {
  if (request.method !== "POST") {
    sendError(response, 405, "method_not_allowed", "method is not allowed")
    return Effect.void
  }
  if (!hasJsonContentType(request)) {
    sendError(
      response,
      415,
      "unsupported_media_type",
      "application/json is required",
    )
    return Effect.void
  }
  return Effect.gen(function* () {
    const input = yield* Effect.flatMap(readBody(request), parseJson)
    if (
      !isRecord(input) ||
      !(
        exactKeys(input, ["workerId", "ttlMs"]) ||
        exactKeys(input, ["workerId", "ttlMs", "kinds"])
      ) ||
      typeof input.workerId !== "string" ||
      typeof input.ttlMs !== "number" ||
      ("kinds" in input &&
        (!Array.isArray(input.kinds) || !isRegisteredKindFilter(input.kinds)))
    ) {
      return yield* Effect.fail(
        serverError("invalid_payload", "worker claim payload is invalid"),
      )
    }
    const now = yield* Clock.currentTimeMillis
    yield* store.recoverExpired(now, 0)
    const job = yield* store.claimDue(
      input.workerId,
      randomUUID(),
      now,
      input.ttlMs,
      "kinds" in input &&
        Array.isArray(input.kinds) &&
        isRegisteredKindFilter(input.kinds)
        ? input.kinds
        : undefined,
    )
    if (job === undefined) response.writeHead(204).end()
    else sendJson(response, 200, { job })
  })
}

/**
 * Publishes what a leased worker reports. The handler owns only the request
 * shape: which transition a harness handoff drives, and whether it belongs to
 * the live attempt, is decided by the job runtime inside the store
 * transaction, so its typed failures pick the response status. The reply is
 * the record the transition produced, so a blocked attempt that still has
 * retries answers with the retrying job and the summary it was left with,
 * rather than reading as a finished one.
 */
const handleComplete = (
  id: string,
  request: IncomingMessage,
  response: ServerResponse,
  store: ControlPlaneJobStore,
): Effect.Effect<void, ControlPlaneFailure> => {
  if (request.method !== "POST") {
    sendError(response, 405, "method_not_allowed", "method is not allowed")
    return Effect.void
  }
  if (!hasJsonContentType(request)) {
    sendError(
      response,
      415,
      "unsupported_media_type",
      "application/json is required",
    )
    return Effect.void
  }
  return Effect.gen(function* () {
    const input = yield* Effect.flatMap(readBody(request), parseJson)
    const current = yield* store.get(id)
    if (current.spec.kind === "harness.review") {
      if (
        !isRecord(input) ||
        !exactKeys(input, ["leaseToken", "handoff"]) ||
        typeof input.leaseToken !== "string"
      ) {
        return yield* Effect.fail(
          serverError("invalid_payload", "typed harness handoff is required"),
        )
      }
      const handoff = yield* Effect.mapError(
        decodeHarnessReviewHandoff(input.handoff),
        // The decoder names the field an untrusted caller got wrong, so the
        // reply stays generic; the job runtime keeps the detail internally.
        () => serverError("invalid_payload", "harness handoff is invalid"),
      )
      const leaseToken = input.leaseToken
      const summary = `harness ${handoff.status}: ${handoff.assessment}`
      const result = { kind: "harness.review" as const, handoff }
      // Sampled against the transaction it is handed to, so a cancellation
      // that commits while the handoff is being decoded cannot make this
      // timestamp precede the state the transaction reads.
      const now = yield* Clock.currentTimeMillis
      const publish =
        handoff.status === "blocked" || handoff.status === "failed"
          ? store.fail(
              id,
              leaseToken,
              now,
              HARNESS_RETRY_DELAY_MS,
              summary,
              result,
            )
          : store.complete(id, leaseToken, now, summary, result)
      const job = yield* publish
      sendJson(response, 200, { job })
      return
    }
    if (current.spec.kind === "harness.research") {
      if (
        !isRecord(input) ||
        !exactKeys(input, ["leaseToken", "handoff"]) ||
        typeof input.leaseToken !== "string"
      )
        return yield* Effect.fail(
          serverError("request_failed", "typed research handoff is required"),
        )
      const handoff = yield* Effect.mapError(
        decodeHarnessResearchHandoff(input.handoff),
        () => serverError("request_failed", "research handoff is invalid"),
      )
      if (
        !harnessResearchHandoffMatchesAttempt(
          handoff,
          current.spec.payload,
          current.id,
          current.attempt,
        )
      )
        return yield* Effect.fail(
          serverError(
            "request_failed",
            "research handoff does not match the live attempt",
          ),
        )
      const job = yield* store.complete(
        id,
        input.leaseToken,
        Date.now(),
        handoff.summary,
        { kind: "harness.research", handoff },
      )
      sendJson(response, 200, { job })
      return
    }
    if (
      !isRecord(input) ||
      !exactKeys(input, ["leaseToken", "summary"]) ||
      typeof input.leaseToken !== "string" ||
      typeof input.summary !== "string"
    ) {
      return yield* Effect.fail(
        serverError("invalid_payload", "job completion payload is invalid"),
      )
    }
    const now = yield* Clock.currentTimeMillis
    const job = yield* store.complete(id, input.leaseToken, now, input.summary)
    sendJson(response, 200, { job })
  })
}

const handleFail = (
  id: string,
  request: IncomingMessage,
  response: ServerResponse,
  store: SqliteJobStore,
): Effect.Effect<void, unknown> => {
  if (request.method !== "POST") {
    sendError(response, 405, "method_not_allowed", "method is not allowed")
    return Effect.void
  }
  if (!hasJsonContentType(request)) {
    sendError(
      response,
      415,
      "unsupported_media_type",
      "application/json is required",
    )
    return Effect.void
  }
  return Effect.gen(function* () {
    const input = yield* Effect.flatMap(readBody(request), parseJson)
    if (
      !isRecord(input) ||
      !exactKeys(input, ["leaseToken", "retryDelayMs", "summary"]) ||
      typeof input.leaseToken !== "string" ||
      typeof input.retryDelayMs !== "number" ||
      typeof input.summary !== "string"
    ) {
      return yield* Effect.fail(
        serverError("request_failed", "job failure payload is invalid"),
      )
    }
    const job = yield* store.fail(
      id,
      input.leaseToken,
      Date.now(),
      input.retryDelayMs,
      input.summary,
    )
    sendJson(response, 200, { job })
  })
}

const dashboardAssets: Readonly<Record<string, readonly [string, string]>> = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/app.css": ["app.css", "text/css; charset=utf-8"],
}

const handleDashboard = (
  path: string,
  request: IncomingMessage,
  response: ServerResponse,
  directory: string,
): Effect.Effect<boolean, ControlPlaneServerError> => {
  const asset = dashboardAssets[path]
  if (!asset) return Effect.succeed(false)
  if (request.method !== "GET") {
    sendError(response, 405, "method_not_allowed", "method is not allowed")
    return Effect.succeed(true)
  }
  return Effect.map(
    Effect.tryPromise({
      try: () => readFile(join(directory, asset[0])),
      catch: () =>
        serverError("request_failed", "dashboard asset could not be read"),
    }),
    body => {
      sendAsset(response, asset[1], body)
      return true
    },
  )
}

const handleRequest = (
  request: IncomingMessage,
  response: ServerResponse,
  store: ControlPlaneJobStore,
  home: CanonicalPath,
  registryStore: ControlPlaneRegistryStore | undefined,
  usageSampling: UsageSamplingStatus,
  throttleActivity: ThrottleActivity,
  dashboardDirectory?: string,
): Effect.Effect<void> => {
  const route: Effect.Effect<URL, ControlPlaneFailure> = Effect.try({
    try: () => new URL(request.url ?? "/", "http://127.0.0.1"),
    catch: () => serverError("request_failed", "request URL is malformed"),
  })
  return Effect.catchTags(
    Effect.flatMap(route, url => {
      const { pathname: path } = url
      if (path === "/v1/health") {
        if (request.method !== "GET") {
          sendError(
            response,
            405,
            "method_not_allowed",
            "method is not allowed",
          )
          return Effect.void
        }
        sendJson(response, 200, {
          status: "ok",
          protocolVersion: CONTROL_PLANE_PROTOCOL_VERSION,
          schemaVersion: CONTROL_PLANE_SCHEMA_VERSION,
        })
        return Effect.void
      }
      if (path === "/v1/agents")
        return handleAgents(request, response, registryStore)
      if (path === "/v1/backlog")
        return handleBacklog(request, response, registryStore)
      if (path === "/v1/usage")
        return handleUsage(
          request,
          response,
          store,
          usageSampling,
          throttleActivity,
        )
      if (path === "/v1/usage/control")
        return handleUsageControl(
          request,
          response,
          store,
          throttleActivity,
          url,
        )
      if (path === "/v1/usage/admit")
        return handleUsageAdmission(
          request,
          response,
          store,
          throttleActivity,
          url,
        )
      if (path === "/v1/usage/provider-calls/reserve")
        return handleProviderCallReserve(
          request,
          response,
          store,
          throttleActivity,
        )
      if (path === "/v1/usage/provider-calls/settle")
        return handleProviderCallSettle(
          request,
          response,
          store,
          throttleActivity,
        )
      if (path === "/v1/jobs") return handleJobs(request, response, store, home)
      if (path === "/v1/worker/claim")
        return handleClaim(request, response, store)
      const completeMatch =
        /^\/v1\/jobs\/([A-Za-z0-9][A-Za-z0-9:._-]{0,127})\/complete$/u.exec(
          path,
        )
      if (completeMatch?.[1])
        return handleComplete(completeMatch[1], request, response, store)
      const failMatch =
        /^\/v1\/jobs\/([A-Za-z0-9][A-Za-z0-9:._-]{0,127})\/fail$/u.exec(path)
      if (failMatch?.[1])
        return handleFail(failMatch[1], request, response, store)
      if (dashboardDirectory) {
        return Effect.flatMap(
          handleDashboard(path, request, response, dashboardDirectory),
          handled => {
            if (!handled)
              sendError(response, 404, "not_found", "route was not found")
            return Effect.void
          },
        )
      }
      sendError(response, 404, "not_found", "route was not found")
      return Effect.void
    }),
    {
      ControlPlaneServerError: failure => sendRequestFailure(response, failure),
      JobRuntimeError: failure => sendRuntimeFailure(response, failure),
      JobStoreError: failure => sendStoreFailure(response, failure),
    },
  )
}

export const startControlPlaneServer = (
  options: ControlPlaneServerOptions,
): Effect.Effect<RunningControlPlaneServer, ControlPlaneServerError> => {
  if (
    options.host !== LOOPBACK_HOSTS[0] &&
    options.host !== LOOPBACK_HOSTS[1]
  ) {
    return Effect.fail(
      serverError(
        "invalid_bind",
        "control plane must bind to a loopback address",
      ),
    )
  }
  if (
    !Number.isSafeInteger(options.port) ||
    options.port < 0 ||
    options.port > 65_535
  ) {
    return Effect.fail(
      serverError(
        "invalid_bind",
        "control plane port must be between 0 and 65535",
      ),
    )
  }
  if (
    options.dashboardDirectory !== undefined &&
    (!isAbsolute(options.dashboardDirectory) ||
      options.dashboardDirectory.length > 1_024)
  ) {
    return Effect.fail(
      serverError(
        "invalid_dashboard",
        "dashboard directory must be a bounded absolute path",
      ),
    )
  }

  return Effect.async(resume => {
    const throttleActivity = new ThrottleActivity()
    const usageSampling: UsageSamplingStatus = {
      status: options.registryStore ? "sampling" : "unavailable",
      allowance: {
        status: options.codexExecutable ? "sampling" : "unavailable",
      },
    }
    let sampling = false
    let allowanceSampling = false
    const captureUsage = async (): Promise<void> => {
      if (!options.registryStore || sampling) return
      sampling = true
      const now = Date.now()
      usageSampling.status = "sampling"
      usageSampling.lastAttemptAt = now
      delete usageSampling.error
      try {
        const snapshot = await Effect.runPromise(
          Effect.either(options.registryStore.snapshot(now)),
        )
        if (Either.isLeft(snapshot)) {
          usageSampling.status = "error"
          usageSampling.error = "registry"
          return
        }
        const persisted = await Effect.runPromise(
          Effect.either(
            options.store.recordUsage(snapshot.right.agents ?? [], now),
          ),
        )
        if (Either.isLeft(persisted)) {
          usageSampling.status = "error"
          usageSampling.error = "store"
          return
        }
        usageSampling.status = "ok"
        usageSampling.lastCapturedAt = now
      } catch {
        usageSampling.status = "error"
        usageSampling.error = "store"
      } finally {
        sampling = false
      }
    }
    const captureCodexAllowance = async (): Promise<void> => {
      if (!options.codexExecutable || allowanceSampling) return
      allowanceSampling = true
      const now = Date.now()
      usageSampling.allowance.status = "sampling"
      usageSampling.allowance.lastAttemptAt = now
      delete usageSampling.allowance.error
      try {
        const sampled = await Effect.runPromise(
          Effect.either(
            sampleCodexWeeklyAllowance(options.codexExecutable, now),
          ),
        )
        if (Either.isLeft(sampled)) {
          usageSampling.allowance.status = "error"
          usageSampling.allowance.error = "provider"
          return
        }
        const persisted = await Effect.runPromise(
          Effect.either(options.store.recordAllowanceCheckpoint(sampled.right)),
        )
        if (Either.isLeft(persisted)) {
          usageSampling.allowance.status = "error"
          usageSampling.allowance.error = "store"
          return
        }
        usageSampling.allowance.status = "ok"
        usageSampling.allowance.lastCapturedAt = now
      } catch {
        usageSampling.allowance.status = "error"
        usageSampling.allowance.error = "provider"
      } finally {
        allowanceSampling = false
      }
    }
    void captureUsage()
    void captureCodexAllowance()
    const usageTimer = setInterval(
      () => void captureUsage(),
      USAGE_SAMPLE_INTERVAL_MS,
    )
    const allowanceTimer = setInterval(
      () => void captureCodexAllowance(),
      CODEX_ALLOWANCE_SAMPLE_INTERVAL_MS,
    )
    usageTimer.unref?.()
    allowanceTimer.unref?.()

    const server = createServer((request, response) => {
      void Effect.runPromise(
        handleRequest(
          request,
          response,
          options.store,
          options.home,
          options.registryStore,
          usageSampling,
          throttleActivity,
          options.dashboardDirectory,
        ),
      )
    })
    let settled = false
    server.once("error", () => {
      if (settled) return
      settled = true
      clearInterval(usageTimer)
      clearInterval(allowanceTimer)
      resume(
        Effect.fail(
          serverError("listen_failed", "control plane failed to listen"),
        ),
      )
    })
    server.listen(options.port, options.host, () => {
      if (settled) return
      settled = true
      const address = server.address()
      if (address === null || typeof address === "string") {
        server.close()
        resume(
          Effect.fail(
            serverError("listen_failed", "control plane has no bound address"),
          ),
        )
        return
      }
      const originHost = options.host === "::1" ? "[::1]" : options.host
      resume(
        Effect.succeed({
          host: options.host,
          port: address.port,
          origin: `http://${originHost}:${address.port}`,
          close: Effect.async<void, ControlPlaneServerError>(closeResume => {
            clearInterval(usageTimer)
            clearInterval(allowanceTimer)
            server.close(closeError =>
              closeResume(
                closeError
                  ? Effect.fail(
                      serverError(
                        "request_failed",
                        "control plane failed to close",
                      ),
                    )
                  : Effect.void,
              ),
            )
          }),
        }),
      )
    })
  })
}
