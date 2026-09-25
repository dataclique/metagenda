import { readFile } from "node:fs/promises"
import { Data, Effect } from "effect"

export interface BotConfig {
  readonly botToken: string
  readonly ownerUserId?: number
  readonly bridgePath: string
}

export class BotConfigError extends Data.TaggedError("BotConfigError")<{
  readonly code: "invalid_config" | "secret_unavailable"
  readonly message: string
}> {}

const ownerId = (
  value: string | undefined,
): Effect.Effect<number | undefined, BotConfigError> => {
  if (value === undefined || value.trim() === "") return Effect.succeed(undefined)
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Effect.succeed(parsed)
    : Effect.fail(
        new BotConfigError({
          code: "invalid_config",
          message: "METAGENDA_TELEGRAM_OWNER_ID must be a positive integer",
        }),
      )
}

const tokenFromFile = (path: string | undefined): Effect.Effect<string, BotConfigError> => {
  if (!path?.trim()) {
    return Effect.fail(
      new BotConfigError({
        code: "invalid_config",
        message: "METAGENDA_BOT_TOKEN_FILE is required",
      }),
    )
  }
  return Effect.tryPromise({
    try: () => readFile(path, "utf8"),
    catch: () =>
      new BotConfigError({
        code: "secret_unavailable",
        message: "Telegram token runtime file is unavailable",
      }),
  }).pipe(
    Effect.flatMap(raw => {
      const token = raw.trim()
      return token.length >= 8 && token.length <= 256 && !/[\u0000-\u001f\u007f\s]/.test(token)
        ? Effect.succeed(token)
        : Effect.fail(
            new BotConfigError({
              code: "invalid_config",
              message: "Telegram token runtime file is malformed",
            }),
          )
    }),
  )
}

export const loadBotConfig = (
  environment: Readonly<Record<string, string | undefined>>,
): Effect.Effect<BotConfig, BotConfigError> =>
  Effect.gen(function* () {
    const botToken = yield* tokenFromFile(environment.METAGENDA_BOT_TOKEN_FILE)
    const ownerUserId = yield* ownerId(environment.METAGENDA_TELEGRAM_OWNER_ID)
    const bridgePath = environment.METAGENDA_PI_BRIDGE?.trim() || "pi-bridge"
    if (bridgePath.length > 1_024 || /[\u0000-\u001f\u007f]/.test(bridgePath)) {
      return yield* Effect.fail(
        new BotConfigError({
          code: "invalid_config",
          message: "METAGENDA_PI_BRIDGE is malformed",
        }),
      )
    }
    return {
      botToken,
      ...(ownerUserId === undefined ? {} : { ownerUserId }),
      bridgePath,
    }
  })
