# 01. Supervised Pi SDK sessions

- Status: Proposed
- Date: 2026-09-22
- Issue:
  [Manager coordination](https://github.com/dataclique/metagenda/issues/33),
  [execution lifecycle](https://github.com/dataclique/metagenda/issues/16)

## Context

Work spans research, engineering, review, and operations across projects. Runs
need observable tool execution, bounded capacity, direct cancellation, and
resumption after corrections. A manager conversation must remain accessible
across clients without owning the lifetime of all workers. Routine supervision
must not require a terminal for each run.

## Decision

Use the Pi SDK to host sessions in supervised worker processes. Keep the
coordinator independent of the manager model session. It owns scheduling,
delivery, process lifecycles, and durable execution state. The manager handles
conversation and judgment through the same authorized operations as other
clients.

Use the same SDK session host for the manager and task workers, with separate
conversation state and role-specific tools, permissions, and memory policies.
Persistence is a session policy, not a reason to give the manager a different
transport. This avoids maintaining two implementations of session observation,
steering, cancellation, and recovery in the target system.

The SDK is preferred for direct composition of per-task tools, resource loaders,
extension factories, and session replacement in the TypeScript host. This is an
integration tradeoff, not a claim that RPC cannot support custom clients,
steering, transcripts, or cancellation. Both approaches still require a
supervisor and authenticated commands between processes.

Pi's
[SDK documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md)
describes those embedding interfaces; its
[RPC documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md)
also provides session control and observation. These are documentation checks,
not a runtime comparison or evidence that the imported version supports every
current upstream interface. Verify the pinned package before implementation.

Expose session events and authenticated commands to the dashboard, Telegram, and
voice adapters. Stop reaches the coordinator directly without a model turn.
Session history survives worker process termination; a stopped assignment can
resume or be replaced with explicit corrections and retained evidence.

Allow RPC subprocesses as a transitional adapter. They must satisfy the same
identity, authorization, observation, cancellation, and recovery contracts.
Retain existing interactive clients until replacement behavior is verified.
Start on one machine, with host-independent identities and versioned messages;
distributed transport and scheduling are deferred.

## Alternatives Considered

### Interactive Pi processes in terminal panes

- Pros: Reuses the native interface and existing manual inspection.
- Cons: Requires a bridge for shared controls and ties routine inspection to
  terminal navigation.
- Rejected because: Terminal-independent supervision and shared conversation
  clients are required. Interactive processes remain useful during transition.

### RPC subprocesses as the permanent runtime

- Pros: Provides process separation and a command/event protocol without
  embedding Pi.
- Cons: Custom session behavior must fit the RPC surface or introduce another
  extension boundary.
- Rejected because: The target favors composing per-task tools and extension
  dependencies directly in the TypeScript worker host. This accepts tighter SDK
  coupling and additional integration work. RPC remains a viable transition
  option; custom interfaces alone do not justify replacing it.

### All sessions inside the manager process

- Pros: Simplifies initial in-process coordination.
- Cons: Couples worker availability and failure recovery to the manager host.
- Rejected because: Worker control and human stop commands must remain available
  when the manager conversation fails or is unavailable.

## Consequences

The system must supply its own session inspection, event retention,
authenticated control, and recovery integration. Embedding the SDK alone does
not provide a scheduler, cross-machine coordination, or a complete stop
guarantee. Extensions must be tested in the chosen host, including cancellation
of tools and child processes. Shared authorization and lifecycle contracts must
hold across both SDK and transitional RPC adapters.

The specification defines the required behavior. This record does not activate
services, select a memory plugin, migrate personal voice code, or authorize
production operations. Adoption depends on reviewed compatibility and recovery
evidence, followed by an authorized runtime cutover.
