import assert from "node:assert/strict"
import test from "node:test"
import { Effect } from "effect"
import * as normalizers from "../src/backlog-normalization.ts"

void test("tracker normalization preserves scoped partial observations", async () => {
  const result = await Effect.runPromise(
    normalizers.githubTrackerSnapshot({
      project: "/workspace/metagenda",
      repository: "example/project",
      coverage: "partial",
      observedAt: 1,
      items: [],
    }),
  )
  assert.deepEqual(result, {
    project: "/workspace/metagenda",
    source: "tracker-item",
    scopeId: "github:example/project",
    coverage: "partial",
    observedAt: 1,
    items: [],
  })
})

void test("document normalization does not interpret ordinary prose as declared work", async () => {
  const result = await Effect.runPromise(
    normalizers.backlogDocumentSnapshot({
      project: "/workspace/metagenda",
      documentId: "ROADMAP.md",
      observedAt: 1,
      content: "Some ordinary planning prose",
    }),
  )
  assert.deepEqual(result, {
    project: "/workspace/metagenda",
    source: "backlog-document",
    scopeId: "document:ROADMAP.md",
    coverage: "partial",
    observedAt: 1,
    items: [],
  })
})
