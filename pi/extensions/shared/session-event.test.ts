import assert from "node:assert/strict"
import test from "node:test"
import { Schema } from "effect"
import { SessionEvent } from "./session-event.ts"

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`

const registered = () => ({
  version: 1,
  sessionId: uuid(1),
  eventId: uuid(101),
  sequence: 1,
  occurredAt: 100,
  kind: "registered" as const,
  role: "worker" as const,
  capabilities: {
    model: "openai-codex/gpt-6.1-sol",
    reasoning: "medium" as const,
    tools: ["read", "grep", "workflow_audit"],
  },
})

const assigned = () => ({
  version: 1,
  sessionId: uuid(1),
  eventId: uuid(102),
  sequence: 2,
  occurredAt: 200,
  kind: "assigned" as const,
  jobId: uuid(10),
})

const attemptStarted = () => ({
  version: 1,
  sessionId: uuid(1),
  eventId: uuid(103),
  sequence: 3,
  occurredAt: 300,
  kind: "attempt-started" as const,
  jobId: uuid(10),
  attemptId: uuid(11),
})

const ownerLost = () => ({
  version: 1,
  sessionId: uuid(1),
  eventId: uuid(104),
  sequence: 4,
  occurredAt: 400,
  kind: "owner-lost" as const,
})

const decodeSync = (input: unknown) =>
  Schema.decodeUnknownSync(SessionEvent, { onExcessProperty: "error" })(input)

const expectRejected = (input: unknown) => {
  assert.throws(() => decodeSync(input))
}

test("accepts every declared event kind as the positive control", () => {
  for (const event of [registered(), assigned(), attemptStarted(), ownerLost()])
    assert.equal(decodeSync(event).kind, event.kind)
})

test("session identity must be a canonical uuid, never a pid composite", () => {
  expectRejected({ ...registered(), sessionId: "not-a-uuid" })
  expectRejected({
    ...registered(),
    sessionId: "AAAAAAAA-0000-4000-8000-000000000001",
  })
  expectRejected({
    ...registered(),
    sessionId: `${uuid(1)}:pid:4213`,
  })
})

test("event identities share the session identity constraints", () => {
  expectRejected({ ...registered(), eventId: "session:1" })
  expectRejected({ ...assigned(), eventId: `${uuid(102)}:pid:1` })
})

test("sequence and occurrence counters must be ordered safe integers", () => {
  expectRejected({ ...registered(), sequence: 0 })
  expectRejected({ ...registered(), sequence: 1.5 })
  expectRejected({ ...registered(), sequence: -1 })
  expectRejected({ ...registered(), sequence: Number.MAX_SAFE_INTEGER + 1 })
  expectRejected({ ...registered(), occurredAt: -1 })
  expectRejected({ ...registered(), occurredAt: Number.MAX_SAFE_INTEGER + 1 })
})

test("declared capabilities must be resolved and bounded", () => {
  const base = registered()
  expectRejected({
    ...base,
    capabilities: { ...base.capabilities, model: "" },
  })
  expectRejected({
    ...base,
    capabilities: {
      ...base.capabilities,
      reasoning: "inherit" as unknown as typeof base.capabilities.reasoning,
    },
  })
  expectRejected({
    ...base,
    capabilities: { ...base.capabilities, tools: [] },
  })
  expectRejected({
    ...base,
    capabilities: { ...base.capabilities, tools: ["read", "read"] },
  })
  expectRejected({
    ...base,
    capabilities: {
      ...base.capabilities,
      tools: Array.from({ length: 17 }, () => "read"),
    },
  })
  expectRejected({
    ...base,
    capabilities: { ...base.capabilities, tools: ["a".repeat(65)] },
  })
})

test("assignment linkage must reference committed job and attempt identities", () => {
  expectRejected({ ...assigned(), jobId: "job-1" })
  expectRejected({
    ...attemptStarted(),
    attemptId: `${uuid(11)}:pid:7`,
  })
})

test("terminal session events carry no execution fields", () => {
  assert.throws(() => decodeSync({ ...ownerLost(), attemptId: uuid(11) }))
})
