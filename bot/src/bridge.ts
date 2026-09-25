import { spawn } from "node:child_process"
import { Data, Effect } from "effect"

const BRIDGE_PROTOCOL_VERSION = 1
const PROCESS_TIMEOUT_MS = 10_000
const MAX_PROCESS_OUTPUT = 64 * 1024

export interface BridgeAgent {
  readonly id: string
  readonly label: string
  readonly accepting: boolean
  readonly expiresAt: number
}

interface BridgeMessageBase {
  readonly id: string
  readonly targetAgentId: string
  readonly createdAt: number
  readonly expiresAt: number
}

export type BridgeMessage =
  | (BridgeMessageBase & { readonly status: "queued" | "claimed" })
  | (BridgeMessageBase & {
      readonly status: "completed"
      readonly response: string
      readonly completedAt: number
    })
  | (BridgeMessageBase & {
      readonly status: "failed"
      readonly failure: string
      readonly completedAt: number
    })

export interface BridgeSendRequest {
  readonly agentId: string
  readonly dedupeKey: string
  readonly text: string
}

export interface PiBridge {
  readonly listAgents: () => Effect.Effect<
    readonly BridgeAgent[],
    BridgeClientError
  >
  readonly send: (
    request: BridgeSendRequest,
  ) => Effect.Effect<BridgeMessage, BridgeClientError>
  readonly result: (
    messageId: string,
  ) => Effect.Effect<BridgeMessage, BridgeClientError>
}

export class BridgeClientError extends Data.TaggedError("BridgeClientError")<{
  readonly code: "invalid_response" | "process_failed" | "process_timeout"
  readonly message: string
}> {}

type BridgeCommand = "agents" | "message"

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const stringField = (
  value: Readonly<Record<string, unknown>>,
  key: string,
): string => {
  const field = value[key]
  if (typeof field !== "string") {
    throw new BridgeClientError({
      code: "invalid_response",
      message: `bridge field ${key} is malformed`,
    })
  }
  return field
}

const numberField = (
  value: Readonly<Record<string, unknown>>,
  key: string,
): number => {
  const field = value[key]
  if (!Number.isSafeInteger(field) || typeof field !== "number" || field < 0) {
    throw new BridgeClientError({
      code: "invalid_response",
      message: `bridge field ${key} is malformed`,
    })
  }
  return field
}

const booleanField = (
  value: Readonly<Record<string, unknown>>,
  key: string,
): boolean => {
  const field = value[key]
  if (typeof field !== "boolean") {
    throw new BridgeClientError({
      code: "invalid_response",
      message: `bridge field ${key} is malformed`,
    })
  }
  return field
}

const decodeAgent = (value: unknown): BridgeAgent => {
  if (!isRecord(value)) {
    throw new BridgeClientError({
      code: "invalid_response",
      message: "bridge agent is malformed",
    })
  }
  return {
    id: stringField(value, "id"),
    label: stringField(value, "label"),
    accepting: booleanField(value, "accepting"),
    expiresAt: numberField(value, "expiresAt"),
  }
}

const decodeMessage = (value: unknown): BridgeMessage => {
  if (!isRecord(value)) {
    throw new BridgeClientError({
      code: "invalid_response",
      message: "bridge message is malformed",
    })
  }
  const status = stringField(value, "status")
  const base = {
    id: stringField(value, "id"),
    targetAgentId: stringField(value, "targetAgentId"),
    createdAt: numberField(value, "createdAt"),
    expiresAt: numberField(value, "expiresAt"),
  }
  if (status === "queued" || status === "claimed") return { ...base, status }
  if (status === "completed") {
    return {
      ...base,
      status,
      response: stringField(value, "response"),
      completedAt: numberField(value, "completedAt"),
    }
  }
  if (status === "failed") {
    return {
      ...base,
      status,
      failure: stringField(value, "failure"),
      completedAt: numberField(value, "completedAt"),
    }
  }
  throw new BridgeClientError({
    code: "invalid_response",
    message: "bridge message status is malformed",
  })
}

