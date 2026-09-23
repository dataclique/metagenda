# Allocation-First Fleet Control

## Status

Proposed architecture. This document does not authorize process launch, session termination, provider spend, publication, or project mutation. The first implementation slice is shadow-only and must not create or stop a Pi runtime.

## Goal

The owner allocates bounded capacity to projects and workstreams, not to sessions or panes. A reconciler turns that desired state into independent runtime demand, structured work handoffs, provider reservations, and safe drains. A Zellij pane is only an optional interactive projection of a runtime while direct access is required.

Examples of the intended control surface:

```text
ST0x:       60% · max 3 workers · 7-day horizon · interactive on demand
Yielduck:   25% · max 1 worker  · continuous    · no required pane
.config:    15% · max 1 worker  · continuous    · one interactive runtime
```

The allocation is a share of the governed provider envelope, not a promise to keep that percentage of processes alive. If a workstream has no executable demand, its unused service remains governed and may be borrowed according to explicit policy; it never creates provider capacity.

## Verified Existing Boundaries

- `usage-policy.ts` already derives a provider runway and per-agent recency allocation. ST0x currently receives path-derived base weight `2`; other agents receive `1`.
- `sqlite-job-store.ts` already serializes provider reservations, settlements, queueing, intervention timestamps, and deterministic retry jitter.
- `agent-registry` now distinguishes runtime identity (`session + PID`) from durable session identity, and leases/requests carry typed ownership and delivery state.
- `jf clanker` now has source-tested resume admission that skips an already-live saved Pi session or refuses when none is inactive. This is a safety prerequisite, not the scaling abstraction.
- The job runtime owns durable scheduled/ready/leased/terminal transitions for a small allowlist of job kinds. It does not currently own arbitrary Pi runtime lifecycle.
- The responsive planning design already selected one central deficit ledger with a protected worker floor over a separate manager pool. Fleet allocation must reuse that ledger rather than introduce a second token scheduler.
- Pi runtime launch, headless supervision, and Zellij projection are not yet one typed lifecycle boundary. Their supported host APIs must be verified before the execution adapter is implemented.

## Invariants

1. A runtime instance and a saved session are different identities. One saved session has at most one live runtime.
2. Scaling out always creates a fresh runtime/session and transfers bounded structured work; it never clones a live transcript.
3. Allocation shares are normalized basis points and cannot exceed the declared account envelope.
4. `maxParallelism` is a hard ceiling, not a scheduling hint.
5. Provider reservation remains authoritative. Desired capacity cannot bypass hard reserve, runway pacing, per-call accounting, or project authority.
6. A pane never proves a runtime exists, owns a role, or may mutate a project. Registry/runtime state is authoritative.
7. Scale-down first stops new assignment, then drains or hands off, then releases leases, and only then requests runtime termination.
8. Model output and registry messages are untrusted data. They may propose a plan but cannot approve or apply it.
9. A plan is time-bounded. Expired desired state fails closed to its explicitly declared fallback; it never silently persists forever.
10. Reconciliation is idempotent. Replaying the same desired-state generation produces no duplicate launches, handoffs, drains, or pane projections.

## Caller-First Contract

### Propose

```ts
interface FleetPlanProposal {
  readonly id: FleetPlanProposalId
  readonly generation: FleetPlanGeneration
  readonly createdAt: number
  readonly expiresAt: number
  readonly allocations: readonly WorkstreamAllocation[]
  readonly digest: string
}

fleet.propose(input: NewFleetPlan): Effect<FleetPlanProposal, FleetPlanError>
```

Proposal creation is non-executing. A model may propose because a proposal grants no authority.

### Approve

```ts
interface ApprovedFleetPlan {
  readonly proposalId: FleetPlanProposalId
  readonly proposalDigest: string
  readonly approvedBy: "owner"
  readonly approvedAt: number
  readonly approvalQuestionId: number
}

fleet.approve(input: {
  readonly proposalId: FleetPlanProposalId
  readonly proposalDigest: string
  readonly resolvedQuestion: ResolvedFleetPlanQuestion
}): Effect<ApprovedFleetPlan, FleetPlanError>
```

