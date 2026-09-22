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

Workers can request research or implementation assistance as linked tasks in the
same scheduling and observability system. Dependencies and assignments may
change as findings arrive. Scripted workflows remain useful for known sequences;
dynamic coordination does not remove review or authorization gates. Neither
mechanism requires a separate, hidden hierarchy of workers.

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

The manager and task workers use the same SDK session host. They differ in
tools, permissions, retained history, and memory policy. A persistent manager
conversation does not require a separate RPC implementation. Shared session
hosting keeps event delivery, steering, cancellation, and recovery consistent;
it does not require sessions to share a process or conversation context.

The packaged TypeScript service runs under launchd on macOS or systemd on Linux.
The service manager supervises the orchestrator, which supervises Pi workers. The
orchestrator starts automatically at user login on a workstation or at boot on an
unattended host, under an account with only its required privileges. Workers
launch on demand after authorization and capacity checks. Service restart
preserves durable task state and does not resume explicitly stopped work.

### Component boundaries

These are responsibility boundaries, not package names or a build plan.

| Component    | Owns                                                                                   | Boundary                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Clients      | Voice, text conversation, task inspection, and direct controls                         | Submit authenticated commands and display observations; do not schedule work or enforce execution policy |
| Orchestrator | Task ownership, message delivery, authorization, priorities, budgets, and cancellation | Accept commands, authorize dispatch, reconcile execution events, and retain durable work state           |
| Execution    | Pi SDK sessions, model turns, tools, and session events                                | Execute scoped assignments and report evidence; cannot grant authority or allocate itself capacity       |
| Persistence  | Work records, session history, and artifacts                                           | Retain distinct records for recovery and inspection; a transcript is not task completion authority       |

```mermaid
flowchart TB
    Human[Human]
    subgraph Interfaces[Human interfaces]
        Telegram[Telegram bot]
        Voice[Menu-bar voice and live transcript]
        Dashboard[Live work dashboard]
    end
    subgraph Runtime[Orchestrator]
        Manager[Manager agent]
            Engineer[Engineering agent]
            Research[Research agents]
            Reviewer[Review agent]
            Engineer -->|Request investigation| Research
            Research -->|Return findings| Engineer
            Engineer -->|Submit changes| Reviewer
            Reviewer -->|Findings or acceptance| Engineer
    end
    Human -->|Send messages| Telegram
    Human -->|Speak or correct transcript| Voice
    Telegram -->|Same conversation| Manager
    Voice -->|Same conversation| Manager
    Manager -->|Assign authorized work| Engineer
    Engineer -->|Results and questions| Manager
    Human -->|Inspect or stop work| Dashboard
    Dashboard -->|Stop selected run| Runtime
    Runtime -->|Tool activity, results, usage| Dashboard
```

All agents inside the orchestrator use Pi SDK sessions. Agent-to-agent arrows
show logical exchanges delivered by the orchestrator, which also authorizes
dispatch, schedules runs, and enforces cancellation. The manager does not have
to interpret a Stop request. The following table separates retained records from
the processes using them.

| Component           | Retained records                       | Purpose                          |
| ------------------- | -------------------------------------- | -------------------------------- |
| Orchestrator        | Assignments, ownership, and run status | Track task transitions           |
| Manager SDK session | Conversation and decisions             | Preserve context across restarts |
| Task SDK sessions   | Transcripts, diffs, and check results  | Support review and resumption    |

The manager belongs to execution: it is a session with coordination tools, not
the component that schedules work or owns authority. A direct Stop command
reaches the orchestrator without a manager turn. Work state, conversation
history, and artifacts have separate responsibilities; these records do not
require separate database products.

### Process supervision

```mermaid
flowchart TD
    OS[launchd or systemd] -->|Supervises| Coordinator[Orchestrator process]
    Coordinator -->|Supervises| ManagerHost[Manager SDK host process]
    Coordinator -->|Supervises| WorkerHosts[Task SDK host processes]
    Clients[Client processes] -->|Authenticated commands| Coordinator
```

Process boundaries isolate the orchestrator from model execution. Manager and
task hosts use the same SDK integration with separate session state. A task host
may be reused for another assignment only after releasing the previous
assignment's tools, context, and execution resources. Process supervision does
not replace task ownership or completion checks.

## Planning and execution

An idea can begin as a short message. Agents research its context, identify
missing information, and refine it into clear issues and sub-issues. Published
descriptions pass Unslop and retain the technical substance without private
conversation. Roadmap changes are proposed through a new or relevant existing PR
and checked independently before human review.

