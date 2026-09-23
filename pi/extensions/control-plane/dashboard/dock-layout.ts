import type { SerializedDockview } from "@arminmajerie/dockview-solid"
import * as Effect from "effect/Effect"

export const CONTROL_PLANE_PANEL_IDS = [
  "overview",
  "runway",
  "jobs",
  "backlog",
  "agents",
] as const

export type ControlPlanePanelId = (typeof CONTROL_PLANE_PANEL_IDS)[number]

export type DockLayoutRead =
  | { readonly kind: "missing" }
  | { readonly kind: "valid"; readonly layout: SerializedDockview }
  | {
      readonly kind: "invalid"
      readonly reason: "oversized" | "malformed" | "unknown_panel"
    }
  | { readonly kind: "unavailable" }

export interface DockLayoutStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
  readonly removeItem: (key: string) => void
}

const DOCK_LAYOUT_STORAGE_KEY = "pi-control-plane-dock-layout-v1"
const MAX_DOCK_LAYOUT_BYTES = 512 * 1024

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isPanelId = (value: unknown): value is ControlPlanePanelId =>
  typeof value === "string" &&
  CONTROL_PLANE_PANEL_IDS.some(panelId => panelId === value)

const storedPanelIds = (
  value: unknown,
): readonly ControlPlanePanelId[] | undefined => {
  if (!isRecord(value) || !isRecord(value.panels) || !isRecord(value.grid)) {
    return undefined
  }

  const entries = Object.entries(value.panels)
  if (
    !entries.every(
      ([key, panel]) =>
        isPanelId(key) &&
        isRecord(panel) &&
        panel.id === key &&
        panel.contentComponent === key,
    )
  ) {
    return undefined
  }

  return entries.map(([key]) => key).filter(isPanelId)
}

const isCatalogBoundedLayout = (value: unknown): value is SerializedDockview =>
  storedPanelIds(value) !== undefined

const readStorage = <Value>(operation: () => Value): Value | undefined =>
  Effect.runSync(
    Effect.try({
      try: operation,
      catch: () => undefined,
    }).pipe(Effect.catchAll(() => Effect.succeed(undefined))),
  )

const browserStorage = (): DockLayoutStorage | undefined => {
  const storage = globalThis.localStorage
  return storage === undefined ? undefined : storage
}

export const readControlPlaneDockLayout = (
  storage = browserStorage(),
): DockLayoutRead => {
  if (storage === undefined) return { kind: "unavailable" }
  const raw = readStorage(() => storage.getItem(DOCK_LAYOUT_STORAGE_KEY))
  if (raw === undefined) return { kind: "unavailable" }
  if (raw === null) return { kind: "missing" }
  if (new TextEncoder().encode(raw).byteLength > MAX_DOCK_LAYOUT_BYTES) {
    return { kind: "invalid", reason: "oversized" }
  }

  const parsed = readStorage<unknown>(() => JSON.parse(raw))
  if (parsed === undefined || !isRecord(parsed)) {
    return { kind: "invalid", reason: "malformed" }
  }
  if (!isCatalogBoundedLayout(parsed)) {
    const panels = isRecord(parsed.panels) ? Object.keys(parsed.panels) : []
    return {
      kind: "invalid",
      reason: panels.some(panel => !isPanelId(panel))
        ? "unknown_panel"
        : "malformed",
    }
  }

  return { kind: "valid", layout: parsed }
}

export const writeControlPlaneDockLayout = (
  layout: SerializedDockview,
  storage = browserStorage(),
): boolean => {
  if (storage === undefined || !isCatalogBoundedLayout(layout)) return false
  const serialized = readStorage(() => JSON.stringify(layout))
  if (
    serialized === undefined ||
    new TextEncoder().encode(serialized).byteLength > MAX_DOCK_LAYOUT_BYTES
  ) {
    return false
  }
  return (
    readStorage(() => {
      storage.setItem(DOCK_LAYOUT_STORAGE_KEY, serialized)
      return true
    }) ?? false
  )
}

export const clearControlPlaneDockLayout = (
  storage = browserStorage(),
): boolean =>
  storage !== undefined &&
  (readStorage(() => {
    storage.removeItem(DOCK_LAYOUT_STORAGE_KEY)
    return true
  }) ??
    false)
