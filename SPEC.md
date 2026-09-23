# Metagenda Specification

Metagenda helps a small team deliver more work across projects without a
corresponding increase in coordination overhead. It brings together idea
refinement, priorities, work sessions, progress tracking, reviews,
retrospectives, and resource allocation.

The custom Pi harness, locally owned extensions, and agent pipeline support
research, planning, implementation, independent verification, and progress
reporting. Telegram provides a conversational interface; GitHub holds the
project backlog and reviewable changes.

This document defines the target system. Delivery order, migration steps, and
implementation status belong in the roadmap and delivery records.

## Agent coordination

The harness coordinates agent sessions, available tools, bounded work, review,
and recovery. Shared Pi extensions provide reusable capabilities across
projects. Durable delivery, canonical backlog reconciliation, role ownership,
and usage accounting support the pipeline without creating competing sources of
truth.

Execution remains bound to project scope and authenticated permissions. Routing,
registration, planning, and usage allocations do not grant new authority.
Upstream extensions remain pinned packages; locally owned source and personal
configuration retain their documented ownership boundaries.

A role describes responsibilities and capabilities; it does not require a
permanent process or conversation. A work item retains its identity, owner,
acceptance criteria, artifacts, and history across bounded runs. Engineering
capacity is shared across projects. A new project assignment starts with fresh
context; resuming an existing assignment restores its own context.

Workers can request research or implementation assistance as linked jobs in the
same scheduling and observability system. Dependencies and assignments may
change as findings arrive. The coordinating agent submits jobs, consumes their
outputs, and decides what to do next. The runtime enforces authorization,
budgets, concurrency, cancellation, and recovery.

### Jobs and worker pools

A job is a bounded execution request with a prompt and execution metadata,
including its allowed tools and allocated budget. Each job has an identity,
lifecycle state, outputs, and explicit failure or cancellation outcomes. An
execution attempt runs an existing job; it does not create a new backlog item.
The job registry retains these records, while the agent registry tracks
available sessions and their capabilities.

Each execution attempt has a durable identity linked to its job and owns its
outputs. Attempts distinguish pending, running, stopping, succeeded, failed,
cancelled, and interrupted states. Stable event identities and per-attempt
ordering prevent duplicate terminal transitions. Late events from older
attempts cannot overwrite the current job outcome.

An interactive client submits jobs to the supervised worker pool. Idle
capacity does not require model requests. The interactive coordinator and manager may read code and inspect
execution evidence, but they cannot modify code directly. Code changes run as
worker jobs. Tool configuration enforces this boundary instead of relying on
prompts.

Manager and worker launch modes select their respective capabilities. If a
manager already owns the manager role, starting another manager reports a
conflict instead of replacing it or creating a competing conversation.

### Session hosting

The manager provides one conversational entry point and coordinates work
requiring judgment. Runtime code owns scheduling, delivery, execution limits,
cancellation, and durable state. Workers can exchange scoped messages without
routing every exchange through a manager model turn. Messages distinguish
requests, evidence, proposed changes, and accepted assignments.

The target runtime embeds Pi through its SDK in supervised worker processes. The
orchestrator runs independently of the manager conversation and owns process
lifecycles. Clients interact with sessions through authenticated commands and
observe their events; no native Pi terminal must stay open. The manager is a
resumable session, not the process that keeps the rest of the system alive.

The manager and job workers use the same SDK session host. They differ in tools,
permissions, retained history, and memory policy. A persistent manager
conversation uses the same hosting interfaces as worker sessions. Shared session
hosting keeps event delivery, steering, cancellation, and recovery consistent
while isolating each session's process and conversation context.

The packaged TypeScript service runs under launchd on macOS or systemd on Linux.
The service manager supervises the orchestrator, which supervises Pi workers.
The orchestrator starts automatically at user login on a workstation or at boot
on an unattended host, under an account with only its required privileges.
Authorization to enable the service covers automatic starts and supervised
restarts under the same configuration until revoked. Workers launch on demand
after authorization and capacity checks. Service
restart preserves durable job state and does not resume explicitly stopped work.

### Component boundaries

These are responsibility boundaries, not package names or a build plan.

