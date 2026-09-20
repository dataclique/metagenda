# Metagenda Specification

Metagenda is the shared agent system for work across projects. It owns the
custom Pi harness, locally owned extensions, and the agent pipeline from
research and planning through implementation, independent verification, and
progress reporting. Telegram provides a conversational interface; GitHub holds
the project backlog and reviewable changes.

## Harness and agent pipeline

The harness coordinates agent sessions, available tools, bounded work, review,
and recovery. Shared Pi extensions provide reusable capabilities across
projects. Durable delivery, canonical backlog reconciliation, role ownership,
and usage accounting support the pipeline without creating competing sources of
truth.

Execution remains bound to project scope and authenticated permissions. Routing,
registration, planning, and usage allocations do not grant new authority.
Upstream extensions remain pinned packages; locally owned source and personal
configuration retain their documented ownership boundaries.

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

## Resource allocation

Project allocations are adjustable targets for engineering effort. Measured
consumption and deviations are visible across projects; no project has a fixed
percentage prescribed by the product.

Dynamic throttling adapts background work to remaining provider usage, reset
windows, queued priorities, and interactive demand. Interactive planning and
steering remain responsive. Allocation targets do not guarantee capacity, and
unavailable usage data or exhausted limits remain explicit. Throttling preserves
pause, cancellation, execution permissions, and concurrency limits.

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

No Rust CLI rewrite, new database, or distributed scheduler is selected by this
specification.

## CLI contract

Parsing, planning, configuration, commands, recording, and lifetimes remain
separate. Fixtures are isolated and do not use a personal vault or live
services. Existing commands remain unless a reviewed migration removes them.

The portable `fj` contract includes the distinct Nix exports
`packages.<system>.fj` and `apps.<system>.fj`, plus `bin/fj` and
`share/nushell/fj/mod.nu`. The existing default CLI remains unchanged. `fj`
provides default repository status, `help`, `issue list/view`, and
`pr list/view`, preserving gh argument and caller-working-directory semantics.
Completion suggests one argument at a time: `help`, `issue`, or `pr`, then
`list` or `view` for tracker commands.

The initial CLI slice has no generic mutation passthrough, host, session,
service, or state authority. Four pure routing helpers retain private
translation tables and do not gain execution authority.

Default status uses But only for verified main-worktree topology and
source-branch heuristics. Linked or unmanaged worktrees use Git. Topology
failures and selected But failures cannot fall back to a successful result.

Nushell compatibility and intake details are documented in the
[import manifest](./docs/migrations/dotconfig-intake.md#downstream-consumer-dotconfig-nix-darwin).
`fj clanker search` is proposal-only and must retain credential-safe exclusions
and policy boundaries. Missing API behavior must be grounded in observed work
and source.

## Protocol and durable state

The Pi bridge and SQLite state use versioned contracts for identity, delivery
capability, claim lifecycle, question binding, and restart recovery. Pure
decoding is separate from transport and store effects.

Persisted and external values are validated. Unknown versions, malformed
identities, and invalid transitions cannot gain permissions through fallback
behavior. Migration records the format, compatibility rules, backup, rollback,
and operator authorization. Extraction does not copy live messages, credentials,
questions, or private state.

## Dashboard contract

The dashboard observes health, agents, jobs, backlog, and usage through a typed
server boundary. Malformed or unavailable data is represented explicitly. Layout
is not authoritative state.

Any dashboard mutation requires a separate command, authentication and
authorization contract, failure behavior, and tests. Personal features remain
outside the product unless a selected use case adds them.

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

Infra preparation is non-activating: it does not start services, move live
state, or change live routing. A runtime switch and state migration require
operator authorization. The cutover retains package, type, lint, test, Nix, and
rollback checks, then verifies the live revision, routing, and recovery before
retiring old consumers.

Product isolation must hold for privileges, state paths, credentials, and
routing between Metagenda and the other products. A shared host does not imply
employee control, tenant boundaries, or cross-machine claims. Those require an
explicit design.

## Migration contract

Reusable locally owned code retains source provenance and licenses in the
[import manifest](./docs/migrations/dotconfig-intake.md). Upstream Pi extensions
are consumed as pinned packages, never copied or vendored. Personal voice,
browser, host configuration, and private runtime data are outside shared-package
imports. This contract does not authorize redesigning personal integrations.

Before extraction, the source baseline is reviewed, checked, and merged. The
migration records the source revision, dependency closure, private exclusions,
and compatibility tests. The receiving baseline must be coherent and retain
legacy recovery.

The installed CLI export is checked against the exact package and file contract
above. Before extracting dashboard capability, record its receiving package
boundary, named Nix build artifact, server interface, and supported Linux
platforms in the import manifest; then verify installed observational and
layout-state compatibility before Infra consumes it.

Before extracting Telegram capability, record its receiving package boundary,
named Nix artifact, entrypoint, configuration and state interface, and supported
Linux platforms in the import manifest. Verify installed protocol, identity,
durable-delivery, and restart compatibility before Infra consumes it. Artifact
names are selected by the migration manifest; this specification does not invent
them.

Extraction tests cover valid, malformed, duplicate, stale, interrupted, and
recovered cases without using live configuration.

## Safety and lifecycle

Authority, privacy, stable durable identity, and terminal, retry, expiry, and
cancellation states are explicit. Typed boundaries fail safely without panics,
coercion, or invented results.

Listener, process, worker, temporary-file, and claim lifetimes are bounded.
Recovery is verified before retirement. Observations never become policy or
state authority.