Weekly plans and daily priorities retain their original commitments and later
revisions. Reports distinguish planned, completed, carried-over, blocked, and
newly prioritized work, with evidence and missing coverage explicit. Priority
corrections reach affected agents; a completed task does not erase what was
originally planned.

Research, issue creation, assignment, execution, and publication have distinct
permissions. A conversation fragment is not an instruction to execute. Team
members act through authenticated identities and configured permissions.

One product-owner function maintains priorities across projects. Weekly
direction requires human approval before work is allocated to human or agent
capacity. Engineering assignments can include parallel research without making
research a mandatory stage for every task.

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
    subgraph Planning[Planning]
        Intake[Ideas and requests]
        Refine[Refine into actionable backlog items]
        Product[Product-owner agent proposes priorities]
        Owner[Human approves priorities]
        Assign[Allocate authorized work]
        Intake --> Refine --> Product --> Owner --> Assign
    end
    subgraph Engineering[Implementation]
        Engineer[Engineering worker implements changes]
        Research[Research workers investigate linked questions]
        Draft[Publish draft PR early]
        Engineer -->|Request parallel help when needed| Research
        Research -->|Return findings| Engineer
        Engineer --> Draft
    end
    Assign --> Engineer
```

Once implementation is ready for review, the draft PR enters the correction loop
below. The engineering assignment retains ownership while agent, automated, and
human reviewers examine the current revision.

```mermaid
flowchart TD
    Ready[Mark PR ready at first agent-review submission]
    subgraph Reviewers[Reviewers of the current revision]
        AgentReview[Review agent]
        BotReview[CodeRabbit where configured]
        HumanReview[Human PR reviewer]
    end
    Ready --> AgentReview
    Ready --> BotReview
    Ready --> HumanReview
    AgentReview -->|Findings or acceptance| Assessment{Required corrections?}
    BotReview -->|Automated review results| Assessment
    HumanReview -->|Feedback and human verdict| Assessment
    Assessment -->|Yes| Fix[Engineering worker fixes changes]
    Fix -->|Resubmit current revision| Ready
    Assessment -->|No| Gate{Current acceptance, approvals,<br/>CI, and merge permission satisfied?}
    Gate -->|Yes| Merge[Release manager merges PR]
    Gate -->|Awaiting checks or approval| Wait[Keep PR open]
    Gate -->|Conflict or integration changes| Fix
```

The first view covers planning and implementation; the second follows the PR
from its first review submission through corrections and release. Reviewers may
respond at different times; every changed revision returns to the applicable
checks. Human approval requirements follow project policy. Pausing execution
preserves assignment ownership and review history.

Disagreements use one escalation path through the manager. A worker that simply
needs clarification can ask the human through Telegram without arbitration.

```mermaid
flowchart LR
    subgraph Agents[Agents needing a decision]
        Question[Worker needs clarification]
        Dispute[Worker and auditor disagree]
        ReviewDispute[Engineer and reviewer disagree]
        Manager[Manager examines evidence]
    end
    subgraph Humans[Human decisions]
        Telegram[Human answers through Telegram]
        Final[Human resolves outstanding dispute]
    end
    Question -->|Ask directly| Telegram
    Dispute --> Manager
    Manager -->|Unresolved disagreement| Final
    ReviewDispute --> Manager
```

### Operations and urgent work

Operator tasks observe service health and report evidence. A proposed hotfix is
validated independently with fresh context before it takes priority over planned
work. If capacity is full, preemption saves the interrupted assignment and its
artifacts, starts the urgent assignment with separate context, and permits later
resumption without mixing project state.

Operator and engineering assignments have separate contexts, permissions, and
execution capacity. Watchdog incident responses bypass application-imposed
pacing. Incident priority follows the response through independent validation,
engineering, review, and authorized release; a handoff must not place it back in
the ordinary background queue. Other urgent work receives reduced or no pacing
according to its priority. Ordinary work slows or pauses to compensate for the
capacity consumed. Urgency changes scheduling, not authority or acceptance
criteria, and provider-enforced limits still apply.

```mermaid
sequenceDiagram
    participant C as Orchestrator
    box Agent sessions
        participant O as Watchdog agent
        participant V as Independent validation agent
        participant E as Engineering agent
        participant R as Review agent
        participant L as Release-management agent
    end
    actor H as Human PR reviewer
    O->>C: Incident evidence
    Note over C,R: Incident priority applies throughout the response
    C->>C: Reserve capacity and reduce ordinary work
    C->>V: Independent validation
    V-->>C: Validated hotfix need
    C->>E: Urgent engineering assignment
    E->>R: Submit current revision
    loop Until required findings are addressed
        R-->>E: Findings
        H-->>E: Human feedback
        E->>R: Corrected revision
    end
    R->>L: Current revision accepted
    H->>L: Required human approval
    Note over L: Release only with required checks and authority