| Component    | Owns                                                                                  | Boundary                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Clients      | Voice, text conversation, job inspection, and direct controls                         | Submit authenticated commands and display observations; do not schedule work or enforce execution policy |
| Orchestrator | Job ownership, message delivery, authorization, priorities, budgets, and cancellation | Accept commands, authorize dispatch, reconcile execution events, and retain durable work state           |
| Execution    | Pi SDK sessions, model turns, tools, and session events                               | Execute scoped assignments and report evidence; cannot grant authority or allocate itself capacity       |
| Persistence  | Work records, session history, and artifacts                                          | Retain distinct records for recovery and inspection; a transcript is not job completion authority        |

```mermaid
flowchart TB
    Human[Human]
    subgraph System[Metagenda]
        Manager[Manager agent]
        Dashboard[Dashboard]
        Runtime[Orchestrator]
        Pool[Worker pool]
        Manager -->|Work requests and corrections| Runtime
        Runtime -->|Assignments and cancellation| Pool
        Pool -->|Results and execution events| Runtime
        Runtime -->|Results and questions| Manager
        Dashboard -->|Control commands| Runtime
        Runtime -->|State and execution evidence| Dashboard
    end
    Human <-->|Telegram bot| Manager
    Human <-->|Menu-bar voice| Manager
    Human <-->|Inspect work and use controls| Dashboard
```

This view shows communication across the system boundary and between components.
The worker pool has no fixed job-specific subdivisions. The orchestrator
delivers work and collects execution evidence; dashboard controls reach it
without a manager turn. The following table separates retained records from the
processes using them.

| Component           | Retained records                       | Purpose                          |
| ------------------- | -------------------------------------- | -------------------------------- |
| Orchestrator        | Assignments, ownership, and run status | Track job transitions            |
| Manager SDK session | Conversation and decisions             | Preserve context across restarts |
| Job SDK sessions    | Transcripts, diffs, and check results  | Support review and resumption    |

The manager belongs to execution: it is a session with coordination tools, not
the component that schedules work or owns authority. A direct Stop command
reaches the orchestrator without a manager turn. Work state, conversation
history, and artifacts have separate responsibilities; these records do not
require separate database products.

### Process supervision

Process boundaries isolate the orchestrator from model execution. Manager and
job hosts use the same SDK integration with separate session state. A job host
may be reused for another assignment only after releasing the previous
assignment's tools, context, and execution resources. Process supervision does
not replace job ownership or completion checks.

## Planning and execution

An idea can begin as a short message. Agents research its context, identify
missing information, and refine it into clear issues and sub-issues. Published
descriptions pass Unslop and retain the technical substance without private
conversation. Roadmap changes are proposed through a new or relevant existing PR
and checked independently before human review.

Weekly plans and daily priorities retain their original commitments and later
revisions. Reports distinguish planned, completed, carried-over, blocked, and
newly prioritized work, with evidence and missing coverage explicit. Priority
corrections reach affected agents; a completed job does not erase what was
originally planned.

Research, issue creation, assignment, execution, and publication have distinct
permissions. A conversation fragment is not an instruction to execute. Team
members act through authenticated identities and configured permissions.

One product-owner function maintains priorities across projects. Weekly
direction requires human approval before work is allocated to human or agent
capacity. Engineering assignments can include parallel research without making
research a mandatory stage for every job.

### Delivery and review

Publish a draft PR early and mark it ready at the first submission to the
internal review agent. Internal findings, configured automated reviews such as
CodeRabbit, and subsequent human feedback feed the same correction loop. Agent
acceptance does not impersonate a human GitHub review verdict.

The engineering assignment remains owned until review accepts the changes and
required findings are addressed. Waiting for review may release compute capacity
without discarding ownership, conversation, or artifacts. Revised code must be
checked against the current revision; earlier acceptance cannot approve unseen
changes.

The manager arbitrates both engineering-review and worker-auditor disputes.
Unresolved disputes go to a human for the final decision. A release-management
function may merge only under the project's explicit merge permissions and
satisfied checks and approvals. Merge conflicts and integration changes return
to verification before release.

