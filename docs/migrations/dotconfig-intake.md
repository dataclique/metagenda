# Dotconfig import manifest

## Status and gate

This is a receiving manifest, not an import or runtime cutover. The source paths
below were inspected in dotconfig's working tree. The nominated master commit,
review-loop result, and checks are still awaiting confirmation from the source
owner. Recheck every selected path against that exact commit before extraction.
Do not use a moving checkout as the import baseline.

The receiving CLI passes Node 26 typecheck, lint, seven tests, build, and the
Apple Silicon Nix package build. Those checks cover preparation, not imported
code. The superseded bot is inactive; its staged source remains preserved.

## First slice: a portable first-party CLI

`fj` belongs in Metagenda and must serve humans and agents. Start with existing
repository/tracker inspection and routing contracts, without importing host
activation or rebuilding capabilities that already exist. The proposed receiving
root is `tooling/fj/`; confirm that package boundary with the source owner
before copying. Preserve source revisions, licenses, and relevant tests.

| Source path under dotconfig                       | Proposed receiving path         | Dependencies and required split                                                                                                                                                             |
| ------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nushell/fj/routing.nu`                           | `tooling/fj/routing.nu`         | Nushell. Select command routing, verified VCS-backend selection, stack translation, and protected-push rules. Separate host-pinned dispatcher routing and project-specific launch defaults. |
| `nushell/fj/routing.test.nu`                      | `tooling/fj/routing.test.nu`    | Nushell `std/assert` and the selected router. Retain relevant behavior tests; use synthetic paths rather than workstation identities.                                                       |
| `nushell/fj/gh.nu`                                | `tooling/fj/gh.nu`              | `gh`, JSON decoding, and explicit repository context. Initial surface: issue/PR list and view. No credential files move with the client.                                                    |
| `nushell/fj/mod.nu`                               | `tooling/fj/mod.nu`             | Entry point needs a bounded extraction: it imports checks, workflows, completions, GitHub, help, Markdown, infra, and cheatsheet modules. Do not copy it wholesale.                         |
| `nushell/fj/completions.nu`, `nushell/fj/help.nu` | Matching files in `tooling/fj/` | Keep completions/help aligned with imported commands; do not advertise deferred launch, mutation, or infrastructure commands.                                                               |

Initial executable dependencies are Nushell, Git, and `gh`; GitButler applies
only to a verified managed main worktree. The routing model must not make tool
availability into authority. Mutating verbs require a separately selected,
tested command surface; preserving their pure routing tests does not authorize
executing them.

## Planning and orchestration dependencies

These are observed source dependencies, not a complete portable package closure.
Proposed domain code belongs under `packages/work-core/`, separate from UI and
host adapters. Confirm the source owner's canonical plan/note/task modules
before selecting that stateful slice.

| Source path under `ai/pi/extensions/control-plane/` | Observed dependency or boundary                                                                                                                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `job-runtime.ts`                                    | Effect; `harness-protocol.ts`, `harness-research-protocol.ts`, `review-duty-profile.ts`. Job kinds currently include review scans and review/research harness jobs; this is not yet evidence of a generic project-planning API. |
| `harness-protocol.ts`                               | Effect and `review-duty-profile.ts`; retain identity, payload, and handoff compatibility checks.                                                                                                                                |
| `harness-research-protocol.ts`                      | Effect; preserve research payload/handoff contracts rather than invent another protocol.                                                                                                                                        |
| `review-duty-profile.ts`                            | Profile and canonical-path definitions. Inspect configuration coupling before moving registrations or defaults.                                                                                                                 |
| `job-presentation.ts`                               | Job type from `job-runtime.ts`; keep presentation separate from authoritative lifecycle transitions.                                                                                                                            |
| `allowance-pool.ts`, `usage-policy.ts`              | Provider allowance identities and resource-policy inputs. Do not equate subscription allowance policy with project time/resource allocation.                                                                                    |
| `dashboard/app.tsx`                                 | SolidJS, Effect, the job/allowance modules above, `dashboard/allowance-chart.ts`, and `dashboard/ControlPlaneDock.tsx`. The dashboard is a consumer of these contracts, not their owner.                                        |

The next dependency inventory must identify the canonical planning, notes,
tasks, priorities, allocation targets, persistence, and agent-tool adapters. Use
that existing state model across `fj`, agents, dashboard, and Telegram; do not
introduce a second backlog or infer a finished planning system from the job and
allowance modules alone.

## Downstream consumer: dotconfig nix-darwin

Dotconfig will consume a pinned, landed Metagenda revision. It will wire and
validate that dependency in its own repository after landing, not against an
unpublished branch or a guessed export.

Agree the export contract before implementation: supported systems, flake
package attributes, Nushell module paths, executable names, protocol versions,
and any configuration options. Preserve the existing CLI package. A named `fj`
package and explicit shared-tooling outputs are proposed; their final attributes
and layout are not established by this manifest.

Keep package exports separate from host activation. A Darwin module, if needed,
must have explicit configuration and state paths, no personal defaults, and no
implicit service startup. Test package/module evaluation and consumption against
the landed revision before any separately authorized live switch.

## Keep outside the first import

- `nushell/fj/check.nu` and `workflow.nu`: current checks are
  repository-specific and may fix/delete files; the workflow stages all changes,
  commits, or launches an agent. These need explicit project configuration and
  separate mutation contracts, not automatic adoption as receiving verification.
- `clanker` launch/resume effects in `mod.nu`: they inspect local session stores
  and registry state, choose host-specific behavior, and can start a dispatcher
  and Ollama. Keep runtime paths, process ownership, and launch authorization in
  explicit adapters; copy no session or registry database.
- `md.nu` → `md-lib.nu` → `md-sync-lib.nu`: note synchronization is relevant,
  but current defaults point to personal configuration and plan files. Inspect
  this closure and its tests before extracting it; do not run it against a live
  vault.
- `infra.nu`: it targets the workstation flake and includes infrastructure
  mutation commands. No provisioning or host configuration is selected here.
- Personal messages, goals, databases, credentials, launchers, and deployment
  configuration. Telegram remains a later selected import, not legacy-bot work.

## Usage evidence and receiving tests

Repeated operations observed during Metagenda preparation include repository
inspection, tracker inventory, declared checks, task-state updates, and scoped
source search. This is a bounded observation, not a cross-session frequency
study. Map these operations to existing first-party interfaces before adding
commands. `fj clanker search` remains a credential-safe interface proposal, not
a settled API or an execution-policy bypass.

Before considering the first slice usable:

- Preserve exact arguments, unsupported-command errors, main/linked-worktree
  routing, and protected-branch behavior using synthetic topology evidence.
- Exercise entry-point dispatch with isolated fake external executables; no real
  push, merge, agent launch, registry access, or service startup.
- Verify malformed tracker responses, failed external commands, explicit
  repository scope, and human/machine-readable outcomes at their owning
  boundary.
- Preserve the selected job identity, claim, retry, cancellation, and recovery
  contracts with synthetic state before connecting a real store or runner.
- Verify portable Nix packaging and rerun receiving checks on the imported code.

Import code only after the source gate passes. Any live consumer switch, state
migration, or retirement remains a separately authorized operation.
