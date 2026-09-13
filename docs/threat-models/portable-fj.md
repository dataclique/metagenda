# Portable fj boundary

Source: dotconfig PR #81, immutable master
`d68a19c60bb263a19810fe6554a9761dd435e5e8`. The export contract is in
[the intake manifest](../migrations/dotconfig-intake.md). This is an additive
package, not a runtime cutover or command authorization layer.

## Assets and boundaries

- Caller repository and tracker context: arguments, cwd and Git topology cross
  into the dispatcher. Misrouting can disclose another repository's information.
- Repository contents, refs and remote tracker state: unselected commands must
  never reach generic Git, But or GitHub passthroughs.
- Tracker data and failure truth: gh JSON and exit status cross into rendering.
  Invalid responses and failed commands must not look like successful results.
- Personal configuration and live state: tests use isolated configuration and
  fake tracker/But executables. No host, session, credential or database import.

## Threats and regression coverage

| Boundary         | Threat                                                         | Required behavior/test                                                                                                                            |
| ---------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Command dispatch | Elevation/tampering through mutation verbs or argument strings | Reject unselected commands before any executable invocation; forward selected arguments as arguments, never evaluated code                        |
| Git topology     | Spoofed or malformed discovery; wrong repository               | Propagate discovery errors; But only for verified main topology and the documented branch-name heuristic; linked/unmanaged cases never invoke But |
| But status       | Failed managed backend presented as success                    | Missing/failing But is an error, never a fallback to Git                                                                                          |
| gh response      | Failed command emits valid JSON; malformed shapes              | Check exit status before parsing/rendering and reject malformed JSON/records                                                                      |
| Caller context   | Information disclosure through guessed repository/current PR   | Preserve cwd, explicit list flags and omitted PR-ID behavior; no default organization                                                             |
| Test fixtures    | Tampering/denial of service from concurrent cleanup            | Unique invocation-owned roots, isolated config, cleanup only that root on success/failure                                                         |
| Help/completions | Advertise unavailable or mutating capabilities                 | Expose only the selected executable surface                                                                                                       |

No state-changing operations means no new transaction audit log or retry engine.
Requests remain explicit foreground commands; cancellation belongs to their
process lifetime. `--web` intentionally delegates browser opening to gh, only
when requested. gh owns its authentication; this package imports no credentials.
The GitButler branch-name heuristic is not proof of authorization or a full
GitButler state-store verification. A caller-controlled executable PATH is not
an authentication boundary; Nix packaging pins the supplied Nu/Git/gh tools.

## Compatibility

Keep routing argument order and private translation tables, selected gh
formatting, nullable authors, draft/review display, comments/web precedence and
caller cwd. The explicit topology/But failure behavior is a receiving-adapter
difference. No existing default CLI export changes, no consumer retirement, and
no daemon, protocol or state migration. Receiving test/build/review evidence is
required before claiming the new package usable.