Approval must bind the exact proposal digest to one durable owner answer. An ordinary model/tool call, registry request, generated continuation, forwarded Telegram quote, or agent-authored relay cannot create this value. Applying consumes an approval once.

### Reconcile

```ts
interface FleetReconcileInput {
  readonly approvedPlan: ApprovedFleetPlan
  readonly now: number
  readonly providerPolicy: UsagePolicy
  readonly registry: RegistrySnapshot
  readonly backlog: BacklogDemandSnapshot
  readonly runtimes: RuntimeSnapshot
}

interface FleetReconcileDecision {
  readonly generation: FleetPlanGeneration
  readonly observedAt: number
  readonly actions: readonly FleetAction[]
  readonly blocked: readonly FleetActionBlock[]
}

fleet.reconcile(input: FleetReconcileInput): Effect<
  FleetReconcileDecision,
  FleetReconcileError
>
```

The pure policy computes actions. A separate executor performs only allowlisted actions after revalidating generation, resources, identities, and authority.

## Domain Types

```ts
type BasisPoints = number // decoded boundary: integer 0..10_000

type InteractiveAccess =
  | { readonly kind: "none" }
  | { readonly kind: "on-demand" }
  | { readonly kind: "required"; readonly maximumPanes: number }

type Horizon =
  | { readonly kind: "continuous" }
  | {
      readonly kind: "bounded"
      readonly startsAt: number
      readonly endsAt: number
    }

type DrainPolicy =
  | { readonly kind: "finish-current"; readonly deadlineMs: number }
  | { readonly kind: "handoff-current"; readonly deadlineMs: number }

interface WorkstreamAllocation {
  readonly id: WorkstreamId
  readonly projectRoot: CanonicalProjectRoot
  readonly label: string
  readonly shareBps: BasisPoints
  readonly maxParallelism: number
  readonly horizon: Horizon
  readonly interactiveAccess: InteractiveAccess
  readonly drainPolicy: DrainPolicy
}

type RuntimeState =
  | { readonly kind: "starting"; readonly launchId: LaunchId }
  | { readonly kind: "ready"; readonly runtimeId: RuntimeAgentId }
  | {
      readonly kind: "assigned"
      readonly runtimeId: RuntimeAgentId
      readonly assignmentId: AssignmentId
    }
  | {
      readonly kind: "draining"
      readonly runtimeId: RuntimeAgentId
      readonly deadlineAt: number
    }
  | {
      readonly kind: "stopped"
      readonly runtimeId: RuntimeAgentId
      readonly stoppedAt: number
    }
  | {
      readonly kind: "failed"
      readonly launchId: LaunchId
      readonly error: RuntimeLifecycleError
    }

type FleetAction =
  | {
      readonly kind: "launch-fresh-runtime"
      readonly workstreamId: WorkstreamId
      readonly launchId: LaunchId
    }
  | {
      readonly kind: "offer-assignment"
      readonly runtimeId: RuntimeAgentId
      readonly handoff: StructuredAssignment
    }
  | {
      readonly kind: "begin-drain"
      readonly runtimeId: RuntimeAgentId
      readonly deadlineAt: number
    }
  | {
      readonly kind: "project-pane"
      readonly runtimeId: RuntimeAgentId
      readonly projectionId: ProjectionId
    }
  | {
      readonly kind: "remove-pane-projection"
      readonly projectionId: ProjectionId
    }
  | {
      readonly kind: "stop-drained-runtime"
      readonly runtimeId: RuntimeAgentId
    }
```

Invalid combinations are separate variants: a runtime cannot be simultaneously ready and draining; a pane action always references a proven runtime; a stop action is representable only for a drained runtime.

## Structured Assignment

A scale-out handoff contains only bounded task state:

