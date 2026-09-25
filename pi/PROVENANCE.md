# Received Pi source

The received tree is under `pi/`, rather than the earlier proposed
`packages/pi-extensions/` destination. Existing files outside the verified
selection below remain preserved; their presence is not approval to publish
them. The intended runtime package is `@metagenda/pi-extensions`, rooted at
`pi/extensions/`. Its complete resource manifest and Nix distribution are not
yet validated. Completing a smaller verification step does not complete the
shared Pi migration.

## Verified source and license

Public source: [0xgleb/dotconfig](https://github.com/0xgleb/dotconfig), master
revision `540ea10b2892f33d6c5fc486287050a2b6092b7b`. Its parents include
rollback revision `746bf92b7070487a065a8eef874897848cc8448d`. The earlier
extracted `workflow-engine.ts` and `bridge-contract.ts` are not current intake
inputs.

`pi/LICENSE` preserves source root MIT notice
`5aa3a777be78d67ca24aa3a5d5cacb8e3fbeba4a`, copyright 2026 0xgleb. This notice
applies to the nominated locally owned source, not as a replacement for any
upstream notices or as a claim that every received file is locally owned.

## Current verification selection

The following received files match the public source revision exactly by Git
blob identity. Source paths have prefix `ai/pi/`; receiving paths have prefix
`pi/`.

| Path relative to those prefixes                    | Git blob                                   |
| -------------------------------------------------- | ------------------------------------------ |
| `extensions/btw/core.ts`                           | `bb9bc7c6f4b5ff6adbc932c44d6178a937b96f8b` |
| `extensions/btw/core.test.ts`                      | `593e13cd2a977c59f5dec570a38c95066fce06df` |
| `extensions/btw/index.ts`                          | `a229ba7b7742baec81f06bf6e50e4d6786ddb366` |
| `extensions/btw/THREAT-MODEL.md`                   | `3bfe5b1d96d7f8a2c24f8cf8ce4bb2682ae75230` |
| `extensions/shared/runtime-version.ts`             | `e68ffdfce28d8b53739a66fcd321629eb7f7e099` |
| `extensions/classified-workflows/goal.ts`          | `6ca3a78ac2895ae0426cfd27cedd809f886daa22` |
| `extensions/classified-workflows/goal.test.ts`     | `01753d4097efafcc8a5a0891693d9d789f32f715` |
| `extensions/classified-workflows/protocol.ts`      | `db7b8d1099473b5869613e8443c7ca95e73966ec` |
| `extensions/classified-workflows/protocol.test.ts` | `5f1ea0d9d44275927628373d9a35a35c63b2995d` |

The four `btw` files originate in source commit
`1c659beef299823ebe7c3e005de234c3ea6cba5a`, authored by repository owner
`0xgleb`. This records inspected local-origin evidence, not a universal ancestry
claim. The current bodies, rather than their historical initial versions, are
retained.

`btw/index.ts` imports its core, `shared/runtime-version.ts`, and the Pi SDK.
The core has no runtime dependencies; runtime-version imports only the SDK type.
The required external SDK surfaces are `@earendil-works/pi-ai/compat`,
`@earendil-works/pi-coding-agent`, and `@earendil-works/pi-tui`. Registry
metadata confirms version 0.85.1 exists for these packages and exports the
`pi-ai/compat` subpath.

The three SDK packages are pinned at 0.85.1 in root development dependencies;
`bun.lock` and generated `bun.nix` record their resolution. The received
extension manifest is not enrolled as a workspace or loaded. The standalone
`pi/extensions/receiving.test.ts` checks module resolution without importing SDK
code or invoking providers. No imported source API or runtime body is changed.

## Receiving-owned verification code

`pi/extensions/receiving.test.ts` is new Metagenda test code written during this
integration, not an imported dotconfig file. Its current SHA-256 is
`fcfa5c9b289abe7e34e84f4ba34cff825833fe9cd0abf446e0c70eec4ccd0413`. Independent
review found its resolution check meaningful and confirmed that it does not
import SDK code or invoke providers/configuration; the test name was corrected
to say SDK entrypoint resolution, not runtime-export verification.

The root `test:pi-intake` script runs `btw/core.test.ts`,
`classified-workflows/goal.test.ts`, `classified-workflows/protocol.test.ts`,
`receiving.test.ts`, and `receiving-manifest.test.ts` under `pi/extensions/`,
plus the skills metadata, dashboard builder/toolchain/Nix, and native-load tests
under `pi/`. It is included in the aggregate test command without enrolling the
received manifest as a workspace or loading its resource list. The manifest test
checks declared entrypoint presence without importing the extensions.

The goal and protocol modules import only `Data` and `Effect` from `effect`.
Their tests import their respective local module, Node assertion/test APIs,
Effect, and, for protocol tests, Node VM. Independent public Contents API blob
identifiers match `git hash-object` for all four files, as recorded above; their
provenance no longer depends on the earlier rate-limited GraphQL query.

## Evidence and limits

- Four received `btw` core tests pass on Node 26.8.2.
- The three receiving SDK-resolution tests failed with `ERR_MODULE_NOT_FOUND`
  before dependency integration and pass after it. Together with the four core
  cases, 26 goal/process-protocol cases, one entrypoint-presence regression, two
  skills metadata checks, five dashboard checks, and two native-load checks,
  `bun run test:pi-intake` passes 43 tests through the pinned Nix toolchain.
- Root `typecheck`, `lint`, `test`, and `build` scripts each pass with the
  43-test intake. They were run separately through the pinned Nix toolchain.
  Workspace typecheck and build cover CLI/work-core, not the complete Pi tree.
- `pi/native-load.test.mjs` loads only the received `btw/index.ts` through the
  installed Pi 0.85.1 loader. It verifies command registration, absence of
  tool/session/provider registrations, version-listener cleanup, and an explicit
  missing-entrypoint error. It invokes no command, session handler, model, or
  service and does not discover the received manifest. This verifies one native
  extension-loading boundary, not the complete runtime package.
- Root development dependencies pin Dockview Solid at 5.0.3 and SolidJS at
  1.9.14; the installed SolidJS package reports 1.9.14. Checking the received
  tree with `tsc --noEmit -p pi/extensions/tsconfig.json` exits with code 2,
  reports 204 diagnostics, and reports no TS2307 missing-module errors. This is
  not a passing typecheck.
- The received tsconfig uses `strict: true` and `skipLibCheck: true`. The
  stricter upstream-declaration probe below is diagnostic evidence, not a new
  migration prerequisite. No SDK fork or declaration patch was applied.
- Separate strict TypeScript 5.9.3 entrypoint checking now resolves the SDK but
  fails on upstream declarations and the received `pageup`/`pagedown` key IDs.
  The published SDK types require `pageUp`/`pageDown`; its runtime parser
  accepts lowercase aliases, so this is not evidence of a broken scrolling
  behavior.
- An isolated public-package probe reproduces declaration incompatibilities
  without importing received Pi code. SDK 0.85.1 and 0.86.1 reference the
  missing Node 26 `path.PlatformPath` type and omit JSON import attributes
  required by NodeNext. The SDK's Google client also needs its declared optional
  MCP peer for complete static checking. Testing Bundler resolution with that
  peer removes those two categories but leaves `PlatformPath`; it is not a clean
  NodeNext result. The source-declared SDK 0.84.1 also fails on `PlatformPath`
  and additional generated Anthropic SDK type paths. No library diagnostics were
  suppressed, and the newer/older SDK versions were tested only in the isolated
  probe.
- Public source
  [CI run 35562327541](https://github.com/0xgleb/dotconfig/actions/runs/35562327541)
  passed `nix flake check`. Its full NixOS build failed while building Graphite
  CLI shell completions: bubblewrap could not set up a UID map. This is not a
  demonstrated Pi-source failure or proof that the complete Pi package builds.
- Complete native extension loading and SDK compatibility, the full shared
  extension resource closure, its runtime Nix output, publication, and runtime
  adoption remain unverified. The separate skills output has its own
  [verification record](./SKILLS-PROVENANCE.md).

Personal browser, voice, local-model/host configuration, and personal Telegram
clients are not shared runtime entries. Upstream implementations remain pinned
packages with their own provenance. In particular, the existing adapted todo
extension must not be discarded, relabeled first-party, or silently replaced by
pristine upstream. Its licensed package/fork disposition remains separate from
this SDK-resolution check. Dependency backups and caches are not source exports.
