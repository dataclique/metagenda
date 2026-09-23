# Control-plane dock workspace

## Grounded constraints

- The control plane is loopback-only and observational. Docking must not add browser mutation authority.
- `app.tsx` owns one decoded snapshot and all derived Solid accessors. Panels are projections of that shared state, not independent fetchers.
- The current stacked metrics, runway, jobs, and agents sections waste vertical space and cannot be rearranged.
- Yielduck proves `@arminmajerie/dockview-solid` can provide draggable, resizable, tabbable panels, versioned local persistence, a reset/default layout, close/reopen actions, and internal panel scrolling.
- Persisted browser state is untrusted. Unknown panels, oversized JSON, malformed layouts, and storage failures must reset safely without preventing the dashboard from loading.

## Design A — one shared reactive dock (chosen)

Caller:

```tsx
<ControlPlaneDock
  panels={{
    overview: OverviewPanel,
    runway: RunwayPanel,
    jobs: JobsPanel,
    agents: AgentsPanel,
  }}
/>
```

`App` keeps fetch/decode/derived-state ownership. Four local panel components close over those accessors. `ControlPlaneDock` owns only panel catalog metadata, Dockview lifecycle, layout persistence, default placement, close/reopen, and reset.

Types:

```ts
type PanelId = "overview" | "runway" | "jobs" | "agents"
type LayoutRead =
  | { kind: "missing" }
  | { kind: "valid"; layout: SerializedDockview }
  | { kind: "invalid"; reason: "oversized" | "malformed" | "unknown_panel" }
  | { kind: "unavailable" }
```

Dependency direction:

```text
App snapshot/derived accessors -> local projection components
                               -> ControlPlaneDock panel catalog
ControlPlaneDock -> dock-layout storage boundary -> localStorage
ControlPlaneDock -> @arminmajerie/dockview-solid
```

The storage decoder admits only a bounded object whose panel IDs and component IDs are in the fixed catalog. Dockview performs its own deeper structural validation inside a caught `fromJSON` boundary. Invalid or incompatible state seeds the default layout and persists only a later valid `toJSON` result.

Default layout: overview above jobs on the left; runway above agents on the right. Each group can resize, tabs can move within/across groups, panels can close/reopen, and an explicit reset restores this layout. The topbar, connection notice, and footer remain outside the dock.

Tests prove catalog completeness, bounded/malformed storage behavior, default placement, persistence wiring, close/reopen/reset controls, local dependency bundling, and removal of the old stacked workspace grid.

Rollback: remove the dock component and restore the prior projection markup. The versioned local-storage key is isolated and harmless if abandoned.

Falsification: redesign if panel components need independent data lifecycles, Dockview cannot preserve Solid reactivity without provider patches, or the browser bundle cannot include Dockview CSS without remote assets.

## Design B — independent fetching panel roots (rejected)

Each Dockview panel would mount its own resource and fetch `/v1/health`, `/v1/jobs`, `/v1/agents`, and `/v1/usage` independently. This avoids closure ownership concerns and lets panels refresh separately.

It loses because it duplicates decoding, creates incoherent snapshot times, multiplies loopback traffic, scatters error/loading ownership, and makes refresh semantics depend on which panels are open. Deleting the shared snapshot layer would make every panel deeper internally but the overall system shallower and less consistent.

## Implementation slices

1. Add the pinned Dockview Solid runtime dependency and production-lock coverage.
2. Add bounded versioned layout storage with malformed-state tests.
3. Add `ControlPlaneDock` with default layout, persistence, reopen, reset, and theme.
4. Move the four existing projections into local panel components without changing decoded data contracts.
5. Bundle Dockview CSS locally, run dashboard/runtime/format checks, then verify the loopback UI.
