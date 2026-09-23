import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { Effect } from "effect"
import type { Job } from "./job-runtime.ts"
import {
  legacyAgentopsResearchJobs,
  reconcileLegacyAgentopsResearchJobs,
} from "./research-ownership.ts"
import { makeSqliteJobStore, type SqliteJobStore } from "./sqlite-job-store.ts"

const insertPersistedJob = (store: SqliteJobStore, job: Job): void => {
  store.unsafeDatabaseForTests
    .prepare(
      `INSERT INTO jobs (
         job_id, kind, idempotency_key, state, run_at,
         lease_until, updated_at, document
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      job.id,
      job.spec.kind,
      job.spec.idempotencyKey ?? null,
      job.state,
      job.spec.runAt,
      job.state === "leased" ? job.leaseUntil : null,
      job.updatedAt,
      JSON.stringify(job),
    )
}

const legacyResearch = (
  id: string,
  profile: string,
  state: "ready" | "leased" | "succeeded",
): Job => {
  const base = {
    id,
    spec: {
      kind: "harness.research" as const,
      payload: {
        lane: "subscription-plan" as const,
        harness: "claude-plan",
        profile,
        project: "yielduck",
        task: "bounded-task",
        repositoryRoot: "/Users/example/yielduck",
        isolation: "read-only" as const,
      },
      runAt: 1,
      maxAttempts: 2,
    },
    attempt: state === "ready" ? 0 : 1,
    createdAt: 1_000,
    updatedAt: 1_000,
  }
  if (state === "ready") return { ...base, state }
  if (state === "leased")
    return {
      ...base,
      state,
      workerId: "legacy-worker",
      leaseToken: "legacy-token",
      leaseUntil: 10_000,
    }
  return {
    ...base,
    state,
    finishedAt: 1_000,
    summary: "historical result",
    result: {
      kind: "harness.research",
      handoff: {
        protocolVersion: 1,
        jobId: id,
        attempt: 1,
        lane: "subscription-plan",
        profile,
        task: "bounded-task",
        status: "completed",
        summary: "historical result",
        evidence: ["bounded evidence"],
      },
    },
  }
}

test("legacy agentops research reconciliation cancels only active mislabeled jobs", async () => {
  const jobs = [
    legacyResearch("legacy-ready", "agentops-yielduck", "ready"),
    legacyResearch("legacy-leased", "agentops-yielduck", "leased"),
    legacyResearch("legacy-history", "agentops-yielduck", "succeeded"),
    legacyResearch("project-ready", "yielduck-research", "ready"),
  ]
  assert.deepEqual(
    legacyAgentopsResearchJobs(jobs).map(({ id }) => id),
    ["legacy-ready", "legacy-leased"],
  )

  const root = await mkdtemp(join(tmpdir(), "pi-research-ownership-test-"))
  const store = await Effect.runPromise(
    makeSqliteJobStore(join(root, "jobs.sqlite")),
  )
  try {
    insertPersistedJob(store, jobs[1])
    insertPersistedJob(store, jobs[0])
    insertPersistedJob(store, jobs[3])

    const result = await Effect.runPromise(
      reconcileLegacyAgentopsResearchJobs(store, 2_000),
    )
    assert.deepEqual(result, {
      cancelled: ["legacy-leased", "legacy-ready"],
    })
    const cancelledReady = await Effect.runPromise(store.get("legacy-ready"))
    assert.equal(cancelledReady.state, "cancelled")
    const cancellationRequested = await Effect.runPromise(
      store.get("legacy-leased"),
    )
    assert.equal(cancellationRequested.state, "leased")
    assert.equal(
      cancellationRequested.state === "leased"
        ? cancellationRequested.cancelRequestedAt
        : undefined,
      2_000,
    )
    assert.equal(
      (await Effect.runPromise(store.get("project-ready"))).state,
      "ready",
    )

    assert.deepEqual(
      await Effect.runPromise(
        reconcileLegacyAgentopsResearchJobs(store, 3_000),
      ),
      { cancelled: ["legacy-leased"] },
    )
    const unchangedCancellation = await Effect.runPromise(
      store.get("legacy-leased"),
    )
    assert.equal(unchangedCancellation.updatedAt, 2_000)

    assert.deepEqual(
      await Effect.runPromise(
        reconcileLegacyAgentopsResearchJobs(store, 11_000),
      ),
      { cancelled: ["legacy-leased"] },
    )
    const terminalCancellation = await Effect.runPromise(
      store.get("legacy-leased"),
    )
    assert.equal(terminalCancellation.state, "cancelled")
    assert.equal(
      terminalCancellation.state === "cancelled"
        ? terminalCancellation.finishedAt
        : undefined,
      11_000,
    )
    assert.equal(
      (await Effect.runPromise(store.get("project-ready"))).state,
      "ready",
    )
  } finally {
    store.close()
    await rm(root, { recursive: true, force: true })
  }
})