```mermaid
flowchart TD
    Human([Human request])
    Complete([Feature or fix])
    subgraph Planning[Planning]
        Intake[Record request as an issue]
        Refine[Refinement]
        Priority[Prioritization]
        Queue[Actionable job queued for capacity]
        Clarify([Human clarification])
        Approve([Human priority approval])
    end
    Research[Linked research jobs]
    subgraph Implementation[Engineering and review]
        Engineering[Engineering and early draft PR]
        Review[Current-revision review job and configured CodeRabbit checks]
        Arbitration[Manager arbitration]
        HumanReview([Human PR review])
        HumanDecision([Human arbitration])
    end
    subgraph Delivery[Delivery and operations]
        Release{Delivery checks and required approvals satisfied?}
        Deliver[Authorized merge and delivery]
        Monitor[Observe service health]
        Deliver --> Monitor
    end
        Intake --> Refine --> Priority
        Refine -->|Missing evidence| Research
        Research -->|Findings to requesting job| Refine
        Engineering -->|Missing evidence| Research
        Research -->|Findings to requesting job| Engineering
        Queue -->|Worker capacity available| Engineering
        Engineering -->|Mark PR ready at first review submission| Review
        Review -->|Corrections| Engineering
        Review -->|Disagreement| Arbitration
        Arbitration -->|Resolution| Review
        Review -->|Accepted current revision| HumanReview
        Release -->|Yes| Deliver
        Release -->|Conflict or changed code| Engineering
    Human -->|Feature request or bug report| Intake
    Refine <-->|Questions and answers| Clarify
    Priority --> Approve --> Queue
    HumanReview -->|Changes requested| Engineering
    HumanReview -->|Approved when required by policy| Release
    HumanReview -->|Human approval not required by policy| Release
    Release -->|Missing checks or approvals| Blocked[Delivery blocked]
    Arbitration <-->|Escalation and decision| HumanDecision
    Deliver --> Complete
    classDef endpoint fill:#17324d,color:#ffffff,stroke:#69b7ff,stroke-width:3px
    class Human,Complete,Clarify,Approve,HumanReview,HumanDecision endpoint
```

This lifecycle follows an issue through delivery. Research jobs return evidence
to the job that requested it; they are not mandatory stages. New jobs queue when
worker capacity is unavailable. Engineering retains ownership through
corrections, and changed revisions repeat the applicable reviews. The release
gate waits for required checks and human approvals rather than treating missing
responses as acceptance. Human clarification and arbitration preserve the
affected job's context and evidence.

### Job handoffs by role

Columns represent responsibilities, not permanent workers. Arrows show logical
handoffs; the orchestrator handles delivery and scheduling. Repeated role labels
provide reference points within the sequence.

```mermaid
sequenceDiagram
    actor H as Human
    participant M as Manager
    participant P as Product owner
    participant E as Engineering
    participant R as Research
    participant V as Review
    participant D as Delivery

    H->>M: Feature request or bug report
    M->>P: Refine and record issue
    opt Evidence needed during refinement
        P->>R: Research job
        R-->>P: Findings
    end
    opt Clarification needed
        P->>H: Question
        H-->>P: Clarification
    end
    P->>H: Proposed priorities
    H-->>P: Approve direction
    P->>M: Prioritized actionable work
    M->>E: Engineering assignment
    Note over M,E: Queued until authorized capacity is available
    Note over E: Publish draft PR early
    opt Evidence needed during implementation
        E->>R: Linked research job
        R-->>E: Findings
    end

    Note over H: Human
    Note over M: Manager
    Note over P: Product owner
    Note over E: Engineering
    Note over R: Research
    Note over V: Review
    Note over D: Delivery

    E->>V: Mark PR ready and submit revision
    Note over V: Include configured automated reviews
    loop Review and corrections
        V-->>E: Findings
        opt Disputed finding
            E->>M: Evidence and disagreement
            M-->>E: Resolution
            opt Still unresolved
                M->>H: Request arbitration
                H-->>M: Final decision
                M-->>E: Decision
            end
        end
        E->>V: Corrected revision
    end
    V-->>E: Accept current revision

    Note over H: Human
    Note over M: Manager
    Note over P: Product owner
    Note over E: Engineering
    Note over R: Research
    Note over V: Review
    Note over D: Delivery

    E->>H: PR for human review
    opt Human requests changes
        H-->>E: Feedback
        E->>V: Revised changes
        V-->>E: Review outcome
        E->>H: Updated PR
    end
    H->>D: Required human approval
    E->>D: Reviewed revision and check results
    Note over D: Verify current approvals, checks, and merge authority
    opt Merge conflict or integration changes
        D->>E: Return for correction and verification
        E-->>D: Reverified revision and approvals
    end
    D-->>H: Feature or fix delivered
```

### Operations and urgent work

Humans set priorities, the manager coordinates execution, and workers perform
assigned jobs. An authenticated human urgency decision takes effect directly and
cannot be vetoed by the manager. Workers submit urgency proposals with reasons;
the manager approves or rejects them, records its rationale, and judges whether
the reason is sufficient. There is no minimum character count or deterministic
scoring rule. Urgency changes scheduling, while existing execution permissions
and release checks continue to apply.

