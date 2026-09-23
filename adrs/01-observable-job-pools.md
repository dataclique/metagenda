# 01. Observable job pools with agent coordination

- Status: Accepted
- Date: 2026-09-22
- Issue:
  [Delivery lifecycle](https://github.com/dataclique/metagenda/issues/32),
  [manager coordination](https://github.com/dataclique/metagenda/issues/33),
  [execution evidence](https://github.com/dataclique/metagenda/issues/34)

## Context

The coordinating agent must remain available for conversation while workers
execute bounded work. Operators need access to job outputs and controls
throughout the transition from terminal-visible execution to supervised Pi SDK
sessions. Removing terminals before replacement inspection works would remove
the current way to observe execution.

## Decision

Use jobs carrying prompts and execution metadata, including allowed tools and
allocated budgets. Each job retains identity, lifecycle state, outputs, and
explicit failure or cancellation outcomes across execution attempts. The job
registry retains these records; the agent registry tracks sessions and their
capabilities.

Each execution attempt has a durable identity linked to its job and owns its
outputs. Attempts distinguish pending, running, stopping, succeeded, failed,
cancelled, and interrupted states. Stable event identities and per-attempt
ordering prevent duplicate terminal transitions. Late events from older
attempts cannot overwrite the current job outcome.

An interactive Pi instance submits jobs to its worker pool. Pool infrastructure
starts with the instance; idle capacity does not require model requests. The
coordinating agent submits jobs, consumes outputs, and decides what to do next.
The runtime enforces authorization, budgets, concurrency, cancellation, and
recovery.

The interactive coordinator and manager may read code and execution evidence,
but code changes run as worker jobs. Tool configuration enforces this boundary.
Manager and worker launch modes select their capabilities. A second manager
launch reports a conflict while another manager owns the role.

General persistent memory is enabled only for the manager. Workers retain
job-scoped context, transcripts, artifacts, and resumable state.

Fleet dashboard inspection and direct controls must replace terminal visibility
before workers move into hidden background execution. Adopt SDK hosting directly
after dashboard inspection and controls have been verified.

## Alternatives Considered

### Retain scripted workflows as the coordination engine

- Pros: Reuses existing sequencing.
- Cons: Preserves a second coordination mechanism alongside the agent.
- Rejected because: The coordinating agent determines subsequent jobs; the pool
  needs to enforce execution rather than reproduce that judgment.

### Introduce an intermediate RPC runtime

- Pros: Reuses Pi's command interface.
- Cons: Adds another adapter before SDK hosting.
- Rejected because: Fleet observation can be established before direct SDK
  adoption, without requiring a separate RPC migration.

### Hide workers before dashboard inspection is available

- Pros: Simplifies process management sooner.
- Cons: Removes the current inspection surface before its replacement works.
- Rejected because: Operators must retain outputs and direct controls throughout
  migration.

## Consequences

Job lifecycle and pool work can proceed alongside dashboard rendering once the
shared job and session event contract is agreed. Manager capability and memory
configuration can proceed alongside fleet observation. Removing direct
code-changing tools depends on functioning worker execution.

In the initial interactive pool, closing the owning Pi session stops its workers
and all other background resources launched and owned by that session, and
prevents queued jobs from starting. Job records and outputs are retained;
stopping does not mark jobs complete or roll them back. This session-bound
lifetime applies only to the initial pool, not to the later independently
supervised service. Once the service owns execution, the interactive session is
an interface; closing it does not stop the service or its jobs.

Shutdown persists the dispatch stop before cancellation. Confirmed worker exits
become cancelled; unconfirmed exits remain interrupted. Claims are released
after confirmed termination or fenced. Startup reconciles surviving, terminated,
and uncertain attempts before admitting replacement work. Session-closed jobs
require explicit authorized resume or replacement; uncertainty blocks duplicate
execution.