```ts
interface StructuredAssignment {
  readonly id: AssignmentId
  readonly workstreamId: WorkstreamId
  readonly objective: string
  readonly requirements: readonly string[]
  readonly acceptance: readonly string[]
  readonly dependencies: readonly AssignmentId[]
  readonly sourceTodoIds: readonly number[]
  readonly sourceRequestIds: readonly string[]
  readonly authoritySummary: string
  readonly exclusions: readonly string[]
  readonly budget: {
    readonly maximumTokens: number
    readonly expiresAt: number
  }
  readonly digest: string
}
```

It is delivered through a typed request/assignment transition. Free-form prose remains visible evidence but cannot broaden the listed authority or remove exclusions.

## Design A: Declarative Replica Targets

The owner sets `desiredRuntimes` per project. A controller starts or drains runtimes until actual count equals desired count, then existing usage-governor weights their provider calls.

### Benefits

- Small implementation and familiar deployment-controller semantics.
- Easy to explain `ST0x = 2 runtimes`.
- Reuses the new independent runtime identity and safe fresh-session launcher.

### Costs

- Process count becomes the owner-facing abstraction again.
- Two runtimes can consume radically different token capacity, so replicas do not encode the requested 60% share.
- There is no principled mapping from weekly plan/horizon to process count.
- Idle replicas either waste capacity or require a second utilization scheduler.
- Pane count tends to leak back into capacity control.

### Falsification

Choose this only if measured worker token use is sufficiently uniform that replicas predict capacity within 10% across projects for four weeks. Current evidence does not establish that.

## Design B: Desired Allocation Ledger plus Runtime Reconciler

The owner sets workstream shares, parallelism ceilings, horizons, and interaction needs. The central provider scheduler accrues service by current approved workstream shares. The runtime reconciler observes executable backlog and starts fresh workers only when an allocation has demand that cannot be served within its parallelism/latency target.

### Allocation

- The approved workstream share partitions the sustainable governed token rate.
- Per-agent owner-intervention recency operates inside its workstream share; it cannot change the workstream's total long-run entitlement.
- The existing protected worker floor and flexible/debt ledger remain one conservation boundary.
- Unused workstream service may enter a bounded shared pool only under explicit borrowing policy. Debt is repaid from that same workstream's future allocation.
- `maxParallelism` caps assignments and starting/ready/assigned runtimes together.

### Runtime Demand

The reconciler considers:

- executable, unblocked assignments from the unified backlog;
- already assigned/starting/draining runtimes;
- service credit and provider admission;
- assignment size and deadline;
- interactive projection requirement;
- host resource preflight.

It does not launch a worker merely because a share exists. It emits `launch-fresh-runtime` only when demand is executable, provider service is available or predictably due, the hard parallelism ceiling permits it, and the host resource guard admits runtime creation.

### Benefits

- Matches the owner's allocation language directly.
- Reuses the provider conservation ledger instead of creating a second scheduler.
- Makes panes optional projections.
- Supports bounded horizons and weekly planning without translating everything to permanent sessions.
- Allows later headless workers without changing desired state.

### Costs

- Requires a new approved desired-state schema, runtime lifecycle store, pure reconciler, and execution adapter.
- Requires reliable backlog demand and terminal evidence; otherwise the reconciler may scale on stale work.
- Headless Pi supervision APIs remain unverified.

### Choice

Choose Design B. Design A is a useful interim execution adapter—`bump ST0x from one to two` can temporarily reconcile to one additional fresh runtime—but it must be derived from allocation demand and recorded as such. It must not become the durable user-facing model.

## Ownership and Dependency Direction

```text
owner-approved fleet plan
          ↓
fleet desired-state store
          ↓
pure allocation/runtime reconciler ← backlog demand snapshot
          ↓                              ↑
allowlisted action executor      registry/todo/request terminal evidence
          ↓
runtime supervisor ── optional pane projection adapter
          ↓
independent Pi runtime + structured assignment

verified provider policy → existing central reservation ledger → every runtime call
```

The control plane owns desired state, runtime lifecycle, and reconciliation. The registry owns live identity, leases, request delivery, and terminal evidence. Todos/backlog own requirements and status. The launcher owns process/session admission. Zellij owns only presentation. None may silently reconstruct another component's state.

## Typed Failures

