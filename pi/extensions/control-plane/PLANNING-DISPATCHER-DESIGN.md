# Responsive Planning and Dispatcher Lane

## Goal

Let the owner steer any live agent with low latency while the fleet maintains a slow, continuous worker burn. Planning, refinement, prioritization, and task decomposition remain tool-minimal and non-mutating. Every planning call is reserved, settled, and repaid from the same measured OpenAI runway; there is no bypass.

## Verified Current Shape

- `usage-policy.ts` computes a path-based base weight of `2` for ST0x agents and `1` for all other agents. Owner-interaction recency decays toward a `0.25` floor with a two-hour half-life.
- Direct human turns update the receiving agent. During authenticated owner-directed registry delegation, `agent-registry` queries the current human turn and emits the intervention for the lease owner/target cwd rather than the intermediary.
- `sqlite-job-store.ts` serializes provider reservations in SQLite, counts unresolved reservations against capacity, applies a fleet minimum interval, and returns deterministic retry jitter.
- The provider queue persists caller-supplied `allocationWeight` and orders by `queue age × stored weight`. Queued requests therefore retain an old recency value instead of decaying smoothly, and the store trusts callers to compute scheduling weight.
- `usage-governor` is intentionally disabled. This design does not authorize re-enabling it.

## Required Contract

1. Schedule per agent using the time since the owner's last direct or authenticated relayed intervention in that agent's work.
2. Attribute relayed intervention only to the target agent.
3. Give every ST0x agent base weight `2` and every other agent base weight `1`.
4. Decay recency smoothly while retaining a nonzero progress floor for every agent.
5. Allow immediate post-intervention work to borrow bounded future capacity; persist the debt and repay it through slower flexible service.
6. Account planning and worker calls against one fleet capacity. No priority class creates tokens.
7. Preserve per-agent FIFO and use deterministic jitter to prevent retry herds.
8. Prevent planning overhead from consuming the protected worker floor.

## Design A: Reserved Manager Pool

### Caller

```ts
dispatcher.plan({ ownerTurn, retrievalScope, maxTasks: 8 })
```

Reserve a fixed percentage of provider capacity for a dedicated planning model and give the remainder to workers. After a timeout, unused manager capacity spills into workers.

### State and Ownership

- Separate manager and worker token buckets.
- A dispatcher process owns planning retrieval and returns structured worker tasks.
- The central governor reserves and settles both buckets.

### Benefits

- Provides a simple planning-latency target and manager-overhead cap.
- Is easy to explain operationally.

### Costs and Failure Modes

- A static split wastes capacity when the owner is not interacting.
- A high split starves workers; a low split fails during interaction bursts.
- Cross-bucket spill and repayment recreate a second scheduler.
- Per-agent recency and ST0x weighting become additions to the worker pool rather than governing all fleet decisions.

### Falsification

Use Design A only if one unified ledger cannot meet owner latency without violating the worker floor in replay simulations.

## Design B: Unified Deficit Ledger with Protected Floor

### Caller

```ts
scheduler.reserve({
  agentId,
  cwd,
  kind: "planning" | "worker",
  requestedTokens,
  interventionGeneration,
})
```

The scheduler centrally computes weight and eligibility from persisted intervention state. Callers never submit an allocation weight.

### Allocation Model

Let `R(t)` be the sustainable fleet token rate from the verified allowance runway.

For agent `i`:

```text
baseWeight(i) = 2 for ST0x, otherwise 1
recency(i,t) = floor + (1 - floor) × 2^(-age(i,t) / halfLife)
effectiveWeight(i,t) = baseWeight(i) × recency(i,t)
```

Use the current evidence-backed defaults: `floor = 0.25` and `halfLife = 2h`.

Split each accrued fleet token once:

- **Worker floor:** `25% × R(t)`, distributed across active operational agents by base weight. Only worker requests can spend it.
- **Flexible capacity:** `75% × R(t)`, distributed by current effective weight. Planning and worker requests can spend it.

Unused worker-floor credit accrues only to a bounded cap. Beyond that cap, newly unused floor may spill into flexible capacity; already accrued floor is never taken from a waiting worker.

A planning request attached to a fresh intervention generation may borrow from its agent's future flexible share up to the smaller of:

- one bounded planning-call maximum; and
- fifteen minutes of that agent's current flexible accrual.

Borrowing makes the flexible balance negative. Later flexible accrual repays the debt before the agent receives additional flexible service. Worker-floor accrual and service continue while planning debt exists. Settlement releases an over-reservation or increases debt for measured overuse; it never creates capacity.

### Queue Discipline

- Maintain one FIFO queue per agent; only its head request is eligible.
- Recompute recency and balances centrally at each admission transaction. Do not persist a frozen weight.
- Serve a worker head when its protected-floor balance covers the request and its maximum service gap is due.
- Otherwise serve eligible fresh planning heads, then eligible flexible worker heads.
- Break equal eligibility by enqueue time, then reservation ID. Retry timestamps receive deterministic bounded jitter, but jitter never changes FIFO order.
- Allow at most one planning borrow per intervention generation. Replayed or agent-generated relay events cannot mint repeated bursts.

This is deficit round-robin with a protected worker subledger, not an unaccounted fast lane.

## Planning Lane Boundary

The planner receives:

- the authenticated owner objective;
- bounded current project, todo, and registry state;
- explicitly requested GitHub metadata, public documentation, project notes, or web pages;
- a fixed retrieval budget and deadline.

It may use only typed, read-only retrieval operations. It has no shell, edit, write, VCS mutation, publication, review-verdict, browser-control, or project-service tools. It cannot directly enqueue or mutate project work.

It returns one typed value:

