# Metagenda Specification

This document defines the product direction and contracts.
[ROADMAP.md](./ROADMAP.md) orders delivery; [AGENTS.md](./AGENTS.md) defines the
engineering workflow; [README.md](./README.md) describes the current packages
and commands.

The first portable `fj` slice is extracted locally under the contract below;
receiving verification and delivery are separate gates. Other shared-tooling
sections describe targets, not deployment or multi-user access.

## 1. Purpose

Metagenda helps humans and AI agents collaborate across projects. It connects
planning, notes, task management, prioritization, and orchestration with target
allocations for time and resources. Agent integration is central to the product,
not an add-on to a manual note-taking application.

Humans and agents should use the same first-party tools and state. The shared
`fj` CLI, dashboard, Telegram capabilities, and selected skills and scripts will
come from [dotconfig](https://github.com/0xgleb/dotconfig). Reuse reviewed
implementations rather than rebuild capabilities already present there.

The existing task-planning CLI remains supported during the transition. Shared
capabilities must work without importing personal workstation configuration,
private runtime state, or the entire agent harness deployment.

## 2. Current system and explicit exclusions

| Area                                | Current scope                                                                          | Direction                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| CLI                                 | Markdown task parsing, task selection, work sessions, recording/playback, trace export | Preserve behavior while repairing the tooling baseline                                            |
| Legacy bot                          | Inactive source in `bot/`, retained to preserve existing work                          | Superseded by dotconfig Telegram; excluded from active workspaces, builds, and tests              |
| React web prototype                 | Removed from the active workspace                                                      | Do not restore it or port the obsolete CSV prototype                                              |
| Browser extension shell             | Removed                                                                                | No replacement extension is in scope                                                              |
| Shared dashboard                    | Not imported                                                                           | Extract the applicable existing SolidJS dashboard, not a new React application                    |
| Shared Telegram service             | Not imported                                                                           | Extract applicable Piece of Pi capabilities behind explicit configuration and protocol boundaries |
| Shared skills, scripts, Nix tooling | Candidate migration scope                                                              | Select by team use and dependency closure, not by directory size                                  |

CLI recording and playback are independent of the removed browser player.
Removing the latter must not silently remove the former.

This specification does not select a new database framework, rewrite the CLI in
Rust, prescribe a distributed scheduler, grant employee AI control, or authorize
a production deployment. Research into orchestration and swarms remains research
until an explicit design decision adopts a specific part.

## 3. Operating workflow

The work hierarchy is:

```text
SPEC and ROADMAP -> GitHub issues -> bounded execution tasks -> verified changes
```

Repository and task views must preserve the distinction between work that is
proposed, assigned, running, blocked, reviewed, and completed. A transport
acknowledgment is not completion evidence. An agent's display name or model is
not its identity or its authority.

The CLI remains a local interface for inspecting tasks and running the existing
work-session workflow. Future shared interfaces consume the relevant project and
execution state; they do not create an untracked competing backlog.

## 4. Capability boundaries

These boundaries guide extraction; they do not commit to a directory layout or
new protocol schema. Before choosing a package shape, each import must establish
the exact source revision and compatibility contract.

### CLI and local work sessions

Keep task parsing, planning, configuration, external command execution, and
recording lifetimes distinguishable. Retain the existing commands unless a
reviewed migration explicitly changes their contract.

Tests must use repository fixtures rather than personal configuration or a live
vault. Existing code that relies on test-process detection is a legacy
constraint to isolate, not a pattern for new integrations.

### Shared CLI and agent integration

`fj` is selected for migration into Metagenda. Its receiving interfaces should
serve both humans and agents working across projects: planning, notes, task
management, priorities, orchestration, and target time/resource allocations.
This selects the capability, not a final command layout or permission to import
before the source gates pass.

Prefer existing first-party commands for maintaining plans, notes, and tasks
rather than rebuilding those workflows with ad-hoc commands. Identify missing
interfaces from observed agent operations, then inspect the existing source
before adding an API. Preserve one authoritative state model across CLI,
dashboard, Telegram, and agent tools; expose explicit project scope, identity,
and delivery outcomes.

`fj clanker search` is a proposed interface, not an approved API. Any search
interface must have credential-safe scope and exclusions by default. It cannot
bypass execution policy or broaden access to personal state.

### First portable fj slice

The additive `packages.<system>.fj` and `apps.<system>.fj` preserve the existing
default CLI. `bin/fj` and `share/nushell/fj/mod.nu` expose default repository
status, help, and issue/PR list/view. List flags and view comments/browser modes
preserve gh behavior and caller context. No generic mutation passthrough,
host/session helpers, service or state export is included.

The four selected pure routing helpers preserve private translation tables;
routing data does not authorize execution. Default status invokes But only in
verified main-worktree topology with the source's branch-name heuristic.
Linked/unmanaged worktrees use Git; failed topology or selected But must not
silently become successful fallback results. Receiving JSON validation and Nu
compatibility adaptations are documented in the intake manifest.

### Protocol and durable state

The current extraction candidates use a versioned Pi bridge protocol and SQLite
storage. Their identities, delivery capabilities, claim lifecycle, question
bindings, and restart behavior are compatibility obligations, not incidental
implementation details.

Separate pure domain decoding from transport and storage effects. Validate
persisted and external values before they enter the domain. Unknown protocol
versions, malformed identities, and invalid transitions must not acquire
permissions through fallback values.

Do not assume copying a database or resetting a schema is a migration. A state
migration needs an explicit format, compatibility checks, backup and rollback
steps, and operator authorization. Routine code extraction copies no live
messages, credentials, questions, or personal state.

### Dashboard

The candidate dashboard is SolidJS with Dockview. Its current read surface
covers health, agents, jobs, backlog, and usage. It imports control-plane domain
code and build tooling; it is not a standalone frontend ready for a blind copy.

The first extracted surface remains observational. UI layout persistence is
separate from authoritative task and execution state. The browser may display
capabilities and status; it must not infer permission to enqueue work or bypass
server-side authorization.

Any later mutation surface requires a separately specified command contract,
authentication, authorization, failure model, and tests.

### Telegram transport

Dotconfig's Telegram capabilities fully supersede the legacy grammY subprocess
bot. The receiving implementation will use selected Piece of Pi functionality;
maintaining the legacy bot is not part of the migration.

Separate message decoding, authenticated identity, session routing, question
correlation, durable delivery, and presentation. Supply configuration and
runtime state locations explicitly. Exclude personal-only features unless they
are independently selected for shared use.

Replies must remain bound to the intended conversation, session, and request.
Stale selections must not silently retarget another agent. Duplicate updates,
retries, restarts, expiry, and cancellation need explicit outcomes. Team-visible
messages must not mirror private owner or agent traffic.

### Packaging and workstation integration

Nix supplies the toolchain and reproducible packages; Bun manages the JavaScript
workspace. The main checkout uses GitButler from the shared `dataclique/but.nix`
input; linked worktrees use plain Git. Exact versions live in manifests and
generated locks, not in this specification.

Shared packages must not depend on a particular user's home directory,
workstation launcher, or private configuration. Keep portable code and Nix
package definitions separate from machine-specific activation and hosting.

Skills and scripts may depend on shared capabilities, but deterministic
validation and delivery belong in tested code. Extract `fj` with its verified
dependency closure; separate portable commands from workstation activation and
personal integrations.

## 5. Safety and lifecycle contracts

These contracts apply to new shared capabilities and changes at the relevant
legacy boundaries. They do not claim that every old code path already meets
them.

1. **Authority stays explicit.** Role ownership, a queued message, a dashboard
   view, or imported documentation cannot authorize an external effect.
2. **Private state stays private.** Shared artifacts contain no credentials,
   private correspondence, personal goals, or workstation-specific state.
3. **State transitions are accountable.** Each durable claim or delivery has a
   stable identity and a defined terminal, retry, expiry, or cancellation path.
4. **Failures are typed.** Invalid state fails at the owning boundary without a
   panic, silent coercion, or plausible-looking invented result.
5. **Resources have bounded lifetimes.** Terminal listeners, subprocesses,
   workers, temporary files, and claims must be released or explicitly retained
   for recovery on success, failure, and cancellation.
6. **Read models do not become authorities.** UI state and observations cannot
   overwrite execution truth or bypass policy.
7. **Retirement preserves recoverability.** Checkpoint valuable legacy work and
   identify consumers before removing packages or switching a runtime.
8. **Publication carries provenance.** Preserve source revisions, licenses,
   tracker history, dependency relationships, and accurate verification status.

## 6. Migration gates

Preparation, code extraction, and runtime cutover are different operations.

Before extraction:

- The nominated dotconfig baseline has completed its required review loop,
  passed checks, and merged to its source branch as required by the migration
  agreement.
- The receiving package boundaries, source revision, dependency closure,
  private-material exclusions, and compatibility tests are documented.
- The receiving baseline is coherent and the preserved legacy work is safe.

Before runtime cutover:

- Receiving packages pass the relevant type, lint, test, and Nix build gates.
- Any state migration has explicit recovery and rollback procedures.
- The operator authorizes the actual switch and verifies the live result.
- Only then are old launchers or consumers retired. A source commit alone is not
  evidence that the old runtime is no longer in use.

## 7. Acceptance criteria

A capability is complete only when its claimed contract is demonstrated:

- A clean dependency installation resolves the intended versions without
  unresolved required-peer conflicts; Bun and Nix metadata describe the same
  active workspaces.
- Typechecks, lint, tests, and affected Nix builds pass for the current change.
  Cached test copies, placeholders, or an earlier build do not satisfy a gate.
- CLI behavior and recording/playback remain covered during modernization.
- Imported boundaries have realistic contract tests for valid, malformed,
  duplicate, stale, interrupted, and recovered inputs as applicable.
- Tests do not touch personal configuration, credentials, or live services.
- Documentation and tracker links distinguish merged code from planned work and
  live adoption. No migration stage is declared complete by inference.

## 8. Decisions reserved for later work

Remote hosting, multi-user identity and tenancy, employee write access,
cross-machine claims, shared planning views, and infrastructure separation need
explicit designs before implementation. They are not implied by a successful
local extraction. Personal planning and unrelated dotconfig services are not
part of the initial migration.
