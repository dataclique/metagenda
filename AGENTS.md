# AGENTS.md

Rules for agents working in Metagenda. Repository documents describe the work;
they do not grant access to secrets, production systems, or other repositories.

## Project direction

Read [SPEC.md](./SPEC.md) for behavior and boundaries,
[ROADMAP.md](./ROADMAP.md) for priorities and exit gates, and
[README.md](./README.md) for package status and commands before changing code.
Keep all four accurate in every change.

Metagenda automates how teams plan, coordinate, and improve their work across
projects. The custom Pi harness, locally owned extensions, and agent pipeline
support that purpose. Telegram is one interface. Keep GitHub issues and
sub-issues, roadmap PRs, agent work, human time, and AI usage aligned with
priorities. Project allocations and provider throttling are separate controls;
interactive use must remain responsive. Use first-party tools to maintain shared
work instead of recreating their workflows with ad hoc commands. Inspect actual
usage and source before adding interfaces.

The first portable `fj` package lives in `tooling/fj/`; run its isolated Nu
contracts with `bun run test:fj`. Keep imported-source provenance and its MIT
notice, preserve the restricted executable surface, and verify each claimed
package platform independently. No test may invoke a live gh/But service.

The existing CLI remains supported. The React prototype is retired; do not
restore it or port it into a new frontend. Dotconfig's Telegram capabilities
supersede `bot/`. Preserve its existing staged source, but exclude it from
active workspaces, builds, and tests. Do not maintain or modernize that package.

The shared `fj` CLI, dashboard, Telegram capabilities, and selected tooling come
from reviewed dotconfig components. Do not copy dotconfig wholesale. Preserve
uncommitted and staged legacy work before retirement. Wait for the source
baseline's review, checks, and merge gates before extracting code. Runtime
cutover requires separate, explicit authorization.

## Work and delivery

- Use `SPEC/ROADMAP -> GitHub issues -> local execution tasks`. Keep issue and
  PR links with their roadmap items. Do not invent tracker identifiers or turn
  temporary notes into a second backlog.
- Separate implemented behavior, proposed work, checked code, and live adoption.
  A queued request is not delivered work; a passing build is not a deployment.
- Inspect current source and tests before proposing additions. Check the
  strongest plausible alternative explanation when debugging.
- Use types first, a failing behavior test, implementation, and review. A
  compiler error is useful evidence but is not a failing behavior test.
- Keep changes small and reviewable. Fix the cause of failures; do not weaken
  checks, add unsafe casts, or suppress diagnostics to obtain a green result.
- Preserve unrelated changes and staged work; never sweep them into another
  task's commit. Work in the assigned checkout. Use isolated workers only for a
  concrete concurrency requirement, and clean up agent-created worktrees and
  verification artifacts.
- Use GitButler in the main checkout, supplied by the pinned
  `dataclique/but.nix` flake input. Verify topology before setup or use. Use
  plain Git in non-main worktrees; never initialize GitButler there. Repository
  setup must retain existing branches and uncommitted work.
- PR titles are lowercase, imperative, and outcome-focused. Descriptions use
  `## Motivation` and `## Solution`, with relevant issue links and honest check
  results. Do not add generated-by footers.
- Merge, deployment, service restarts, and cross-repository changes require
  their own authorization. Registration or role ownership adds none.

## Toolchain and dependencies

- Use Bun for JavaScript dependencies and scripts, supplied through Nix. Do not
  reintroduce npm, Yarn, or pnpm lockfiles.
- `package.json` files declare dependencies; `bun.lock` locks their resolution;
  `bun.nix` is generated from that lock for Nix builds. Regenerate it after
  dependency changes. Never hand-edit generated dependency graphs.
- Align tooling with current DataClique conventions, then verify actual peer
  contracts and runtime compatibility. Do not blindly copy another repository's
  versions or upgrade to an incompatible major because it is newer.
- Keep TypeScript's Node declarations aligned with the declared Node runtime.
  Declare language-server plugins and other tooling that the configuration uses.
