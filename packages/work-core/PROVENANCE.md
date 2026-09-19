# Canonical backlog extraction

## Source

The nominated source is
[dotconfig PR #82](https://github.com/0xgleb/dotconfig/pull/82), landed at
`31a31a2218d9fef19f401c8d5ee86250b42cb867`.

The allowlist under `ai/pi/extensions/shared/` is:

- `canonical-backlog.ts`
- `backlog-normalization.ts`
- `canonical-backlog.test.ts`
- `backlog-normalization.test.ts`

`LICENSE` preserves the source revision's MIT notice.

## Receiving status

The two production modules and their two nominated source tests are imported. On
Node 26 / TypeScript 5.9, strict typechecking and all 37 source/receiving tests
pass, including the bounded worker. Receiving valid-input regressions failed
against typed prerequisites before the nominated implementations were imported.

The package now participates in root workspace verification. The current
Nix-provided `bun run verify` passes typechecking, lint, CLI and fj regressions,
core tests, compiled-consumer checks and builds. The consumer harness copies
emitted package files and a fixed dependency closure into disposable scratch.
Independent review, Nix build verification and publication remain pending. No
runtime has switched.

## Receiving adaptations

The four original file blobs were verified before receiving changes. Tests now
explicitly discard Node test-registration promises and use block-bodied void
callbacks. Redundant optional chains after narrowing assertions are removed.

Production validation uses character codes for the same forbidden control range
instead of the lint-rejected regular expression. Private helper checks already
established by `Array.isArray` or freshly constructed records are removed;
untrusted inputs still pass through the original validation boundary. The
package enables `noUncheckedIndexedAccess` without disabling lint rules.

The package remains private: publication means a reviewed repository revision,
not an npm registry release. The existing CLI does not consume it. The Nix
output is a validation artifact, not a self-contained deployed service.

## Compatibility obligations

Keep existing export names, snapshot representation, coverage markers, revision
hashing, failure codes, reflection behavior and bounded source-worker tests. The
private ESM subpaths are additive; they do not replace the CLI's identities,
change wire formats or migrate a live consumer.

Only Node path/crypto and Effect belong in the production dependency closure.
Exclude host SDKs, configuration, event emitters, transport and persistent
state. Source-dependent tests must retain their relative module locations;
compiled consumer tests must not resolve original TypeScript source or ambient
host SDKs.

## Trust boundaries

Untrusted records and document text cross into a read model. Preserve project
and source identity, requirements, lifecycle and declared coverage without
acquiring execution authority. Tests must cover malformed scopes, sparse or
mutating collections, throwing getters, conflicting identities and excessive or
unterminated declarations. Errors must not disclose private input details.
Worker termination bounds adversarial document processing. No new logs, stores,
clocks or data collectors are part of the extraction.

Tracking: [Metagenda #15](https://github.com/dataclique/metagenda/issues/15).
This package is a prerequisite, not completion of asynchronous planning.