Operator jobs observe service health and report evidence. A proposed hotfix is
validated independently with fresh context before it takes priority over planned
work. If capacity is full, preemption saves the interrupted assignment and its
artifacts, starts the urgent assignment with separate context, and permits later
resumption without mixing project state.

Operator and engineering assignments have separate contexts and permissions.
They share worker capacity and provider-budget accounting, with reserved
capacity for incidents. Preemption releases execution capacity while retaining
the interrupted job's state. All consumption counts against the shared allowance. Watchdog incident responses bypass application-imposed
pacing. Incident priority follows the response through independent validation,
engineering, review, and authorized release; a handoff must not place it back in
the ordinary background queue. Other urgent work receives reduced or no pacing
according to its priority. Ordinary work slows or pauses to compensate for the
capacity consumed. Urgency changes scheduling, not authority or acceptance
criteria, and provider-enforced limits still apply.

The orchestrator returns independent validation outcomes and reasons to the
watchdog. A validated urgent issue enters the delivery lifecycle with incident
priority. A valid nonurgent issue enters the backlog within authorized scope; an
unsubstantiated concern retains its assessment without starting engineering. The
watchdog receives the response outcome. Human review follows project policy;
unavailable required approval blocks release even during an incident.

Optional operator capabilities include emergency shutdown or other mitigation
while humans are unavailable. Each requires explicit authorization, bounded
actions, and domain-specific risk controls. Observed log text cannot grant those
permissions. Capability availability does not grant standing authorization to
operate production systems.

## Resource allocation

Project allocations are adjustable targets for engineering effort. Measured
consumption and deviations are visible across projects; no project has a fixed
percentage prescribed by the product.

Dynamic throttling adapts background work to remaining provider usage, reset
windows, queued priorities, and interactive demand. Interactive planning and
steering remain responsive. Allocation targets do not guarantee capacity, and
unavailable usage data or exhausted limits remain explicit. Throttling preserves
pause, cancellation, execution permissions, and concurrency limits.

Admission accounts for the remaining budget through the provider's reset window,
not only concurrent worker count. Reserve capacity for interactive requests and
urgent work. Requests for additional workers consume the same shared allowance;
delegation cannot multiply a job's budget. Missing or delayed usage information
reduces admissions conservatively rather than implying unlimited capacity.

Background work is paced across the remaining reset window so later priorities
retain capacity. The manager uses low reasoning effort and receives no
application-imposed pacing delays. Background admission must not hold up its
turns; analysis requiring more reasoning is delegated to workers. Manager usage
still counts against the shared allowance, and provider-enforced limits remain
visible. Background budgets protect interactive headroom rather than treating
manager consumption as free or unlimited.

Job configurations select model capability and reasoning effort to match the
work. Configurable tiers distinguish high-capability analysis, balanced work,
and fast economical jobs without prescribing model names. Tier assignments
require job-relevant quality checks; a cheaper model is suitable only when its
results meet the job's acceptance criteria. The manager's low-reasoning policy
does not constrain the reasoning effort of its delegated workers.

## Product boundaries

The system has one authoritative state across its tools. A proposed, assigned,
running, blocked, reviewed, or completed item is distinguished explicitly;
acknowledgement is not completion. A display name or model is not an identity or
authority.

The hierarchy is:

[SPEC.md](./SPEC.md) and [ROADMAP.md](./ROADMAP.md) -> GitHub issues -> bounded
execution jobs -> verified changes

The CLI supports Markdown parsing, task selection, work sessions, recording,
playback, and trace export. Telegram uses Piece of Pi; the observational
dashboard uses SolidJS and Dockview.

The system supports a single-machine deployment. Durable agent, work, and
message identities must not depend on process IDs, terminal panes, or local
filesystem paths. Host-local workspace locations remain explicit mappings.
Versioned messages and scoped authority support future remote integration.
Remote execution requires a separately defined contract for transport
authentication, version negotiation, idempotency, failure handling, and authority
propagation before deployment.

## Conversation and memory

Telegram, voice, and optional terminal or dashboard clients address the same
manager conversation. Switching clients does not create a second manager or lose
pending questions. Clients identify the conversation and preserve ordering and
deduplication when messages arrive concurrently.

A personal macOS menu-bar client can provide voice access from any application,
with a compact default view and an expandable live transcript. It should allow
inspection of transcription and explicit corrections to submitted instructions.
Personal voice clients remain separate from the shared package. A terminal may
remain available for direct work and debugging without being required for
routine supervision.

