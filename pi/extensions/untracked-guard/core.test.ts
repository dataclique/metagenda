import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(new URL("./core.ts", import.meta.url), "utf8")
const mod = await import("./core.ts")

test("parses porcelain status lines into dirty paths", () => {
  const lines = [
    "?? pi/extensions/untracked-guard/",
    " M pi/extensions/todo/state.ts",
    "A  eslint.config.mjs",
  ]
  const paths = mod.parseStatusLines(lines)
  assert.deepEqual(paths, [
    "pi/extensions/untracked-guard/",
    "pi/extensions/todo/state.ts",
    "eslint.config.mjs",
  ])
})

test("empty status yields no paths", () => {
  assert.deepEqual(mod.parseStatusLines([]), [])
  assert.deepEqual(mod.parseStatusLines([""]), [])
})

test("rename entries resolve to the current path after the arrow", () => {
  const paths = mod.parseStatusLines(["R  old/name.ts -> new/name.ts"])
  assert.deepEqual(paths, ["new/name.ts"])
})

test("quoted porcelain paths are unwrapped", () => {
  const paths = mod.parseStatusLines(['?? "src/quoted name.ts"'])
  assert.deepEqual(paths, ["src/quoted name.ts"])
})

test("arrow inside an untracked filename is not a rename separator", () => {
  const paths = mod.parseStatusLines(['?? "docs/one -> two"'])
  assert.deepEqual(paths, ["docs/one -> two"])
})

test("first-seen entries are created for new paths and dropped for gone paths", () => {
  const now = Date.now()
  const firstSeen = new Map([["old.ts", now - 1_000_000]])
  const next = mod.trackFirstSeen(["new.ts"], firstSeen, now)
  assert.equal(next.get("new.ts"), now)
  assert.equal(next.has("old.ts"), false)
})

test("oldest path age is measured from first-seen timestamp", () => {
  const now = Date.now()
  const firstSeen = new Map([
    ["a.ts", now - 20 * 60_000],
    ["b.ts", now - 5 * 60_000],
  ])
  const report = mod.accumulate(["a.ts", "b.ts"], firstSeen, now)
  assert.equal(report.count, 2)
  assert.equal(report.oldestPath, "a.ts")
  assert.equal(report.oldestAgeMinutes, 20)
})

test("fifteen-minute rule violation lists violating paths", () => {
  const now = Date.now()
  const firstSeen = new Map([
    ["fresh.ts", now - 3 * 60_000],
    ["stale.ts", now - 16 * 60_000],
    ["ancient.ts", now - 120 * 60_000],
  ])
  const report = mod.accumulate(
    ["fresh.ts", "stale.ts", "ancient.ts"],
    firstSeen,
    now,
  )
  assert.deepEqual(report.violating, ["ancient.ts", "stale.ts"])
  assert.equal(report.violated, true)
})

test("no violation at or under fifteen minutes", () => {
  const now = Date.now()
  const firstSeen = new Map([["ok.ts", now - 15 * 60_000]])
  const report = mod.accumulate(["ok.ts"], firstSeen, now)
  assert.equal(report.violating.length, 0)
  assert.equal(report.violated, false)
})

test("status label is stable for clean state", () => {
  assert.equal(
    mod.formatStatusLabel({
      count: 0,
      oldestPath: null,
      oldestAgeMinutes: 0,
      violating: [],
      violated: false,
    }),
    "untracked-guard: clean",
  )
})

test("status label reports count, oldest age, and rule violation", () => {
  const label = mod.formatStatusLabel({
    count: 3,
    oldestPath: "ancient.ts",
    oldestAgeMinutes: 120,
    violating: ["stale.ts", "ancient.ts"],
    violated: true,
  })
  assert.match(label, /3 uncommitted/)
  assert.match(label, /oldest 120m/)
  assert.match(label, /15-MIN RULE VIOLATED/)
})

test("write gate opens only when the rule is violated", () => {
  const clean = {
    count: 2,
    oldestPath: "a.ts",
    oldestAgeMinutes: 4,
    violating: [],
    violated: false,
  }
  assert.equal(mod.shouldBlockWrite(clean), false)
  const dirty = { ...clean, violating: ["a.ts"], violated: true }
  assert.equal(mod.shouldBlockWrite(dirty), true)
})

test("blocked reason names the rule and bounded violating paths", () => {
  const reason = mod.blockedReason({
    count: 3,
    oldestPath: "ancient.ts",
    oldestAgeMinutes: 120,
    violating: ["stale.ts", "ancient.ts"],
    violated: true,
  })
  assert.match(reason, /15-minute/)
  assert.match(reason, /stale\.ts/)
  assert.match(reason, /ancient\.ts/)
})

test("wiring uses plain git status with no worktree-manager handling", () => {
  assert.match(source, /"git", "status", "--porcelain"/)
  assert.doesNotMatch(source, /gitbutler|but status/i)
})

test("wiring polls on an interval with env override and cleans up", () => {
  assert.match(source, /PI_UNTRACKED_GUARD_INTERVAL_MS/)
  assert.match(source, /setInterval/)
  assert.match(source, /clearInterval/)
  assert.match(source, /session_shutdown/)
})

test("interval resolution rejects non-finite and non-positive values", () => {
  assert.equal(mod.resolveInterval(Number("abc")), 60_000)
  assert.equal(mod.resolveInterval(Number("Infinity")), 60_000)
  assert.equal(mod.resolveInterval(0), 60_000)
  assert.equal(mod.resolveInterval(-5), 60_000)
  assert.equal(mod.resolveInterval(120_000), 120_000)
})

test("wiring blocks write-class tool calls when violated and passes otherwise", () => {
  assert.match(source, /tool_call/)
  assert.match(source, /block: true/)
  assert.match(source, /"write"|"edit"/)
})

test("wiring reports via status without model turns", () => {
  assert.match(source, /setStatus/)
  assert.doesNotMatch(source, /sendMessage|triggerTurn|sendUserMessage/)
})
