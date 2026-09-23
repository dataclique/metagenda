import {
  DockviewDefaultTab,
  DockviewSolid,
  type DockviewApi,
  type DockviewReadyEvent,
  type DockviewTheme,
  type IDockviewHeaderActionsProps,
  type IDockviewPanelHeaderProps,
  type IDockviewPanelProps,
  type IWatermarkPanelProps,
} from "@arminmajerie/dockview-solid"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { For, Show, onCleanup, type Component } from "solid-js"
import {
  clearControlPlaneDockLayout,
  type ControlPlanePanelId,
  readControlPlaneDockLayout,
  writeControlPlaneDockLayout,
} from "./dock-layout.ts"

type PanelEntry = {
  readonly id: ControlPlanePanelId
  readonly title: string
}

const PANEL_CATALOG: readonly PanelEntry[] = [
  { id: "overview", title: "Fleet overview" },
  { id: "runway", title: "Subscription runway" },
  { id: "jobs", title: "Agent jobs" },
  { id: "backlog", title: "Durable backlog" },
  { id: "agents", title: "Registered agents" },
]

const panelEntry = (id: ControlPlanePanelId): PanelEntry => {
  const entry = PANEL_CATALOG.find(candidate => candidate.id === id)
  if (entry === undefined) throw new Error(`unknown control-plane panel: ${id}`)
  return entry
}

const theme: DockviewTheme = {
  name: "control-plane",
  className: "control-plane-dockview-theme",
  gap: 6,
}

const ClosableTab = (props: IDockviewPanelHeaderProps) => (
  <DockviewDefaultTab {...props} />
)

const addPanel = (
  api: DockviewApi,
  id: ControlPlanePanelId,
  position?: Parameters<DockviewApi["addPanel"]>[0]["position"],
) => {
  const entry = panelEntry(id)
  return api.addPanel({
    id,
    component: id,
    tabComponent: "closable",
    title: entry.title,
    ...(position === undefined ? {} : { position }),
  })
}

export const applyControlPlaneDefaultLayout = (api: DockviewApi): void => {
  const runway = addPanel(api, "runway")
  const agents = addPanel(api, "agents", {
    referencePanel: runway,
    direction: "below",
  })
  const overview = addPanel(api, "overview", {
    referencePanel: runway,
    direction: "right",
  })
  const jobs = addPanel(api, "jobs", {
    referencePanel: overview,
    direction: "below",
  })
  addPanel(api, "backlog", {
    referencePanel: overview,
    direction: "within",
  })

  if (api.width >= 640) {
    const wideColumn = Math.round(api.width * 0.62)
    const narrowColumn = api.width - wideColumn
    runway.api.setSize({ width: wideColumn })
    agents.api.setSize({ width: wideColumn })
    overview.api.setSize({ width: narrowColumn })
    jobs.api.setSize({ width: narrowColumn })
  }
  if (api.height >= 440) {
    const topRow = Math.round(api.height * 0.52)
    const bottomRow = api.height - topRow
    runway.api.setSize({ height: topRow })
    overview.api.setSize({ height: topRow })
    agents.api.setSize({ height: bottomRow })
    jobs.api.setSize({ height: bottomRow })
  }
  runway.api.setActive()
}

const persistLayout = (api: DockviewApi): void => {
  const serialized = Effect.runSync(
    Effect.either(
      Effect.try({
        try: () => api.toJSON(),
        catch: cause => cause,
      }),
    ),
  )
  if (Either.isRight(serialized)) {
    writeControlPlaneDockLayout(serialized.right)
  }
}

const restoreLayout = (api: DockviewApi): boolean => {
  const stored = readControlPlaneDockLayout()
  if (stored.kind !== "valid") return false
  const restored = Effect.runSync(
    Effect.either(
      Effect.try({
        try: () => api.fromJSON(stored.layout),
        catch: cause => cause,
      }),
    ),
  )
  return Either.isRight(restored)
}

const PanelActions = (props: IDockviewHeaderActionsProps) => {
  const closedPanels = () =>
    PANEL_CATALOG.filter(
      panel => props.containerApi.getPanel(panel.id) === undefined,
    )

  const reopen = (id: ControlPlanePanelId) => {
    const active = props.activePanel
    addPanel(
      props.containerApi,
      id,
      active === undefined
        ? undefined
        : { referencePanel: active, direction: "within" },
    )
  }

  const reset = () => {
    clearControlPlaneDockLayout()
    props.containerApi.clear()
    applyControlPlaneDefaultLayout(props.containerApi)
    persistLayout(props.containerApi)
  }

  return (
    <div class="control-plane-dock-actions">
      <details>
        <summary title="Reopen a dashboard panel">+</summary>
        <div class="control-plane-dock-menu">
          <Show
            when={closedPanels().length > 0}
            fallback={<span>All panels open</span>}
          >
            <For each={closedPanels()}>
              {panel => (
                <button type="button" onClick={() => reopen(panel.id)}>
                  {panel.title}
                </button>
              )}
            </For>
          </Show>
        </div>
      </details>
      <button type="button" title="Restore the default layout" onClick={reset}>
        Reset
      </button>
    </div>
  )
}

const EmptyWorkspace = (props: IWatermarkPanelProps) => (
  <div class="control-plane-dock-watermark">
    <p>This workspace is empty. Reopen a panel:</p>
    <div>
      <For each={PANEL_CATALOG}>
        {panel => (
          <button
            type="button"
            onClick={() => addPanel(props.containerApi, panel.id)}
          >
            {panel.title}
          </button>
        )}
      </For>
    </div>
  </div>
)

export interface ControlPlaneDockProps {
  readonly panels: Readonly<Record<ControlPlanePanelId, Component>>
}

export const ControlPlaneDock = (props: ControlPlaneDockProps) => {
  let layoutDisposable: { dispose: () => void } | undefined

  const panelBody = (id: ControlPlanePanelId) => (_: IDockviewPanelProps) => {
    const Panel = props.panels[id]
    return (
      <div class="control-plane-dock-panel-body">
        <Panel />
      </div>
    )
  }

  const components: Record<
    ControlPlanePanelId,
    (props: IDockviewPanelProps) => ReturnType<Component>
  > = {
    overview: panelBody("overview"),
    runway: panelBody("runway"),
    jobs: panelBody("jobs"),
    backlog: panelBody("backlog"),
    agents: panelBody("agents"),
  }

  const onReady = (event: DockviewReadyEvent) => {
    if (!restoreLayout(event.api)) {
      event.api.clear()
      applyControlPlaneDefaultLayout(event.api)
    }
    layoutDisposable?.dispose()
    layoutDisposable = event.api.onDidLayoutChange(() => {
      persistLayout(event.api)
    })
  }

  onCleanup(() => {
    layoutDisposable?.dispose()
  })

  return (
    <section
      class="control-plane-dock-shell"
      aria-label="Control plane workspace"
    >
      <DockviewSolid
        theme={theme}
        components={components}
        tabComponents={{ closable: ClosableTab }}
        rightHeaderActionsComponent={PanelActions}
        watermarkComponent={EmptyWorkspace}
        onReady={onReady}
      />
    </section>
  )
}