- `MalformedFleetPlan`
- `AllocationSumExceeded`
- `ExpiredFleetPlan`
- `ApprovalMissing`
- `ApprovalDigestMismatch`
- `ApprovalAlreadyConsumed`
- `UnknownWorkstream`
- `StaleBacklogSnapshot`
- `StaleRuntimeSnapshot`
- `ParallelismLimitReached`
- `ProviderAdmissionDeferred`
- `HostResourceBlocked`
- `SessionAlreadyLive`
- `RuntimeLaunchFailed`
- `RuntimeRegistrationTimedOut`
- `AssignmentDeliveryFailed`
- `DrainDeadlineExceeded`
- `ProjectionFailed`
- `CorruptFleetState`

Every failure records whether retry is safe and the earliest retry time when one exists. No failure invents a fallback runtime, session, pane, allocation, or authority.

## Threat Model

### Assets

- Owner-approved allocation intent and its expiry.
- Provider allowance and reservation conservation.
- Exclusive saved-session ownership.
- Project mutation/publication authority and explicit exclusions.
- Live runtime/lease state and structured handoff integrity.
- Owner editor, Zellij layout, and interactive access.
- Source, Git state, credentials, caches, and configured live artifacts during launch/drain.

### Boundaries and STRIDE

1. **Model proposal → desired-state boundary**
   - Spoofing/elevation: a model or forwarded quote pretends to be owner approval.
   - Tampering: proposal changes after approval.
   - Control: proposals are inert; approval binds an exact digest to one durable owner answer and is single-use.

2. **Desired state → reconciler**
   - Tampering: malformed basis points, expired horizons, unknown project roots, or impossible parallelism.
   - DoS: thousands of workstreams or rapid generations.
   - Control: exact decoder, bounded counts/text/time ranges, canonical roots, monotonic generations, total share cap, and rate-limited proposal creation.

3. **Reconciler → runtime executor**
   - Spoofing: stale registry rows or pane state masquerade as a runtime.
   - Elevation: action executor launches outside approved roots or bypasses project authority.
   - DoS: duplicate replay launches many workers.
   - Control: digest-bound idempotent action IDs; fresh registry/resource revalidation; allowlisted project roots and launch adapters; hard parallelism ceiling.

4. **Runtime launch → Pi registration**
   - Spoofing: one saved session appears under multiple PIDs.
   - Repudiation: launched process never registers but remains orphaned.
   - Control: fresh sessions for scale-out; runtime-scoped identity; launch nonce; bounded registration deadline; exact process ownership and cleanup evidence.

5. **Assignment handoff → worker**
   - Tampering/elevation: free-form prose broadens authority or drops exclusions.
   - Information disclosure: handoff includes secrets or protected files.
   - Control: typed bounded fields; digest; high-confidence secret/path exclusion; authority cannot exceed direct owner/project policy; worker explicitly acknowledges the exact assignment.

6. **Drain/stop → runtime process**
   - Tampering/DoS: stale action kills the wrong PID or a worker with unpersisted work.
   - Repudiation: lease/process ends without a handoff or terminal record.
   - Control: PID identity/start-time verification; no stop before drain terminal evidence; deadline escalation is a typed blocked state, not automatic force kill.

7. **Runtime → Zellij projection**
   - Spoofing: pane existence is treated as worker health.
   - DoS: projection steals focus, destroys a layout, or overwrites the owner's draft.
   - Control: projection only after runtime proof; no synthetic pane/editor input; bounded project-owned pane ID; exact focus restoration; projection failure never stops the runtime.

### First Failing Abuse Tests

Before execution code exists, tests must fail for the right reason:

