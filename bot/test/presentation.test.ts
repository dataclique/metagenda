import { Effect } from "effect"
import { expect, it } from "vitest"
import { telegramTextChunks } from "../src/presentation"

it("splits bounded Pi responses into Telegram-safe Unicode chunks", () => {
  const text = `${"a".repeat(3_999)}🙂${"b".repeat(4_100)}`
  const chunks = Effect.runSync(telegramTextChunks(text))
  expect(chunks).toHaveLength(3)
  expect(chunks.every(chunk => Array.from(chunk).length <= 4_000)).toBe(true)
  expect(chunks.join("")).toBe(text)
})

it("rejects empty response text instead of sending an invalid Telegram message", () => {
  expect(() => Effect.runSync(telegramTextChunks("   "))).toThrow(/non-empty/i)
})
