# Metagenda

Metagenda helps humans and AI agents collaborate across projects through shared
planning, notes, tasks, priorities, orchestration, and target time/resource
allocations.

The current TypeScript CLI supports task planning and work sessions. The next
step is to bring over reviewed dotconfig capabilities, including `fj`, the
dashboard, Telegram, and selected shared tooling—not rebuild them here.

## Documentation

- [SPEC.md](./SPEC.md): product direction, capability boundaries, and acceptance
  criteria.
- [ROADMAP.md](./ROADMAP.md): delivery sequence and migration gates.
- [AGENTS.md](./AGENTS.md): engineering workflow, tooling, and operating rules.

## Packages

- `cli/`: task parsing, planning, work sessions, and asciinema
  recording/playback.

`bot/` is no longer an active workspace, build, or test target. Its staged
source is preserved, but dotconfig's Telegram capabilities fully supersede it.
Do not maintain the legacy package.

The obsolete React web workspace and browser-extension shell have been removed.
CLI recording remains. `fj`, the shared dashboard, and the replacement Telegram
service have not yet been imported. Source review, checks, and master merge must
precede extraction; runtime cutover needs separate authorization.

## Development

Tooling is declared in `flake.nix`, including Node 26 and GitButler from the
pinned [`dataclique/but.nix`](https://github.com/dataclique/but.nix) input. Use
`but` for version control in the main checkout and plain Git in linked
worktrees. Bun manages JavaScript dependencies through `bun.lock`; `bun.nix`
supplies the Nix builds.

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

`bun run lint` checks the CLI without changing files; `bun run lint:fix` applies
fixes explicitly. The aggregate `verify` script runs typechecking, linting,
tests, and builds. These commands are verification steps, not a claim that all
checks pass.

The local legacy-bot work, including
`docs/threat-models/telegram-pi-control.md`, remains uncommitted and separate
from this receiving baseline. That threat model describes the legacy bot, not
the planned replacement.