```ts
interface DispatchPlan {
  readonly objective: string
  readonly priorities: readonly string[]
  readonly evidence: readonly {
    source: string
    claim: string
  }[]
  readonly tasks: readonly {
    id: string
    targetProject: string
    targetRole: string
    scope: string
    inputs: readonly string[]
    acceptance: readonly string[]
    dependencies: readonly string[]
    budgetClass: "small" | "standard" | "deep"
  }[]
  readonly unresolvedQuestions: readonly string[]
}
```

The owning Pi session validates the result, shows or records the plan, and uses the existing typed registry path to enqueue authorized tasks. Model output remains data and cannot grant mutation or publication authority.

## Intervention Attribution

Persist a typed monotonic event:

```ts
interface OwnerIntervention {
  readonly targetAgentId: string
  readonly targetCwd: string
  readonly at: number
  readonly generation: string
  readonly source: "direct" | "authenticated-relay"
  readonly sourceTurnId: string
}
```

- Direct interactive/RPC or authenticated Piece of Pi input records the receiving agent.
- A registry delegation records the lease owner only when the active source turn has owner provenance and delivery targets a live owner.
- Failed, unowned, ordinary agent-authored, or passive coordination requests do not record an intervention.
- A relay does not update the source or intermediary agent.
- The store rejects older timestamps, reused generations with different targets, future timestamps, and missing live target identity.

The scheduling store derives base weight from canonical cwd. Role names and caller-supplied numbers never choose weight.

## State and Dependency Direction

Add one scheduler-owned state boundary:

```text
verified allowance policy
          ↓
central scheduler policy → SQLite scheduler ledger/queue
          ↓
provider reservation API
          ↓
usage-governor transport adapters
```

Suggested persisted state:

- per-agent floor balance, flexible balance/debt, last-accrual time, and last-service time;
- latest intervention timestamp and generation;
- per-agent FIFO queue rows containing kind, requested tokens, enqueue time, and intervention generation;
- existing reservation and settlement rows.

Do not add scheduler state to registry leases, todo state, or individual extensions. Those components report identity and provenance; the control plane owns capacity.

## Typed Failures

- `AllowanceUnavailable`
- `ReserveReached`
- `UnknownAgent`
- `InvalidIntervention`
- `PlanningBorrowExhausted`
- `InsufficientFloorCredit`
- `InsufficientFlexibleCredit`
- `NotQueueHead`
- `ReservationConflict`
- `SettlementConflict`
- `CorruptSchedulerState`

Every denial returns one retry time and a plain reason. No fallback converts a denial into untracked execution.

## Proof Obligations

Use deterministic time-stepped simulations and real SQLite concurrency tests.

1. **Conservation:** For every interval, settled + reserved + available + debt adjustments equal initial capacity plus `∫R(t)dt`; no schedule exceeds the fleet envelope plus the explicit bounded borrow cap.
2. **Weight:** Equal-age ST0x agents receive exactly twice the long-run flexible allocation of equal-demand non-ST0x agents.
3. **Smooth decay:** An agent's flexible share decreases monotonically from fresh-interaction weight to the `0.25` floor without a discontinuity.
4. **Relay target:** An authenticated A→B owner relay updates B only; ordinary A→B coordination updates neither.
5. **Borrow and repayment:** A fresh planning request receives the bounded low-latency grant, records debt, and receives less flexible service until that exact debt is repaid.
6. **Worker progress:** Continuous planning demand cannot reduce worker throughput below the protected `25%` floor. Every continuously queued active worker is served within a calculated maximum gap.
7. **Manager overhead:** Planning settles at no more than `10%` of governed spend over a rolling four-hour window unless the owner explicitly changes the policy. The protected worker floor remains independent of this cap.
8. **FIFO and jitter:** Each agent's requests complete in enqueue order; equal global contenders use enqueue time and ID; retry jitter is bounded and deterministic.
9. **Concurrency:** Two SQLite connections cannot spend the same floor, flexible, or borrow credit.
10. **Idempotency:** Identical reserve, settle, or intervention replays are stable; conflicting replays fail closed.
11. **Lifecycle:** With `usage-governor` disabled, there is no live enforcement change. Re-enabling and canary rollout require separate owner authorization.

Operational acceptance targets:

- When above reserve and one planning borrow remains, p95 owner-to-plan admission is under 30 seconds.
- Worker throughput remains at least the protected floor during sustained owner interaction.
- Planning overhead remains below the rolling cap.
- Replay, concurrent-store tests, and canary telemetry show no provider-capacity overshoot.

## Migration

1. Extract a pure scheduler policy and simulation harness. Add conservation, weight, floor, decay, relay, borrow, and idempotency tests before changing admission.
2. Move weight calculation into the control plane. Remove `allocationWeight` from caller payloads and queue persistence.
3. Add scheduler tables through a versioned SQLite migration. Keep the old reservation API behavior behind a reversible feature flag.
4. Run shadow decisions against recorded reservation history. Compare owner latency, worker service gaps, total spend, and ST0x/non-ST0x allocation without enforcing the new result.
5. Add the tool-minimal planner with structured output and a strict rolling overhead cap.
6. Canary one `.config` planning lane while workers retain the old gate. Promote only after conservation and service-floor telemetry match the simulation.
7. Re-enable fleet enforcement only under separate owner authorization. Roll back by switching the reservation endpoint to the old policy; keep settlements and intervention history intact.

## Choice

Use Design B. One scheduler owns capacity, current recency, borrow debt, and fairness. The protected worker subledger prevents manager starvation, while the flexible subledger provides low latency after owner interaction with exact payback. Design A loses on utilization, locality, and duplicated scheduling state.
