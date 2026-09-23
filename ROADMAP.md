# Metagenda Roadmap

Metagenda automates planning, coordination, and improvement across projects. The
roadmap connects idea refinement and priorities with execution, reviews,
retrospectives, and resource allocation. The Pi harness and shared extensions
support these workflows; Telegram provides a conversational interface.
[SPEC.md](./SPEC.md) defines target behavior; GitHub issues hold acceptance
criteria and implementation work.

## Delegate work through observable jobs

Keep interactive coordination responsive while workers execute bounded jobs.
Replace workflow execution first, preserve visibility throughout the transition,
and adopt background SDK hosting only after fleet inspection and controls work.
The proposed decision is recorded in
[ADR 01](./adrs/01-observable-job-pools.md).

- [ ] Agree the job and session event contract: prompts, invocation metadata,
      allowed tools, budgets, outputs, identity, and lifecycle -
      [#32](https://github.com/dataclique/metagenda/issues/32).
- [ ] Replace workflow execution with an interactive instance's worker pool; the
      coordinating agent decides subsequent jobs -
      [#32](https://github.com/dataclique/metagenda/issues/32).
- [ ] Enforce job budgets, concurrency, cancellation, and recovery -
      [#24](https://github.com/dataclique/metagenda/issues/24),
      [#16](https://github.com/dataclique/metagenda/issues/16).
- [ ] Stop workers and all session-owned background resources when the initial
      interactive session closes; retain job records and outputs -
      [#32](https://github.com/dataclique/metagenda/issues/32).
- [ ] Configure manager and worker launch modes, reject competing manager
      launches, and enable general persistent memory only for the manager -
      [#33](https://github.com/dataclique/metagenda/issues/33),
      [#20](https://github.com/dataclique/metagenda/issues/20).
- [ ] Remove direct code-changing tools from the interactive coordinator once
      worker execution is usable; retain code reading and job controls -
      [#33](https://github.com/dataclique/metagenda/issues/33).
- [ ] Expose fleet sessions, jobs, tool activity, outputs, usage, failures,
      cancellation, and reconnect evidence in the dashboard -
      [#34](https://github.com/dataclique/metagenda/issues/34).
- [ ] Implement the specification's panel catalog, including planning, agent
      tasks and replies, question answering, PR review readiness, and editable
      resource allocations -
      [#34](https://github.com/dataclique/metagenda/issues/34),
      [#24](https://github.com/dataclique/metagenda/issues/24).
- [ ] Route worker urgency proposals to manager judgment and apply authenticated
      human urgency decisions directly, retaining reasons and outcomes -
      [#33](https://github.com/dataclique/metagenda/issues/33).
- [ ] Adopt supervised SDK hosting after dashboard inspection and direct
      controls replace terminal visibility; no intermediate RPC migration is
      required - [#33](https://github.com/dataclique/metagenda/issues/33),
      [#22](https://github.com/dataclique/metagenda/issues/22).

```mermaid
flowchart TD
    Contract[Job and session event contract]
    Pool[Worker pool and bounded execution]
    Dashboard[Fleet inspection and direct controls]
    Modes[Manager and worker capabilities and memory]
    Delegate[Coordinator delegates code changes]
    SDK[Supervised SDK service]
    Contract --> Pool
    Contract --> Dashboard
    Contract --> Modes
    Pool --> Delegate
    Modes --> Delegate
    Pool --> SDK
    Dashboard --> SDK
    Delegate --> SDK
```

Pool implementation, dashboard rendering, and manager capability configuration
can proceed in parallel after agreement on their shared contract. Keep workers
visible until dashboard inspection and controls are verified. Once the service
owns execution, closing an interactive interface does not stop its jobs. Future
persistence work can integrate
[Event Sorcery](https://github.com/dataclique/event-sorcery), a Rust library for
event sourcing and durable job dispatch, through its planned TypeScript
bindings. That integration would cover job and coordination state transitions;
transcripts retain their separate storage. The initial pool uses existing
persistence contracts.

## Turn ideas into coordinated work

Develop ideas into researched, tracked work, then coordinate implementation and
independent verification. Telegram intake is one entry point; a conversation
fragment alone does not authorize execution.

- [ ] Connect harness execution, cancellation, bounded concurrency, and recovery
      to planned work -
      [#16](https://github.com/dataclique/metagenda/issues/16).
- [ ] Connect idea intake, research, refinement, and issue creation to durable
      cross-project planning -
      [#15](https://github.com/dataclique/metagenda/issues/15).
- [ ] Keep issues and sub-issues linked to the project roadmap; update roadmap
      PRs when priorities or scope change -
      [#15](https://github.com/dataclique/metagenda/issues/15).
- [ ] Apply Unslop to published prose and independently check that research,
      requirements, and priority changes retain their meaning -
      [#15](https://github.com/dataclique/metagenda/issues/15).
- [ ] Keep unreconciled conversation separate from actionable work -
      [#13](https://github.com/dataclique/metagenda/issues/13).

The canonical-backlog prerequisite for #15 is published in
[draft PR #25](https://github.com/dataclique/metagenda/pull/25). Its `0de61d4`
head passed local type/lint checks, Effect behavior and source-worker tests,
emitted declarations and isolated consumer checks using the fixed dependency
closure, Apple Silicon Nix/default CLI builds, targeted source/packaging
reviews, and six native CI jobs including four-platform package/receiving
verification and both Linux default-package builds. The two production modules
and their source tests retain MIT provenance and existing API semantics from
[dotconfig PR #82](https://github.com/0xgleb/dotconfig/pull/82), revision
`31a31a2218d9fef19f401c8d5ee86250b42cb867`. No live consumer was switched. After
rebasing onto master `1371ce9`, `bun run verify` passed at local branch revision
`e3d7a3c`, before the subsequent documentation-only edits. Revised head
`963a8a0` is published in that draft and passed all six native CI jobs. Those
results do not verify later uncommitted Pi integration work. This does not
complete planning or the shared Pi harness.
[Package provenance](./packages/work-core/PROVENANCE.md) records the source
revision, MIT notice, adaptations, and verification boundaries.

## Keep plans and agent work aligned

Make weekly commitments, daily priorities, progress, and corrections visible
across projects. Agents work from the current plan, while saved revisions make
planned-versus-actual reporting possible.

- [ ] Preserve plans, revisions, reporting windows, and acknowledged corrections
      across restarts -
      [#15](https://github.com/dataclique/metagenda/issues/15).
- [ ] Produce evidence-backed daily and weekly views, with missing information
      explicit - [#15](https://github.com/dataclique/metagenda/issues/15),
      [#17](https://github.com/dataclique/metagenda/issues/17).
- [ ] Deliver work to the intended capable agent and distinguish receipt from
      completion - [#18](https://github.com/dataclique/metagenda/issues/18).
- [ ] Preserve paused roles and live-agent discovery without resuming paused
      work - [#9](https://github.com/dataclique/metagenda/issues/9),
      [#20](https://github.com/dataclique/metagenda/issues/20).

## Allocate capacity without making Pi unresponsive

Set adjustable engineering-resource allocations by project. Track actual
consumption against those targets and adapt background work to provider limits
while preserving responsive interactive use. Project priorities and provider
throttling are separate controls.

- [ ] Extend allocation planning with measured consumption and visible
      deviations from project targets -
      [#15](https://github.com/dataclique/metagenda/issues/15).
- [ ] Adapt background work to remaining usage, reset windows, queued
      priorities, and interactive demand -
      [#24](https://github.com/dataclique/metagenda/issues/24).
- [ ] Preserve execution permissions, cancellation, bounded concurrency, and
      reserved capacity -
      [#16](https://github.com/dataclique/metagenda/issues/16).

## Run the shared service reliably

Deliver portable Telegram, CLI, and observational dashboard capabilities with
verified service contracts and recovery behavior.

- [ ] Complete package and service export contracts, identity and state
      boundaries, restart recovery, and receiving verification -
      [#22](https://github.com/dataclique/metagenda/issues/22).
- [ ] Finish the portable CLI contract and account for existing consumers -
      [#6](https://github.com/dataclique/metagenda/issues/6).
- [ ] Verify dashboard and Telegram exports before host consumption; retain the
      detailed compatibility gates in the
      [import manifest](./docs/migrations/dotconfig-intake.md) and
      [#22](https://github.com/dataclique/metagenda/issues/22).
- [ ] Prepare host wiring without activation; verify product isolation, then
      perform an explicitly authorized cutover with rollback -
      [#22](https://github.com/dataclique/metagenda/issues/22).

Portable packaging can progress alongside planning. Deployment depends on
verified exports; product refinement does not depend on completing every
migration task. Source provenance belongs in implementation records, not the
product's purpose.

The first portable `fj` slice landed in
[PR #7](https://github.com/dataclique/metagenda/pull/7) at `919209d`, with
four-platform receiving verification. Broader harness and service exports remain
separate work; neither `fj` nor the backlog package supplies a complete runtime.

The additive `packages.<system>.pi-skills` output packages all 46 public skill
documents and five support files, with pinned source hashes and preserved MIT
attribution. [PR #46](https://github.com/dataclique/metagenda/pull/46) proposes
this package. At `76f8b4043da97e1100c23bc38336b16ac3629770`,
[four-platform native CI](https://github.com/dataclique/metagenda/actions/runs/35763232021)
and
[both Linux default-package jobs](https://github.com/dataclique/metagenda/actions/runs/35763232220)
passed. CodeRabbit review and gated landing remain pending.
[The skills provenance record](./pi/SKILLS-PROVENANCE.md) documents the source,
package layout, and host-specific instruction assumptions. No extensions or
services are activated. Full shared Pi runtime integration remains unfinished,
so this package does not authorize retiring the temporary Dotconfig runtime.

## Improve shared development tools

- [ ] Finish shared tooling correctness and diagnostics -
      [#10](https://github.com/dataclique/metagenda/issues/10),
      [#11](https://github.com/dataclique/metagenda/issues/11),
      [#12](https://github.com/dataclique/metagenda/issues/12).
- [ ] Improve image presentation and TSX highlighting -
      [#14](https://github.com/dataclique/metagenda/issues/14),
      [#19](https://github.com/dataclique/metagenda/issues/19).

Repository preparation and import history remain in
[#3](https://github.com/dataclique/metagenda/issues/3), including
[merged baseline PR #4](https://github.com/dataclique/metagenda/pull/4) and
[superseded, closed PR #1](https://github.com/dataclique/metagenda/pull/1). They
do not define the product roadmap.