The manager retains conversation history and durable decisions across compaction
and restart. Retrieved memory records its source and revisions; a summary cannot
replace the original authorization evidence. General persistent memory is
enabled for the manager and disabled for workers. Workers retain job-scoped
context, transcripts, artifacts, and resumable state. Disabling general memory
does not discard job evidence. The memory and client packages must satisfy these
contracts.

## CLI contract

Parsing, planning, configuration, commands, recording, and lifetimes remain
separate. Fixtures are isolated and do not use a personal vault or live
services. Public command compatibility is maintained through versioned
contracts.

The portable `fj` contract includes the distinct Nix exports
`packages.<system>.fj` and `apps.<system>.fj`, plus `bin/fj` and
`share/nushell/fj/mod.nu`. The default app provides the Metagenda CLI. `fj`
provides default repository status, `help`, `issue list/view`, and
`pr list/view`, preserving gh argument and caller-working-directory semantics.
Completion suggests one argument at a time: `help`, `issue`, or `pr`, then
`list` or `view` for tracker commands.

Repository inspection commands grant no host, session, service, or state
authority. Routing helpers do not gain execution authority.

Default status uses But only for verified main-worktree topology and
source-branch heuristics. Linked or unmanaged worktrees use Git. Topology
failures and selected But failures cannot fall back to a successful result.