1. A model-created proposal cannot be applied without a matching resolved owner approval.
2. Reusing an approval for a second generation is rejected.
3. Changing one allocation after approval causes a digest mismatch.
4. Shares above 10,000 basis points and invalid horizons fail decoding.
5. Two concurrent reconciles for the same generation produce one launch action.
6. Starting + ready + assigned + draining count toward `maxParallelism`.
7. A live saved session cannot be selected for scale-out; a fresh session is required.
8. A stale registry heartbeat cannot satisfy runtime registration.
9. A pane without a runtime row cannot receive an assignment or satisfy desired capacity.
10. A handoff containing a protected path/high-confidence credential is rejected before delivery.
11. A drain without terminal assignment evidence cannot emit `stop-drained-runtime`.
12. PID reuse or mismatched process start identity prevents stop.
13. Projection failure does not kill, release, or reassign the runtime.
14. Provider reserve/defer state prevents launch/assignment demand from spending untracked tokens.
15. Replayed reconciliation after crash is idempotent across two SQLite connections.

## State Transitions

```text
proposal → awaiting owner approval → approved → active → expired/superseded
                         ↘ rejected

launch planned → starting → registered/ready → assigned → draining → stopped
                    ↘ failed          ↘ assignment failed     ↘ blocked
```

A new approved generation supersedes scheduling decisions from the old generation but does not abruptly stop its runtimes. They enter the new generation's reconciliation and drain only if excess.

## Migration and Vertical Slices

### Slice 1: Types and Shadow Policy

- Add exact fleet-plan/proposal/approval decoders and pure reconciliation types.
- Add the abuse tests above in red-first order.
- Persist proposals and approved generations in versioned SQLite tables.
- Expose read-only current/shadow decisions. No runtime action executor exists.

### Slice 2: Backlog and Registry Inputs

- Consume only typed executable backlog items with provenance and terminal evidence from the unified backlog work.
- Derive runtime snapshots from runtime-scoped registry identities, not panes or saved session files.
- Run shadow reconciliation and compare decisions with actual fleet behavior.

### Slice 3: Interim Fresh-Runtime Adapter

- Reuse `jf clanker --new` admission primitives and runtime/session identity.
- Verify the supported Pi supervision interface before choosing headless or interactive execution.
- Start one canary fresh runtime only from a consumed owner-approved generation.
- Require registration and structured assignment acknowledgement before counting it as capacity.

### Slice 4: Drain and Optional Projection

- Stop assignment, request bounded handoff, release leases, and stop only a proven drained owned process.
- Add optional Zellij projection without transcript cloning or pane-based identity.
- Never inject text into the owner's pane.

### Slice 5: Allocation Ledger Integration

- Replace caller/path-only allocation with approved workstream shares inside the existing central conservation ledger.
- Retain per-agent recency within each share and the protected worker floor.
- Shadow, then canary. Roll back to the old provider admission policy without discarding desired-state or settlement history.

### Slice 6: Weekly Joint Planning

- Produce a bounded proposed weekly plan for owner, employee, and agents.
- Record objectives, shares, horizons, dependencies, and human-only decisions.
- The planner remains read-only and cannot approve its own plan or contact stakeholders.

## Validation and Rollback

- Pure property tests: allocation conservation, monotonic horizon expiry, parallelism ceiling, deterministic action IDs, and no pane/session identity conflation.
- Real SQLite concurrency: proposal approval consumption, one launch per generation/action, idempotent reconcile, and crash replay.
- Runtime integration: fresh-session registration, duplicate-resume refusal, assignment acknowledgement, bounded launch timeout, and safe drain.
- Provider integration: every worker call retains existing reservation/settlement evidence; workstream totals converge to approved shares under sustained equal demand.
- UX: owner sees share, demand, actual runtime count, draining state, next action, and why a scale action is blocked.
- Rollback disables the action executor first. Existing runtimes continue under registry/provider controls; desired state remains readable; no automatic termination occurs.

## Open Evidence Needed Before Slice 3

1. Which supported Pi host mode provides durable headless/RPC supervision and clean shutdown without relying on a visible terminal?
2. What exact Zellij API can project an already-owned runtime without stealing focus or injecting editor input?
3. Which current backlog snapshot is authoritative enough to classify work as executable rather than merely pending?
4. What owner-facing approval UI should bind a fleet proposal digest: durable `ask_user`, a dedicated local TUI modal, or both through one typed approval event?

These questions do not block Slice 1 shadow types/tests, but they block runtime execution.
