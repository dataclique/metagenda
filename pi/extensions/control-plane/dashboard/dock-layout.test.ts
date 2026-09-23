import assert from "node:assert/strict"
import test from "node:test"
import type { SerializedDockview } from "@arminmajerie/dockview-solid"
import {
  clearControlPlaneDockLayout,
  CONTROL_PLANE_PANEL_IDS,
  readControlPlaneDockLayout,
  type DockLayoutStorage,
  writeControlPlaneDockLayout,
} from "./dock-layout.ts"

const STORAGE_KEY = "pi-control-plane-dock-layout-v1"

const layoutFixture = (): SerializedDockview => ({
  grid: {
    root: {
      type: "leaf",
      data: {
        id: "group-1",
        views: ["overview"],
        activeView: "overview",
      },
      size: 1,
      visible: true,
    },
    width: 1200,
    height: 800,
    orientation: "HORIZONTAL",
  },
  panels: {
    overview: {
      id: "overview",
      contentComponent: "overview",
      title: "Overview",
    },
  },
  activeGroup: "group-1",
})

const memoryStorage = (initial?: string): DockLayoutStorage => {
  const values = new Map<string, string>()
  if (initial !== undefined) values.set(STORAGE_KEY, initial)
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => {
      values.delete(key)
    },
  }
}

test("dock layout catalog is the complete fixed control-plane surface", () => {
  assert.deepEqual(CONTROL_PLANE_PANEL_IDS, [
    "overview",
    "runway",
    "jobs",
    "backlog",
    "agents",
  ])
})

test("dock layout round-trips one bounded catalog-only layout", () => {
  const storage = memoryStorage()
  const layout = layoutFixture()
  assert.equal(writeControlPlaneDockLayout(layout, storage), true)
  assert.deepEqual(readControlPlaneDockLayout(storage), {
    kind: "valid",
    layout,
  })
  assert.equal(clearControlPlaneDockLayout(storage), true)
  assert.deepEqual(readControlPlaneDockLayout(storage), { kind: "missing" })
})

test("dock layout rejects malformed and unknown persisted panels", () => {
  assert.deepEqual(readControlPlaneDockLayout(memoryStorage("not-json")), {
    kind: "invalid",
    reason: "malformed",
  })
  assert.deepEqual(
    readControlPlaneDockLayout(
      memoryStorage(
        JSON.stringify({
          grid: {},
          panels: {
            admin: { id: "admin", contentComponent: "admin" },
          },
        }),
      ),
    ),
    { kind: "invalid", reason: "unknown_panel" },
  )
})

test("dock layout rejects oversized state and fails closed on storage errors", () => {
  const oversized = JSON.stringify({
    grid: {},
    panels: {},
    padding: "x".repeat(512 * 1024),
  })
  assert.deepEqual(readControlPlaneDockLayout(memoryStorage(oversized)), {
    kind: "invalid",
    reason: "oversized",
  })
  const unavailable: DockLayoutStorage = {
    getItem: () => {
      throw new Error("storage disabled")
    },
    setItem: () => {
      throw new Error("storage disabled")
    },
    removeItem: () => {
      throw new Error("storage disabled")
    },
  }
  assert.deepEqual(readControlPlaneDockLayout(unavailable), {
    kind: "unavailable",
  })
  assert.equal(writeControlPlaneDockLayout(layoutFixture(), unavailable), false)
  assert.equal(clearControlPlaneDockLayout(unavailable), false)
})
