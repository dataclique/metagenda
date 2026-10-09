import { Schema } from "effect"
import { AttemptId, JobId } from "./job-attempt.ts"

// Session-side half of the v0.1 shared job and session event contract
// (SPEC "Jobs and worker pools" + ADR 01). A pool session is the durable
// execution context that runs job attempts: the interactive owning session
// and its workers.
//
// Identity-source decisions (recorded in todo #8 before this module):
// - SessionId identifies the Pi host session UUID (sessionManager
//   .getSessionId), the existing durable identity space. The agent-registry's
//   `${sessionId}:pid:${pid}` composite is a process-scoped lease identity
//   and is deliberately NOT used here: SPEC forbids process IDs in durable
//   identities.
// - Session events REFERENCE JobId/AttemptId from the merged attempt
//   contract; they never re-define execution events, which remain
//   attempt-owned.
// - Scope is session-level only: identity, capability declaration, job
//   assignment linkage, and session terminal state. Usage accounting,
//   cancellation, and outputs of execution are attempt events.
//
// This module owns the value contract only: no dispatch, no persistence, no
// admission or authority enforcement, and nothing here activates a pool.
export const SessionId = Schema.String.pipe(Schema.brand("SessionId"))
export const SessionEventId = Schema.String.pipe(Schema.brand("SessionEventId"))

const SessionRole = Schema.Literal("coordinator", "worker")

const sessionFields = {
  version: Schema.Literal(1),
  sessionId: SessionId,
  eventId: SessionEventId,
  sequence: Schema.Number,
  occurredAt: Schema.Number,
}

export const SessionEvent = Schema.Union(
  Schema.Struct({
    ...sessionFields,
    kind: Schema.Literal("registered"),
    role: SessionRole,
    capabilities: Schema.Struct({
      model: Schema.String,
      reasoning: Schema.Literal(
        "off",
        "minimal",
        "low",
        "medium",
        "high",
        "xhigh",
        "max",
      ),
      tools: Schema.Array(Schema.String),
    }),
  }),
  Schema.Struct({
    ...sessionFields,
    kind: Schema.Literal("assigned"),
    jobId: JobId,
  }),
  Schema.Struct({
    ...sessionFields,
    kind: Schema.Literal("attempt-started"),
    jobId: JobId,
    attemptId: AttemptId,
  }),
  Schema.Struct({
    ...sessionFields,
    kind: Schema.Literal("attempt-released"),
    jobId: JobId,
    attemptId: AttemptId,
  }),
  Schema.Struct({
    ...sessionFields,
    kind: Schema.Literal("closed", "owner-lost"),
  }),
)
export type SessionEvent = typeof SessionEvent.Type
