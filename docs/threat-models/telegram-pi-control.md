# Telegram to Pi communication threat model

This is the preserved legacy bot's design, not the threat model for the planned
Piece of Pi replacement. See [SPEC.md](../../SPEC.md) for the migration
boundaries.

## Scope and invariants

The first Metagenda control-panel slice authenticates one Telegram user, lists
local bridge-ready Pi sessions, sends one bounded text message to an exact
session, and returns the correlated reply. It cannot approve an action, invoke a
tool, change a Pi goal, or derive operational authority from Telegram.

## Trust boundaries

1. Telegram update to grammY: sender identity, update ID, command text, and
   message content are untrusted until validated.
2. Runtime configuration to the bot: the owner ID and decrypted token-file path
   are external configuration; the token file is secret.
3. Metagenda to `pi-bridge`: executable path, exact argument vector, stdin,
   machine-readable output, timeout, and exit status cross a local process
   boundary.
4. Bridge response to Telegram: Pi model text is untrusted output and must be
   bounded before Telegram rendering.
5. Telegram message to Pi: even an authenticated owner's text is data for a
   communication-only turn. The Pi bridge must mechanically expose no tools.

## Assets

- Telegram bot token and the owner's numeric identity;
- privacy of local Pi session labels and activity;
- integrity and at-most-once delivery of remote messages;
- the no-tools/no-approval authority boundary;
- correlation between one Telegram update, one Pi turn, and one reply;
- availability of ordinary local Pi sessions when the bridge is disabled or
  malformed input is received.

## STRIDE abuse cases and controls

| Threat                 | Abuse case                                                                                                     | Control and first failing test                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spoofing               | Another Telegram user calls `/agents` or `/tell`                                                               | Compare numeric `from.id` to the configured owner before any bridge call; unauthorized test asserts the fake bridge receives zero calls                                                                     |
| Tampering              | A user selects a stale/index-shifted session                                                                   | Snapshot exact session IDs when `/agents` is displayed, then resolve the selected snapshot ID against a fresh live list; ordering changes cannot retarget the message and stale IDs fail without enqueueing |
| Repudiation            | Telegram retries one update and creates two Pi turns                                                           | Use `update_id` as the bridge dedupe key; duplicate-update test returns the same message lifecycle and one send                                                                                             |
| Information disclosure | Bootstrap mode or an unauthorized caller sees local sessions or secret data                                    | With no owner configured, return only the caller's own numeric ID; errors are bounded typed codes and never contain token contents, paths, bridge stdout, or session paths                                  |
| Denial of service      | Oversized messages, hung bridge processes, unbounded polling, or replies above Telegram's limit wedge delivery | Bound text/output, use an exact subprocess timeout, stop polling at expiry, and split Unicode safely into sequential 4,000-character Telegram messages                                                      |
| Elevation of privilege | Prompt text asks Pi to run shell, approve deployment, or resume money movement                                 | Metagenda has no command for those actions; the Pi extension empties active tools for the correlated turn and restores them afterward                                                                       |

## Replay, ordering, and kill switch

Telegram `update_id` is the idempotency key scoped to the configured owner. The
bridge accepts one queued message per key and serializes one active remote turn
per session. Busy sessions retain bounded queued messages until expiry. A local
`pi-bridge disable` switch prevents new claims and sends while preserving
ordinary local Pi operation.

## Secret handling

The BotFather token is the raw contents of a ragenix-decrypted runtime file. The
bot does not load dotenv, accept the token on argv, interpolate it into Nix, or
log configuration values. Tests use synthetic tokens only. The encrypted `.age`
file may be committed; plaintext must never enter Git, the Nix store, a test
snapshot, or Pi context.

## Out of scope

- action approval/rejection or arbitrary Pi tools;
- file attachments, voice messages, forwarded-message routing, or group chats;
- remote process spawning or waking stopped Pi sessions;
- multi-user RBAC;
- event-sorcery integration before its TypeScript boundary exists.