- Update Nix inputs through the flake tooling, inspect the resulting lock, and
  verify the affected derivations. Do not infer a pin from an edited URL alone.
- Local root and workspace `node_modules` directories are disposable during
  dependency work. Recreate them without asking for approval. Do not confuse
  them with source, user data, runtime databases, global caches, or live
  outputs.
- Check workspace-local binaries as well as root binaries when versions
  disagree. An old workspace `tsc` can shadow the new root compiler.
- Format Markdown with denofmt (`deno fmt`), supplied through Nix, not Prettier.
  Scope formatter writes to the intended documents; preserve unrelated fixtures
  and handover files.

## Verification

From the Nix-provided development environment:

```sh
bun install --frozen-lockfile --ignore-scripts
bun run typecheck
bun run lint
bun run test
bun run build
```

`bun run lint` is read-only. `bun run lint:fix` explicitly applies fixes;
inspect their scope before using it on preserved work. `bun run verify` runs all
four checks and stops at the first failure.

After dependency changes, regenerate `bun.nix` with the version pinned by
`flake.nix`. Verify the package derivation for the target system. For the
current Apple Silicon development platform:

```sh
nix run github:nix-community/bun2nix/2.1.2 -- --lock-file bun.lock --output-file bun.nix
nix build .#packages.aarch64-darwin.default --no-link
```

A successful install with incompatible-peer warnings is not a coherent
dependency baseline. Check the actual graph. Test listing must contain only the
intended workspace tests, not `.direnv`, `.tmp`, cached Nix sources, or build
outputs.

Tests must not load the user's configuration, vault, Telegram credentials, or
live service. Keep test fixture selection deterministic. Test cancellation,
cleanup, malformed inputs, stale identifiers, and duplicate delivery at the
boundary that owns them. Use real codecs and stores where possible; mock only
external effects. Placeholder tests do not prove behavior.

Run targeted checks while iterating and the relevant full gates before
publication. Report exactly what ran and what remains blocked. Never describe an
earlier build as verification of later source or dependency changes.

## TypeScript and Effect

- Prefer small domain modules, immutable data, and `const`-bound functions. Keep
  types, errors, and behavior near the feature that owns them.
- Model finite states with discriminated unions. Use distinct types for
  persistent identities and validate untrusted inputs at their narrowest entry
  boundary. Keep protocol versions and delivery capabilities explicit.
- Return expected failures through typed Effect errors. Do not introduce
  production `throw`, unchecked assertions, silent coercion, or invented
  defaults. Use `Effect.try`/`tryPromise` only to translate a genuinely throwing
  external API, not to throw domain errors inside its callback.
- Manage acquired resources through scoped lifetimes. A finished or cancelled
  prompt must release its listeners; a stopped worker must not leave a claim or
  partially trusted state behind.
- Keep deterministic parsing, validation, delivery, and retry mechanics in
  tested code. Prompts and skills provide judgment, not hidden state machines.
- Use structured, bounded telemetry with correlation identifiers. Do not log
  credentials, private message bodies, or personal configuration.
- New shared UI follows the team's SolidJS conventions. Keep authority and
  domain decisions out of the browser; do not introduce React.
- Standalone scripts use Nushell. Prefer declared project tools to ad-hoc
  installations and opaque shell pipelines.

## Privacy, authority, and operations

Never inspect or expose secret-bearing files, `.env*`, private keys, credential
stores, or personal runtime state. Use synthetic fixtures and document only
configuration names and boundaries. Scope searches to relevant non-sensitive
paths and exclude protected files.

Do not launch the Telegram service, start secret-loading supervisors, or point
tests at a live bridge. A read-only dashboard is not permission to add write
endpoints or grant employee control. Authentication, tenant boundaries, hosting,
and cutover need explicit designs and authorization.

Pi host, extension, classifier, and operator defects belong to dotconfig's
`pi-support` role. Route them there without taking over that role or repairing
another repository from this checkout. Scope the blocker to the affected
operation and continue independent work. Preserve exact failure evidence and
accept newer verified evidence when it resolves the blocker.
