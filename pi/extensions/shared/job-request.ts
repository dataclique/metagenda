import { Schema } from "effect"
import { JobId } from "./job-attempt.ts"

export const JobOwnerSessionId = Schema.UUID.pipe(
  Schema.pattern(/^[0-9a-f-]+$/),
  Schema.brand("JobOwnerSessionId"),
)
const PositiveInteger = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.lessThanOrEqualTo(Number.MAX_SAFE_INTEGER),
)
const ToolName = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(64),
  Schema.pattern(/^[a-z][a-z0-9_:-]*$/),
  Schema.brand("JobToolName"),
)
const ModelPart = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(256),
  Schema.pattern(/^\S+$/),
)
const Output = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("text") }),
  Schema.Struct({
    kind: Schema.Literal("json-schema"),
    schemaJson: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(16_000)),
  }),
)
export const JobRequest = Schema.Struct({
  version: Schema.Literal(1),
  jobId: JobId,
  ownerSessionId: JobOwnerSessionId,
  prompt: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(32_000)),
  invocation: Schema.Struct({
    cwd: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(4_096)),
    model: Schema.Struct({ provider: ModelPart, id: ModelPart }),
    reasoning: Schema.Literal("off", "minimal", "low", "medium", "high", "xhigh", "max"),
    allowedTools: Schema.Array(ToolName).pipe(Schema.maxItems(16)),
  }),
  budget: Schema.Struct({
    tokenLimit: PositiveInteger,
    attemptTimeoutMs: PositiveInteger.pipe(Schema.lessThanOrEqualTo(2_147_483_647)),
    maxAttempts: PositiveInteger,
  }),
  output: Output,
})
export type JobRequest = typeof JobRequest.Type
