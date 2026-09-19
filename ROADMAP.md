# Metagenda Roadmap

Move reviewed dotconfig capabilities into Metagenda so humans and AI agents can
plan, record notes, manage tasks, prioritize, and orchestrate work across
projects against target time/resource allocations. [SPEC.md](./SPEC.md) defines
the contracts; [AGENTS.md](./AGENTS.md) defines how changes are made and
verified.

Themes are ordered by dependency and priority, not by estimated dates. Work that
does not depend on a blocked gate may proceed independently. Checkboxes
represent delivery gates, not the presence of a draft or a passing command in an
older checkout.

**Owner direction reaffirmed 2026-09-19:** the deployment destination is one
instance shared with Moneymentum and Yielduck, with infrastructure owned by
[dataclique/infra](https://github.com/dataclique/infra). This is a delivery
target, not speculative expansion. Metagenda still owns its portable packages,
state and identity contracts, and receiving verification. Reviewed source gates
remain prerequisites for the capabilities being moved; runtime cutover and
employee control retain their existing authorization boundaries.

Tracking: [#22](https://github.com/dataclique/metagenda/issues/22) and
[infra #6](https://github.com/dataclique/infra/issues/6).

Use GitHub issues for actionable work and link the corresponding PRs here. Do
not invent issue IDs. Migration intake must preserve source links, status, and
dependencies rather than silently replacing existing tracker history.

## Establish the receiving baseline

**Tracking:** [Issue #3](https://github.com/dataclique/metagenda/issues/3),
[merged PR #4](https://github.com/dataclique/metagenda/pull/4).

**Goal:** A reproducible, documented repository that does not carry the obsolete
web stack into the migration.

- [x] Land canonical `AGENTS.md`, `SPEC.md`, and `ROADMAP.md`, with an accurate
      README and no competing status narrative.
- [x] Complete removal of the React prototype, browser shell, orphan configs,
      and npm lock; retain CLI recording and playback.
- [x] Align applicable dependencies, Node declarations, Bun, and Nix inputs with
      the current team stack and verified peer contracts.
- [x] Pin GitButler through `dataclique/but.nix`, verify the development-shell
      package, and manage the main checkout with `but` while retaining existing
      branches and uncommitted work.
- [x] Regenerate and reconcile `bun.lock` and `bun.nix`; verify a clean install,
      workspace typechecks, lint, tests, and the affected Nix derivations.
- [x] Keep test discovery limited to repository tests, and isolate all tests
      from personal configuration and live services.
- [x] Land removal of the superseded bot from active workspaces, builds, tests,
      and Nix outputs while preserving the existing legacy work.
- [ ] Reconcile the older
      [cleanup PR #1](https://github.com/dataclique/metagenda/pull/1) and
      current upstream changes rather than merging or duplicating stale scope.

**Exit gate:** The receiving change is reviewed and coherent against current
upstream. Every claimed check applies to that change, and preserved work has a
clear disposition. A partial test pass does not complete the baseline.

## Lock the migration contract with dotconfig

**Depends on:** the receiving baseline for readiness; source inspection and
boundary design can proceed before it is complete.

The [import manifest](./docs/migrations/dotconfig-intake.md) records inspected
paths, dependencies, exclusions, and proposed downstream export requirements.
The first portable `fj` source revision is landed at dotconfig master
`d68a19c60bb263a19810fe6554a9761dd435e5e8`; source merge and CI evidence are
recorded in that manifest. The first portable CLI's installed export contract is
agreed; the first-slice implementation and four-platform receiving verification
are complete. The complete stateful dependency closure remains unconfirmed.

- [x] Confirm the first portable `fj` source baseline passed review and checks
      and merged to dotconfig `master` before importing it.
- [ ] Confirm the remaining dashboard/Telegram source baselines pass review and
      checks and merge before importing their complete stateful closure.
- [ ] Inventory selected `fj`, dashboard, Telegram, protocol, storage, build,
      and configuration dependencies at exact source revisions.
- [ ] Identify shared code, personal-only code, runtime state, and deployment
      configuration separately. Review the complete import for privacy and
      licensing.
- [ ] Define package interfaces and compatibility tests before choosing which
      directories move. Record substantial architecture decisions explicitly.
- [ ] Map relevant source issues to receiving issues, preserving provenance,
      dependencies, status, and references to superseded work.
- [ ] Account for legacy consumers before deleting preserved source or changing
      a runtime; keep recovery and rollback explicit.

**Exit gate:** Source and receiving owners share one bounded import plan with
verified source gates, explicit exclusions, testable interfaces, and no implicit
runtime cutover. Unrelated source changes and research do not broaden the plan.

## Extract the shared CLI and agent interfaces

**Tracking:** [Issue #6](https://github.com/dataclique/metagenda/issues/6),
[PR #7](https://github.com/dataclique/metagenda/pull/7).

**Current slice:** `tooling/fj/` provides status/help/issue/PR inspection,
selected pure routing and isolated tests from the nominated source.
[Receiving CI](https://github.com/dataclique/metagenda/actions/runs/35313027613)
passed package builds, installed smoke tests and full CLI verification on all
four native platforms at `a0d40b7`. No runtime cutover.

**Depends on:** the migration contract. `fj` is selected migration scope, not a
speculative later add-on. Choose the first import from existing source and its
dependency closure, rather than inventing a replacement CLI.

- [ ] Inventory repeated human/agent operations and map them to existing `fj`
      commands before proposing new interfaces.
- [ ] Select a bounded portable slice with explicit project scope, identities,
      typed outcomes, dependencies, and compatibility tests.
- [ ] Connect planning, notes, tasks, priorities, orchestration, and target
      allocations through first-party tools sharing authoritative state.
- [ ] Evaluate `fj clanker search` as a credential-safe interface proposal;
      define scope and exclusions without bypassing execution policy.
- [ ] Package and test the selected commands without personal configuration,
      runtime state, workstation launchers, or live services.
- [ ] Verify the selected commands through the installed `packages.<system>.fj`
      and `apps.<system>.fj` exports, including `bin/fj` and
      `share/nushell/fj/mod.nu`, against the argument, routing, and platform
      compatibility contract in the
      [import manifest](./docs/migrations/dotconfig-intake.md#downstream-consumer-dotconfig-nix-darwin).

**Exit gate:** The selected existing commands are imported from the verified
source revision and usable by both humans and agents through tested contracts.
New command names and runtime adoption are not approved by implication. The
shared-host destination is recorded in the delivery epic below.

## Extract the observational dashboard

**Depends on:** the migration contract. May proceed independently of the
Telegram implementation once their shared contracts are fixed.

- [ ] Extract the applicable SolidJS/Dockview UI and its domain dependencies.
- [ ] Preserve health, agent, job, backlog, and usage observations behind typed
      response decoding and an explicit server boundary.
- [ ] Separate browser layout persistence from authoritative execution state.
- [ ] Replace workstation-specific build assumptions with receiving Nix and
      workspace packaging; do not revive the CSV prototype.
- [ ] Verify malformed responses, unavailable data, layout restoration, and the
      absence of unauthorized mutation paths.
- [ ] Before extraction, record the dashboard's receiving package boundary,
      named Nix build artifact, server interface, and supported Linux platforms
      in the [import manifest](./docs/migrations/dotconfig-intake.md). Verify
      the installed artifact against its observational API and layout/state
      compatibility contract before Infra consumes it --
      [#22](https://github.com/dataclique/metagenda/issues/22).

**Exit gate:** The dashboard builds and runs in an isolated development setup,
reads the intended contracts, and remains observational. Public exposure and
write controls are separate work.

## Extract the shared Telegram capability

**Depends on:** the migration contract and its protocol/storage compatibility
contract.

- [ ] Extract selected Piece of Pi transport, routing, presentation, question,
      and delivery behavior without importing personal-only features or runtime
      data.
- [ ] Supply identity, runtime paths, and transport configuration explicitly;
      keep credentials outside repository artifacts and test fixtures.
- [ ] Preserve exact session routing, request/question correlation, duplicate
      handling, expiry, and cancellation behavior.
- [ ] Verify restart recovery and state compatibility using synthetic messages
      and isolated stores, not the live bridge.
- [ ] Test private-versus-team-visible output boundaries and reject unsupported
      senders or delivery capabilities without acquiring additional authority.
- [ ] Before extraction, record the Telegram service's receiving package
      boundary, named Nix artifact, entrypoint, configuration/state interface,
      and supported Linux platforms in the
      [import manifest](./docs/migrations/dotconfig-intake.md). Verify the
      installed artifact against protocol, identity, durable-delivery, and
      restart compatibility tests before Infra consumes it --
      [#22](https://github.com/dataclique/metagenda/issues/22).

**Exit gate:** The selected behavior passes realistic contract and recovery
tests, is reproducibly packaged, and has a reviewed operator configuration
contract. This does not enable employee control or switch the running service.

## Deliver on the shared instance and retire through an explicit cutover

**Depends on:** the installed-export checklists in
[CLI](#extract-the-shared-cli-and-agent-interfaces),
[dashboard](#extract-the-observational-dashboard), and
[Telegram](#extract-the-shared-telegram-capability) for the capabilities being
switched, plus Infra's receiving host contract. Infra host preparation can
proceed in parallel with those exports. Dashboard and Telegram artifact names
remain to be selected under the
[SPEC migration gates](./SPEC.md#6-migration-gates); they are not existing
exports.

Deliver supported Linux packages to Infra for the instance shared with
Moneymentum and Yielduck. Machine provisioning and activation belong in Infra;
Metagenda supplies its package, service, state, and identity contracts.

- [ ] Complete receiving review and current verification; publish changes
      through the repository's authorized delivery workflow.
- [ ] Verify the supported Linux package/service exports and their state,
      restart, and identity contracts --
      [#22](https://github.com/dataclique/metagenda/issues/22), with existing
      migration work tracked by
      [#3](https://github.com/dataclique/metagenda/issues/3) and
      [#6](https://github.com/dataclique/metagenda/issues/6).
- [ ] Prepare non-activating host wiring for those exports in Infra without
      copying the personal dotconfig runtime. Preparation must not start
      services, move live state, or change live routing before the separately
      authorized runtime switch --
      [infra #6](https://github.com/dataclique/infra/issues/6).
- [ ] Update consuming configuration through its owning repository and role.
- [ ] Obtain explicit authorization for the runtime switch and any state
      migration.
- [ ] Verify the running version, routing, recovery, and rollback procedure.
- [ ] Verify product isolation on the shared host: Metagenda service privileges,
      state paths, credentials, and routing cannot expose or overwrite the
      Moneymentum or Yielduck equivalents --
      [#22](https://github.com/dataclique/metagenda/issues/22) and
      [infra #6](https://github.com/dataclique/infra/issues/6).
- [ ] Retire old packages and launchers only after consumers are accounted for
      and valuable legacy work is recoverable.
- [ ] Reconcile source and receiving docs and trackers with what actually moved.

**Exit gate:** The operator has verified the supported Metagenda runtime on the
instance shared with Moneymentum and Yielduck, consumers no longer require the
retired path, product isolation holds, and rollback remains defined. A merged PR
or verified package alone is not deployment evidence.

## Expand shared tooling deliberately

These are candidates, not commitments or permission to import all of dotconfig.
Each needs a scoped issue and acceptance criteria before implementation.

- [ ] Select team-relevant skills and scripts with explicit runtime/tool
      dependencies.
- [ ] Extract reusable Nix packages separately from host configuration.
- [ ] Define shared planning and read-only team views without leaking private
      owner traffic or creating a competing backlog.
- [ ] Design cross-machine claims, tenant boundaries, and employee authorization
      before adding multi-user control. The approved shared-host destination is
      tracked in the delivery epic above.
- [ ] Evaluate orchestration research on its merits; do not treat an example
      project or a model experiment as an adopted architecture.

**Exit gate per candidate:** An approved problem, a bounded contract,
appropriate safety tests, a reproducible package, and verified consumers.
Personal planning, unrelated workstation services, and speculative
infrastructure stay outside the initial migration.