```

This sequence shows a validated incident requiring a hotfix. A rejected
diagnosis does not enter engineering. Human review follows project policy;
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
delegation cannot multiply a task's budget. Missing or delayed usage information
reduces admissions conservatively rather than implying unlimited capacity.

Background work is paced across the remaining reset window so later priorities
retain capacity. The manager uses low reasoning effort and receives no
application-imposed pacing delays. Background admission must not hold up its
turns; analysis requiring more reasoning is delegated to workers. Manager usage
still counts against the shared allowance, and provider-enforced limits remain
visible. Background budgets protect interactive headroom rather than treating
manager consumption as free or unlimited.

Task configurations select model capability and reasoning effort to match the
work. Configurable tiers distinguish high-capability analysis, balanced work,
and fast economical tasks without prescribing model names. Tier assignments
require task-relevant quality checks; a cheaper model is suitable only when its
results meet the task's acceptance criteria. The manager's low-reasoning policy
does not constrain the reasoning effort of its delegated workers.

## Product boundaries

The system has one authoritative state across its tools. A proposed, assigned,
running, blocked, reviewed, or completed item is distinguished explicitly;
acknowledgement is not completion. A display name or model is not an identity or
authority.

The hierarchy is:

[SPEC.md](./SPEC.md) and [ROADMAP.md](./ROADMAP.md) -> GitHub issues -> bounded
execution tasks -> verified changes

The CLI supports Markdown parsing, task selection, work sessions, recording,
playback, and trace export. Telegram uses Piece of Pi; the observational
dashboard uses SolidJS and Dockview.

The system supports a single-machine deployment. Durable agent, work, and
message identities must not depend on process IDs, terminal panes, or local
filesystem paths. Host-local workspace locations remain explicit mappings.
Versioned messages and scoped authority preserve compatibility with remote
workers and other orchestrators without requiring distributed deployment.

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
replace the original authorization evidence. Task runs receive relevant project
context and retain their transcripts and artifacts for review or resumption.
They do not require a general personal memory shared across unrelated tasks. The
memory and client packages must satisfy these contracts.

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

## Protocol and durable state

The Pi bridge and SQLite state use versioned contracts for identity, delivery
capability, claim lifecycle, question binding, and restart recovery. Pure
decoding is separate from transport and store effects.

Persisted and external values are validated. Unknown versions, malformed
identities, and invalid transitions cannot gain permissions through fallback
behavior. State formats define compatibility and recovery rules. Private state
is excluded from distributable packages and public artifacts.

## Dashboard contract

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
retains the task's evidence and records the changed instructions. Human controls
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

Nix provides reproducible packages; Bun manages workspace dependencies. The
pinned `dataclique/but.nix` package supplies GitButler in the main worktree;
linked worktrees use plain Git. Manifests and lockfiles record exact versions.

Portable packages are independent of a home directory, launcher, and private
configuration. Machine activation is separate. Skills and scripts may use shared
code, while deterministic validation and delivery remain in tested code. Source
provenance, licenses, and tracker history are preserved.

## Shared hosting

The target is one shared instance for Metagenda, Moneymentum, and Yielduck.
[dataclique/infra](https://github.com/dataclique/infra) owns its provisioning
and activation. Metagenda owns portable packages and its service, state, and
identity contracts.

Service activation and changes to live state or routing require operator
authorization. Authorizing service enablement permits subsequent automatic
starts and supervised restarts under the same configuration until that
authorization is revoked. Restarting the orchestrator grants no new task
authority and does not resume explicitly stopped work. Services expose their
revision, health, and recovery state.

Product isolation must hold for privileges, state paths, credentials, and
routing between Metagenda and the other products. A shared host does not imply
employee control, tenant boundaries, or cross-machine claims. Those require an
explicit design.

## Safety and lifecycle

Delegated owner instructions retain cryptographically verifiable origin,
content, and scope. An agent's interpretation or paraphrase is separate evidence
and cannot acquire owner authority by being forwarded. Verification must reject
tampering, replay outside the permitted scope, and expired or revoked authority.

Every tool call passes the authorization classifier. Independent audits may
challenge task interpretation, scope, or claimed completion using the original
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
