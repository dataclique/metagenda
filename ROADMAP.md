# Metagenda Roadmap

Metagenda automates planning, coordination, and improvement across projects. The
roadmap connects idea refinement and priorities with execution, reviews,
retrospectives, and resource allocation. The Pi harness and shared extensions
support these workflows; Telegram provides a conversational interface.
[SPEC.md](./SPEC.md) defines target behavior; GitHub issues hold acceptance
criteria and implementation work.

## Turn ideas into coordinated work

Develop ideas into researched, tracked work, then coordinate implementation and
independent verification. Telegram intake is one entry point; a conversation
fragment alone does not authorize execution.

- [ ] Provide one manager conversation across clients and coordinate shared
      worker capacity —
      [#33](https://github.com/dataclique/metagenda/issues/33).
- [ ] Retain engineering ownership through review, corrections, and verified
      delivery — [#32](https://github.com/dataclique/metagenda/issues/32),
      [#34](https://github.com/dataclique/metagenda/issues/34).
- [ ] Expose live execution evidence and direct stop controls with explicit
      cancellation and recovery outcomes —
      [#16](https://github.com/dataclique/metagenda/issues/16).
- [ ] Preserve delegated instruction authority and resolve worker-auditor
      disputes without widening permissions —
      [#39](https://github.com/dataclique/metagenda/issues/39),
      [#35](https://github.com/dataclique/metagenda/issues/35).

- [ ] Connect harness execution, cancellation, bounded concurrency, and recovery
      to planned work —
      [#16](https://github.com/dataclique/metagenda/issues/16).

- [ ] Connect idea intake, research, refinement, and issue creation to durable
      cross-project planning —
      [#15](https://github.com/dataclique/metagenda/issues/15).
- [ ] Keep issues and sub-issues linked to the project roadmap; update roadmap
      PRs when priorities or scope change —
      [#15](https://github.com/dataclique/metagenda/issues/15).
- [ ] Apply Unslop to published prose and independently check that research,
      requirements, and priority changes retain their meaning —
      [#15](https://github.com/dataclique/metagenda/issues/15).
- [ ] Keep unreconciled conversation separate from actionable work —
      [#13](https://github.com/dataclique/metagenda/issues/13).

## Keep plans and agent work aligned

Make weekly commitments, daily priorities, progress, and corrections visible
across projects. Agents work from the current plan, while saved revisions make
planned-versus-actual reporting possible.

- [ ] Preserve plans, revisions, reporting windows, and acknowledged corrections
      across restarts —
      [#15](https://github.com/dataclique/metagenda/issues/15).
- [ ] Produce evidence-backed daily and weekly views, with missing information
      explicit — [#15](https://github.com/dataclique/metagenda/issues/15),
      [#17](https://github.com/dataclique/metagenda/issues/17).
- [ ] Deliver work to the intended capable agent and distinguish receipt from
      completion — [#18](https://github.com/dataclique/metagenda/issues/18).
- [ ] Preserve paused roles and live-agent discovery without resuming paused
      work — [#9](https://github.com/dataclique/metagenda/issues/9),
      [#20](https://github.com/dataclique/metagenda/issues/20).

## Allocate capacity without making Pi unresponsive

Set adjustable engineering-resource allocations by project. Track actual
consumption against those targets and adapt background work to provider limits
while preserving responsive interactive use. Project priorities and provider
throttling are separate controls.

- [ ] Extend allocation planning with measured consumption and visible
      deviations from project targets —
      [#15](https://github.com/dataclique/metagenda/issues/15).
- [ ] Adapt background work to remaining usage, reset windows, queued
      priorities, and interactive demand —
      [#24](https://github.com/dataclique/metagenda/issues/24).
- [ ] Preserve execution permissions, cancellation, bounded concurrency, and
      reserved capacity —
      [#16](https://github.com/dataclique/metagenda/issues/16).

## Run the shared service reliably

Deliver portable Telegram, CLI, and observational dashboard capabilities on the
instance shared with Moneymentum and Yielduck.
[Infra](https://github.com/dataclique/infra) owns host provisioning and
activation.

- [ ] Complete package and service export contracts, identity and state
      boundaries, restart recovery, and receiving verification —
      [#22](https://github.com/dataclique/metagenda/issues/22).
- [ ] Finish the portable CLI contract and account for existing consumers —
      [#6](https://github.com/dataclique/metagenda/issues/6).
- [ ] Verify dashboard and Telegram exports before host consumption; retain the
      detailed compatibility gates in the
      [import manifest](./docs/migrations/dotconfig-intake.md) and
      [#22](https://github.com/dataclique/metagenda/issues/22).
- [ ] Prepare host wiring without activation; verify product isolation, then
      perform an explicitly authorized cutover with rollback —
      [infra #6](https://github.com/dataclique/infra/issues/6),
      [#22](https://github.com/dataclique/metagenda/issues/22).

Portable packaging can progress alongside planning. Deployment depends on
verified exports; product refinement does not depend on completing every
migration task. Source provenance belongs in implementation records, not the
product's purpose.

## Improve shared development tools

- [ ] Finish shared tooling correctness and diagnostics —
      [#10](https://github.com/dataclique/metagenda/issues/10),
      [#11](https://github.com/dataclique/metagenda/issues/11),
      [#12](https://github.com/dataclique/metagenda/issues/12).
- [ ] Improve image presentation and TSX highlighting —
      [#14](https://github.com/dataclique/metagenda/issues/14),
      [#19](https://github.com/dataclique/metagenda/issues/19).

Repository preparation and import history remain in
[#3](https://github.com/dataclique/metagenda/issues/3). They do not define the
product roadmap.
