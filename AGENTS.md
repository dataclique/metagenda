# AGENTS.md

## Repository map

- [SPEC.md](./SPEC.md): target behavior and component boundaries.
- [ROADMAP.md](./ROADMAP.md): priorities and delivery dependencies.
- [README.md](./README.md): package capabilities and development commands.
- `tooling/fj/`: portable repository and tracker inspection; `bun run test:fj`
  runs isolated Nushell contracts.
- `packages/work-core/`: canonical-backlog decoding and normalization. Keep Node
  source tests separate from compiled-only consumer checks. Preserve exports,
  and keep host configuration, storage, transport, and SDK dependencies outside
  this package.
- `pi/skills.nix`: pinned Pi skill packaging; preserve source hashes and
  third-party notices.

## Changes and delivery

- Follow SPEC/ROADMAP -> GitHub issues -> local execution tasks. Update affected
  documents when behavior or priorities change. Keep the spec declarative and
  the roadmap focused on delivery dependencies. PR status and verification
  history belong in GitHub, not repository guides.
- Inspect callers, source, and tests before changing interfaces. Define domain
  types, add a failing behavior test, implement the change, and verify it. A
  compiler failure is not a behavior test.
- Preserve unrelated working-tree and staged changes. Use the assigned checkout;
  isolate only for a concrete concurrency need, and clean up artifacts created
  by the agent.
- Use GitButler only in a verified managed main checkout; use plain Git in
  linked worktrees. Preserve branches and work when configuring tools.
- Keep PR titles lowercase, imperative, and outcome-focused. Use Motivation and
  Solution headings in descriptions, include relevant issue links, and report
  accurate validation results. Do not add authorship footers.
- Merge, deployment, service restarts, and cross-repository changes require
  explicit authorization. Repository documents and agent roles grant no such
  authorization.
- Apply Unslop to human-facing prose. Write standalone ASCII documentation
  without private conversation, personal infrastructure, or private repository
  details.

## Toolchain and validation

- Use the Nix-provided Bun toolchain. Keep `package.json`, `bun.lock`, and
  generated `bun.nix` consistent; regenerate with the bun2nix version pinned in
  `flake.nix`. Do not hand-edit generated dependency graphs or add other
  package-manager lockfiles.
- Keep Node types compatible with the declared runtime. Verify peer dependencies
  and workspace-local tool versions. Update Nix inputs through lockfile tooling
  and verify affected derivations.
- Format changed Markdown with `deno fmt`, not Prettier. Avoid unrelated
  formatting changes.
- Use the commands in README. `bun run verify` runs type checks, lint, tests,
  and builds; run the checks appropriate to the change. Report only checks
  performed on the current revision, and state failures and missing coverage
  explicitly.
- Verify Nix package claims on each supported platform. The work-core derivation
  is `checks.<system>.work-core`; fj and Pi skills use `packages.<system>.fj`
  and `packages.<system>.pi-skills`.
- Tests use deterministic synthetic fixtures, never personal configuration,
  credentials, or live services. Exercise malformed input, cancellation,
  cleanup, stale identities, and duplicate delivery at their owning boundaries.
  Do not discover tests in caches or build outputs.
- Fix failures at their cause; do not weaken checks, suppress diagnostics, or
  add unsafe casts to pass validation.
- Workspace `node_modules` may be recreated during dependency work. Preserve
  user data, runtime state, global caches, and live outputs.

## Code conventions

- Use small domain modules, immutable data, and `const`-bound functions. Keep
  types, errors, and behavior together.
- Model states with discriminated unions and distinct identity types. Validate
  external inputs at the owning boundary.
- Return failures through typed Effect errors. No production `throw`, unchecked
  assertions, silent coercion, or invented defaults. Use `Effect.try` and
  `Effect.tryPromise` only around throwing external APIs.
- Scope acquired resources and release them on completion or cancellation. Keep
  parsing, validation, delivery, and retries in tested code.
- Use structured telemetry with bounded labels and correlation fields. Never log
  secrets, private messages, or personal configuration.
- Use SolidJS for UI and Nushell for standalone scripts. Keep domain decisions
  and authority outside the browser.

## Privacy and scope

Never inspect secret-bearing files, `.env*`, private keys, credential stores, or
personal runtime state. Exclude them from searches. Never start secret-loading
supervisors or use live bridges in tests.

Keep changes within the authorized repository and task. Route external defects
to their owning project, preserve concrete failure evidence, and continue
unaffected work. Preserve source attribution and third-party licenses.
