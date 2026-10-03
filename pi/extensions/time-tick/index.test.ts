import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8")

test("time-tick uses a configurable interval with a safe default", () => {
  assert.match(source, /PI_TIME_TICK_INTERVAL_MS/)
  assert.match(source, /5 \* 60 \* 1_000/)
  assert.match(source, /Number\(process\.env\.PI_TIME_TICK_INTERVAL_MS\) > 0/)
})

test("time-tick updates status with elapsed session time and idle time", () => {
  assert.match(source, /setStatus/)
  assert.match(source, /STATUS_KEY = "time-tick"/)
  assert.match(source, /sessionStartedAt/)
  assert.match(source, /lastUserInputAt/)
  assert.match(source, /formatDuration/)
})

test("time-tick records user input and cleans up on shutdown", () => {
  assert.match(
    source,
    /pi\.on\("input", event => \{[\s\S]*?event\.source !== "extension"/,
  )
  assert.match(source, /pi\.on\("session_shutdown"[\s\S]*?clearInterval/)
  assert.match(source, /unref/)
})

test("time-tick does not trigger model turns", () => {
  assert.doesNotMatch(source, /sendMessage/)
  assert.doesNotMatch(source, /triggerTurn/)
  assert.doesNotMatch(source, /sendUserMessage/)
})
