# Metagenda

Metagenda helps a small team deliver more work across projects without a
corresponding increase in coordination overhead. It brings together idea
refinement, priorities, work sessions, progress tracking, reviews,
retrospectives, and resource allocation.

AI supports this work through a custom Pi harness, locally owned extensions, and
a pipeline for research, implementation, independent checks, and reporting.
Telegram provides a conversational interface. GitHub issues, sub-issues, and
roadmap PRs connect plans to delivery; human time and AI usage are managed
against project priorities.

Adjustable resource allocations and dynamic throttling keep background work
within usage limits while preserving responsive interactive sessions.

The current TypeScript CLI supports task planning and work sessions. The
portable `fj` package provides repository and tracker inspection. The broader
Telegram planning and orchestration workflow remains in development.

## Documentation

- [SPEC.md](./SPEC.md): product direction and capability contracts.
- [ROADMAP.md](./ROADMAP.md): prioritized outcomes and delivery work.
- [AGENTS.md](./AGENTS.md): engineering workflow and operating rules.

## Packages

- `cli/`: task parsing, planning, work sessions, and asciinema
  recording/playback.
- `tooling/fj/`: portable repository status and GitHub issue/PR list/view. It
  has no mutation or host/session management commands; explicit view `--web` may
  open a browser through gh.
- `packages/work-core/`: private ESM canonical-backlog decoder and normalizers,
  source tests, and strict compiled-only consumer checks. Published in
  [draft PR #25](https://github.com/dataclique/metagenda/pull/25) at `0de61d4`.
  That head passed local type/lint/tests, Apple Silicon Nix checks and the
  default CLI build, targeted source/packaging reviews, four-platform package
  and receiving checks, and both Linux default-package builds. Workspace
  reconciliation with newer master requires fresh verification. This is a
  prerequisite of
  [planning #15](https://github.com/dataclique/metagenda/issues/15), not an
  implemented planner, complete Pi integration, or runtime switch.

`bot/` is no longer an active workspace, build, or test target. Its uncommitted
source is preserved, but dotconfig's Telegram capabilities fully supersede it.
Do not maintain the legacy package.

The obsolete React web workspace and browser-extension shell have been removed;
CLI recording remains. The dashboard and replacement Telegram service have not
yet been imported. Runtime cutover requires separate authorization.

## Portable fj

`nix run .#fj -- help` selects the additive `fj` app; the default app remains
Metagenda. `nix build .#fj` builds the package, including isolated Nu tests. The
package exposes `bin/fj` and `share/nushell/fj/mod.nu` with sibling modules. For
local tests, use `bun run test:fj` with Nu from the development shell.

Commands are default repository status, `help`, `issue list`, `issue view`,
`pr list`, and `pr view`. List forwards gh flags; view supports `--comments` and
explicit browser-opening `--web`. Omitted PR IDs use the caller's current
branch. Repository context never changes to the installation directory.

But is optional on PATH and is used only for default status in a main worktree
with the `gitbutler/*` branch heuristic. Missing or failing But is an error
there; linked and unmanaged worktrees use Git. This heuristic grants no
authority.

The first `fj` slice is implemented, reviewed and
[merged](https://github.com/dataclique/metagenda/pull/7).
[Receiving CI](https://github.com/dataclique/metagenda/actions/runs/35313027613)
verified package builds and CLI checks on all four declared native platforms.
[Source provenance and compatibility contracts](docs/migrations/dotconfig-intake.md)
document the import. No live consumer has been switched by this extraction.

## Development

`flake.nix` declares the toolchain, including Node 26 and GitButler from the
pinned [`dataclique/but.nix`](https://github.com/dataclique/but.nix) input. Use
`but` in the main checkout and plain Git in linked worktrees. Bun manages
JavaScript dependencies through `bun.lock`; `bun.nix` supplies Nix builds.

From a configured development shell:

```sh
bun install --frozen-lockfile --ignore-scripts
bun run typecheck
bun run test
bun run build
```

After dependency changes, regenerate `bun.nix` with the pinned bun2nix tool
before building with Nix:

```sh
bun2nix --lock-file bun.lock --output-file bun.nix
```

`bun run lint` checks active workspaces without changing files;
`bun run lint:fix` applies fixes explicitly. The aggregate `verify` script runs
typechecking, linting, tests, and builds. These commands describe verification
steps; they do not claim that all checks pass.
