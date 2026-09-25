import { Data, Effect } from "effect"

const TELEGRAM_TEXT_LIMIT = 4_000

export class TelegramPresentationError extends Data.TaggedError(
  "TelegramPresentationError",
)<{
  readonly code: "empty_response"
  readonly message: string
}> {}

export const telegramTextChunks = (
  text: string,
): Effect.Effect<readonly string[], TelegramPresentationError> => {
  if (!text.trim()) {
    return Effect.fail(
      new TelegramPresentationError({
        code: "empty_response",
        message: "Telegram response must be non-empty",
      }),
    )
  }
  const characters = Array.from(text)
  const chunks: string[] = []
  for (
    let offset = 0;
    offset < characters.length;
    offset += TELEGRAM_TEXT_LIMIT
  ) {
    chunks.push(characters.slice(offset, offset + TELEGRAM_TEXT_LIMIT).join(""))
  }
  return Effect.succeed(chunks)
}
