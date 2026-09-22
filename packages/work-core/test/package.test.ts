import assert from "node:assert/strict"
import test from "node:test"
import * as core from "../src/canonical-backlog.ts"

void test("the receiving module exports a working decoder and preserves snapshot boundaries", () => {
  assert.equal(typeof core.decodeCanonicalBacklogSnapshot, "function")
  const snapshot: core.CanonicalBacklogSnapshot = {
    project: "/workspace/metagenda",
    source: "tracker-item",
    scopeId: "github:example/project",
    coverage: "partial",
    observedAt: 1,
    items: [],
  }
  assert.deepEqual(core.decodeCanonicalBacklogSnapshot(snapshot), snapshot)
  assert.equal(
    core.decodeCanonicalBacklogSnapshot({ ...snapshot, project: "relative" }),
    undefined,
  )
  assert.equal(
    core.decodeCanonicalBacklogSnapshot({ ...snapshot, coverage: "unknown" }),
    undefined,
  )
  assert.equal(
    core.decodeCanonicalBacklogSnapshot({ ...snapshot, observedAt: -1 }),
    undefined,
  )
  assert.equal(
    core.decodeCanonicalBacklogSnapshot({ ...snapshot, items: new Array(1) }),
    undefined,
  )
  assert.equal(
    core.decodeCanonicalBacklogSnapshot({
      ...snapshot,
      get items() {
        throw new Error("hostile getter")
      },
    }),
    undefined,
  )
})
