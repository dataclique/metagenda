import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { Effect, Either } from "effect"
import { decodeCanonicalBacklogSnapshot, type CanonicalBacklogSnapshot } from "@metagenda/work-core/canonical-backlog"
import { githubTrackerSnapshot, backlogDocumentSnapshot, BacklogSourceAdapterError } from "@metagenda/work-core/backlog-normalization"

const snapshot: CanonicalBacklogSnapshot = await Effect.runPromise(githubTrackerSnapshot({
  project: "/workspace/metagenda", repository: "example/project", observedAt: 1,
  coverage: "partial", items: [{kind:"issue",number:1,title:"Keep scope",state:"open",labels:[],updatedAt:"2026-09-19"}],
}))
assert.deepEqual(decodeCanonicalBacklogSnapshot(snapshot), snapshot)
assert.equal(snapshot.items[0]?.canonicalId, "issue:1")
assert.match(snapshot.items[0]?.sourceId ?? "", /^github:example\/project:issue:1:[a-f0-9]{20}$/u)
const result = await Effect.runPromise(Effect.either(backlogDocumentSnapshot({project:"relative",documentId:"ROADMAP.md",observedAt:1,content:""})))
assert.ok(Either.isLeft(result))
assert.ok(result.left instanceof BacklogSourceAdapterError)
assert.equal(result.left.code, "invalid_input")
// @ts-expect-error Unknown coverage cannot enter the published snapshot contract.
const invalid: CanonicalBacklogSnapshot = { ...snapshot, coverage: "unknown" }
void invalid
assert.ok(import.meta.resolve("@metagenda/work-core/canonical-backlog").endsWith("/dist/canonical-backlog.js"))
assert.ok(import.meta.resolve("effect").startsWith(new URL("./node_modules/effect/", import.meta.url).href))
assert.equal(existsSync(new URL("./node_modules/@metagenda/work-core/src", import.meta.url)), false)
assert.throws(() => readFileSync(new URL("../outside-consumer", import.meta.url)), { code: "ERR_ACCESS_DENIED" })
console.log("actual compiled-only package types and Effect runtime: PASS")