Nushell compatibility and intake details are documented in the
[import manifest](./docs/migrations/dotconfig-intake.md#downstream-consumer-dotconfig-nix-darwin).
`fj clanker search` is proposal-only and must retain credential-safe exclusions
and policy boundaries. Missing API behavior must be grounded in observed work
and source.

## Canonical backlog core

The private `packages/work-core/` ESM workspace imports the canonical decoder,
tracker/document normalizers and source tests from reviewed dotconfig revision
`31a31a2218d9fef19f401c8d5ee86250b42cb867`, preserving MIT provenance. Exports
are `./canonical-backlog` and `./backlog-normalization`; runtime dependencies
are Node path/crypto and Effect. Source tests and strict compiled-only consumer
checks remain separate gates.

Preserve the unversioned snapshot, `partial`/`complete` coverage, canonical
absolute project paths, source-qualified identities and revision hashes. The
decoder returns `undefined` for invalid input; normalizers retain typed Effect
errors. Absolute paths are not legacy CLI logical project identities.

This package does not collect data, persist plans, authorize execution, or
switch consumers. It is a prerequisite of
[planning #15](https://github.com/dataclique/metagenda/issues/15), not a
completed planner or shared Pi integration. Current delivery evidence belongs in
the [roadmap](./ROADMAP.md) and
[package provenance](./packages/work-core/PROVENANCE.md).

## Protocol and durable state

[Event Sorcery](https://github.com/dataclique/event-sorcery) provides Rust
event-sourcing primitives and durable job dispatch. A future integration through
its planned TypeScript bindings would record job and coordination state
transitions for recovery and inspection. Session transcripts remain separate
records. The initial pool uses the existing persistence contracts.

The Pi bridge and SQLite state use versioned contracts for identity, delivery
capability, claim lifecycle, question binding, and restart recovery. Pure
decoding is separate from transport and store effects.

Persisted and external values are validated. Unknown versions, malformed
identities, and invalid transitions cannot gain permissions through fallback
behavior. State formats define compatibility and recovery rules. Private state
is excluded from distributable packages and public artifacts.

## Dashboard contract

### Panels and controls

The dashboard provides independently arrangeable panels. Accurate data and
working controls take priority over polishing the default layout.

| Panel                   | Content and actions                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planning                | Idea intake, refinement, research, priorities, commitments, and progress toward delivery.                                                           |
| Jobs and queue          | All jobs, with queue and lifecycle filters; open any job regardless of state.                                                                       |
| Job output              | Inspect the request, limits, attempts, and results; stream running output and retain it after execution.                                            |
| Workers and roles       | Available and occupied workers, role responsibilities, assigned jobs, and measured consumption by role.                                             |
| Agent tasks             | Agent-maintained task lists, status, replies, and links to jobs and tracker issues.                                                                 |
| Questions               | Pending questions, prior answers, and authenticated answer submission bound to the original question.                                               |
| Pull requests           | Ownership, implementation and correction activity, checks, unresolved feedback, human review readiness, and merge readiness.                        |
| Usage                   | Overall token use and breakdowns by project and role, with missing or stale measurements explicit.                                                  |
| Resource allocation     | Editable project percentages, an apply action, and confirmation that the scheduler has adopted the change; compare targets with actual consumption. |
| Dependencies            | Prerequisites and blocked work, including dependencies on jobs, merges, answers, or capacity.                                                       |
| Services and incidents  | Deployed revisions, service health, incidents, and associated investigation or repair jobs.                                                         |
| Agent communication     | Requests, replies, and unacknowledged handoffs linked to their jobs.                                                                                |
| Workspaces              | Checkout ownership, associated jobs, and overlapping or abandoned edits.                                                                            |
| Execution configuration | Actual model, reasoning effort, permitted tools, and loaded extension versions per worker.                                                          |
| Manager memory          | Retained knowledge and decisions with source and revision provenance.                                                                               |
| Recovery                | Interrupted jobs, retained evidence, and authenticated resume or replacement controls.                                                              |
| Delivery performance    | Time spent implementing, waiting, and revising, including repeated review cycles.                                                                   |

Panels link jobs, agent tasks, sessions, issues, pull requests, and evidence
without conflating their completion states. Job and worker panels expose direct
stop controls. Human priority controls apply urgency directly; worker proposals
and manager decisions remain inspectable with their reasons.

### Evidence and lifecycle

Fleet inspection must expose session identity, assigned jobs, active tools,
available outputs, usage, failures, and cancellation state. Background SDK
execution must not replace terminal visibility until the dashboard provides
equivalent inspection and direct controls.

The dashboard observes health, agents, jobs, backlog, and usage through a typed
server boundary. Malformed or unavailable data is represented explicitly. Layout
is not authoritative state.

Live execution events must come from the harness. Each run exposes its work
item, dependencies, current state, active tool, available output, usage, and
retries. Inspection leads to actual tool results, diffs, checks, review
findings, and retained transcripts rather than only an agent's summary. Access
to private content is scoped and redacted where required; transcripts are not
public logs. Missing usage, stale streams, disconnected workers, and incomplete
output remain visible. Reconnection reconciles retained events with current
execution state.

Direct Stop controls bypass model reasoning and manager message delivery. The
runtime blocks new dispatch and automatic retries for the stopped work, requests
cancellation of active execution and its owned child runs, and records effects
that completed before cancellation. It distinguishes stopping, stopped, failed
cancellation, and unknown execution state. Stop does not promise rollback of
external effects or terminate unrelated work. A global work stop leaves the
manager available to discuss corrections.

Stopped work does not automatically restart through a dependency, retry, or
replacement run. After corrections, an explicit authorized resume or replacement
retains the job's evidence and records the changed instructions. Human controls
remain available even when the manager model is unavailable.

Dashboard controls use separate authenticated commands with authorization,
failure behavior, and tests.

## Telegram contract

Telegram uses authenticated identity, session routing, question correlation,
durable delivery, and explicit configuration and state paths. Stale choices
cannot retarget a request. Duplicate delivery, retry, restart, expiry, and
cancellation each have explicit behavior.

Shared messages never mirror private owner or agent traffic. The protocol
remains versioned and validates identity, capability, delivery, and lifecycle
state at every boundary.

## Packaging and reproducibility

Portable packages are independent of a home directory, launcher, and private
configuration. Machine activation is separate. Skills and scripts may use shared
code, while deterministic validation and delivery remain in tested code. Source
provenance, licenses, and tracker history are preserved.

## Safety and lifecycle

Delegated owner instructions retain cryptographically verifiable origin,
content, and scope. An agent's interpretation or paraphrase is separate evidence
and cannot acquire owner authority by being forwarded. Verification must reject
tampering, replay outside the permitted scope, and expired or revoked authority.

Every tool call passes the authorization classifier. Independent audits may
challenge job interpretation, scope, or claimed completion using the original
instruction and execution evidence. Worker-auditor disagreements go to the
manager for an evidence-based resolution; that resolution cannot bypass policy
or expand authority. Unresolved disputes have bounded escalation rather than
indefinite retries. An uncontested need for clarification goes directly to the
human through Telegram; it does not require manager arbitration first.

Authority, privacy, stable durable identity, and terminal, retry, expiry, and
cancellation states are explicit. Typed boundaries fail safely without panics,
coercion, or invented results.

Listener, process, worker, temporary-file, and claim lifetimes are bounded.
Recovery is verified before retirement. Observations never become policy or
state authority.
