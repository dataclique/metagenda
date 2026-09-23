import { appendFileSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"

import { Effect, Logger, Option, Schema } from "effect"

export const RequestLifecyclePhase = {
  RequestStarted: "request.started",
  AuthStarted: "auth.started",
  CredentialReadStarted: "auth.credential_read.started",
  CredentialReadCompleted: "auth.credential_read.completed",
  AuthLockWait: "auth.lock.wait",
  AuthLockAcquired: "auth.lock.acquired",
  AuthLockReleased: "auth.lock.released",
  OAuthRefreshStarted: "auth.oauth_refresh.started",
  OAuthRefreshCompleted: "auth.oauth_refresh.completed",
  OAuthRefreshFailed: "auth.oauth_refresh.failed",
  AuthCompleted: "auth.completed",
  AuthFailed: "auth.failed",
  PayloadStarted: "provider.payload.started",
  AdmissionStarted: "provider.admission.started",
  AdmissionCompleted: "provider.admission.completed",
  TransportStarted: "provider.transport.started",
  ResponseStarted: "provider.response.started",
  RequestCompleted: "request.completed",
  RequestFailed: "request.failed",
  RequestAborted: "request.aborted",
} as const

export type RequestLifecyclePhase =
  (typeof RequestLifecyclePhase)[keyof typeof RequestLifecyclePhase]

export type RequestLifecycleSignal =
  | "pi.request.phase"
  | "pi.auth.phase"
  | "pi.provider.phase"
  | "pi.request.outcome"

export type RequestOutcome = "completed" | "failed" | "aborted"

export type RequestFailureClass =
  | "abort"
  | "auth"
  | "lock"
  | "provider"
  | "timeout"
  | "unknown"

export interface RequestLifecycleEvent {
  readonly schemaVersion: 1
  readonly signal: RequestLifecycleSignal
  readonly phase: RequestLifecyclePhase
  readonly requestId: string
  readonly timestamp: number
  readonly elapsedMs: number
  readonly pid: number
  readonly project: string
  readonly provider?: string | undefined
  readonly model?: string | undefined
  readonly outcome?: RequestOutcome | undefined
  readonly failureClass?: RequestFailureClass | undefined
}

export interface RequestLifecycleChannel {
  subscribe(listener: (message: unknown) => void): void
  unsubscribe(listener: (message: unknown) => void): void
}

export interface RequestLifecycleLoggingFailure {
  readonly operation: "prepare" | "append"
  readonly code: string
  readonly logPath: string
}

export type RequestLifecycleLoggingFailureHandler = (
  failure: RequestLifecycleLoggingFailure,
) => void

const RequestLifecycleEventSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  signal: Schema.Literal(
    "pi.request.phase",
    "pi.auth.phase",
    "pi.provider.phase",
    "pi.request.outcome",
  ),
  phase: Schema.Literal(
    RequestLifecyclePhase.RequestStarted,
    RequestLifecyclePhase.AuthStarted,
    RequestLifecyclePhase.CredentialReadStarted,
    RequestLifecyclePhase.CredentialReadCompleted,
    RequestLifecyclePhase.AuthLockWait,
    RequestLifecyclePhase.AuthLockAcquired,
    RequestLifecyclePhase.AuthLockReleased,
    RequestLifecyclePhase.OAuthRefreshStarted,
    RequestLifecyclePhase.OAuthRefreshCompleted,
    RequestLifecyclePhase.OAuthRefreshFailed,
    RequestLifecyclePhase.AuthCompleted,
    RequestLifecyclePhase.AuthFailed,
    RequestLifecyclePhase.PayloadStarted,
    RequestLifecyclePhase.AdmissionStarted,
    RequestLifecyclePhase.AdmissionCompleted,
    RequestLifecyclePhase.TransportStarted,
    RequestLifecyclePhase.ResponseStarted,
    RequestLifecyclePhase.RequestCompleted,
    RequestLifecyclePhase.RequestFailed,
    RequestLifecyclePhase.RequestAborted,
  ),
  requestId: Schema.String,
  timestamp: Schema.Number,
  elapsedMs: Schema.Number,
  pid: Schema.Number,
  project: Schema.String,
  provider: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
  outcome: Schema.optional(Schema.Literal("completed", "failed", "aborted")),
  failureClass: Schema.optional(
    Schema.Literal("abort", "auth", "lock", "provider", "timeout", "unknown"),
  ),
})

export const safeLifecycleEvent = (
  input: unknown,
): RequestLifecycleEvent | undefined =>
  Schema.decodeUnknownOption(RequestLifecycleEventSchema, {
    onExcessProperty: "error",
  })(input).pipe(Option.getOrUndefined)

export const requestLifecycleLogPath = (
  stateHome: string | undefined,
  userHome: string,
  pid: number,
): string =>
  `${stateHome ?? `${userHome}/.local/state`}/pi/logs/request-lifecycle-${pid}.jsonl`

const filesystemErrorCode = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code
  }
  return "UNKNOWN"
}

export const installRequestLifecycleLogging = (
  channel: RequestLifecycleChannel,
  logPath: string,
  onFailure: RequestLifecycleLoggingFailureHandler = () => undefined,
): (() => void) => {
  let active = true
  let subscribed = false

  const failClosed = (
    operation: RequestLifecycleLoggingFailure["operation"],
    error: unknown,
  ): void => {
    if (!active) return
    active = false
    try {
      onFailure({ operation, code: filesystemErrorCode(error), logPath })
    } catch {
      // A diagnostics callback must never turn observability failure into a crash.
    }
  }

  try {
    mkdirSync(dirname(logPath), { recursive: true, mode: 0o700 })
  } catch (error) {
    failClosed("prepare", error)
    return () => undefined
  }

  const fileLogger = Logger.structuredLogger.pipe(
    Logger.map(entry => {
      if (!active) return
      try {
        appendFileSync(logPath, `${JSON.stringify(entry)}\n`, {
          encoding: "utf8",
          mode: 0o600,
        })
      } catch (error) {
        failClosed("append", error)
      }
    }),
  )
  const loggerLayer = Logger.replace(Logger.defaultLogger, fileLogger)
  const listener = (message: unknown) => {
    if (!active) return
    const event = safeLifecycleEvent(message)
    if (!event) return
    Effect.logInfo(event.signal).pipe(
      Effect.annotateLogs({
        schemaVersion: event.schemaVersion,
        phase: event.phase,
        requestId: event.requestId,
        timestamp: event.timestamp,
        elapsedMs: event.elapsedMs,
        pid: event.pid,
        project: event.project,
        ...(event.provider === undefined ? {} : { provider: event.provider }),
        ...(event.model === undefined ? {} : { model: event.model }),
        ...(event.outcome === undefined ? {} : { outcome: event.outcome }),
        ...(event.failureClass === undefined
          ? {}
          : { failureClass: event.failureClass }),
      }),
      Effect.provide(loggerLayer),
      Effect.runSync,
    )
  }
  channel.subscribe(listener)
  subscribed = true
  return () => {
    if (subscribed) channel.unsubscribe(listener)
  }
}