export function parseBridgeEnvelope(
  text: string,
  command: "agents",
): Effect.Effect<readonly BridgeAgent[], BridgeClientError>
export function parseBridgeEnvelope(
  text: string,
  command: "message",
): Effect.Effect<BridgeMessage, BridgeClientError>
export function parseBridgeEnvelope(
  text: string,
  command: BridgeCommand,
): Effect.Effect<readonly BridgeAgent[] | BridgeMessage, BridgeClientError> {
  return Effect.try({
    try: () => {
      const decoded: unknown = JSON.parse(text)
      if (!isRecord(decoded)) {
        throw new BridgeClientError({
          code: "invalid_response",
          message: "malformed bridge JSON",
        })
      }
      if (decoded.protocolVersion !== BRIDGE_PROTOCOL_VERSION) {
        throw new BridgeClientError({
          code: "invalid_response",
          message: "unsupported bridge protocol version",
        })
      }
      if (decoded.ok !== true || !("result" in decoded)) {
        throw new BridgeClientError({
          code: "invalid_response",
          message: "bridge command failed",
        })
      }
      if (command === "agents") {
        if (!Array.isArray(decoded.result)) {
          throw new BridgeClientError({
            code: "invalid_response",
            message: "bridge agent list is malformed",
          })
        }
        return decoded.result.map(decodeAgent)
      }
      return decodeMessage(decoded.result)
    },
    catch: error =>
      error instanceof BridgeClientError
        ? error
        : new BridgeClientError({
            code: "invalid_response",
            message: "malformed bridge JSON",
          }),
  })
}

const runBridge = (
  executable: string,
  args: readonly string[],
  stdin?: string,
): Effect.Effect<string, BridgeClientError> =>
  Effect.async<string, BridgeClientError>(resume => {
    const child = spawn(executable, [...args], {
      stdio: [stdin === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      shell: false,
    })
    let stdout = ""
    let stderrSize = 0
    let settled = false
    const finish = (result: Effect.Effect<string, BridgeClientError>): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resume(result)
    }
    const timer = setTimeout(() => {
      child.kill("SIGTERM")
      finish(
        Effect.fail(
          new BridgeClientError({
            code: "process_timeout",
            message: "pi-bridge timed out",
          }),
        ),
      )
    }, PROCESS_TIMEOUT_MS)
    timer.unref()

    child.stdout?.setEncoding("utf8")
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk
      if (stdout.length <= MAX_PROCESS_OUTPUT) return
      child.kill("SIGTERM")
      finish(
        Effect.fail(
          new BridgeClientError({
            code: "invalid_response",
            message: "pi-bridge output exceeded its limit",
          }),
        ),
      )
    })
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrSize += chunk.length
      if (stderrSize <= MAX_PROCESS_OUTPUT) return
      child.kill("SIGTERM")
      finish(
        Effect.fail(
          new BridgeClientError({
            code: "process_failed",
            message: "pi-bridge diagnostic exceeded its limit",
          }),
        ),
      )
    })
    child.on("error", () =>
      finish(
        Effect.fail(
          new BridgeClientError({
            code: "process_failed",
            message: "could not start pi-bridge",
          }),
        ),
      ),
    )
    child.on("close", code =>
      finish(
        code === 0
          ? Effect.succeed(stdout)
          : Effect.fail(
              new BridgeClientError({
                code: "process_failed",
                message: "pi-bridge command failed",
              }),
            ),
      ),
    )
    if (stdin !== undefined) child.stdin?.end(stdin)

    return Effect.sync(() => {
      clearTimeout(timer)
      if (!child.killed) child.kill("SIGTERM")
    })
  })

export const makePiBridge = (executable: string): PiBridge => ({
  listAgents: () =>
    runBridge(executable, ["agents"]).pipe(
      Effect.flatMap(output => parseBridgeEnvelope(output, "agents")),
    ),
  send: request =>
    runBridge(
      executable,
      ["send", "--agent", request.agentId, "--dedupe", request.dedupeKey],
      request.text,
    ).pipe(Effect.flatMap(output => parseBridgeEnvelope(output, "message"))),
  result: messageId =>
    runBridge(executable, ["result", "--id", messageId]).pipe(
      Effect.flatMap(output => parseBridgeEnvelope(output, "message")),
    ),
})
