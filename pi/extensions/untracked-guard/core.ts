import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent"

export type DirtyPath = string

export type StatusLine = string

export interface AccumulationReport {
  readonly count: number
  readonly oldestPath: DirtyPath | null
  readonly oldestAgeMinutes: number
  readonly violating: ReadonlyArray<DirtyPath>
  readonly violated: boolean
}

export const FIFTEEN_MINUTES_MS = 15 * 60_000
const DEFAULT_INTERVAL_MS = 60_000
const STATUS_KEY = "untracked-guard"
const WRITE_TOOLS: ReadonlySet<string> = new Set(["write", "edit"])
const VIOLATING_PATHS_LIMIT = 5

export const parseStatusLines = (
  lines: ReadonlyArray<string>,
): Array<DirtyPath> =>
  lines.filter(line => line.trim().length > 0).map(line => line.slice(3))

export const trackFirstSeen = (
  paths: ReadonlyArray<DirtyPath>,
  previous: ReadonlyMap<DirtyPath, number>,
  now: number,
): Map<DirtyPath, number> => {
  const next = new Map<DirtyPath, number>()
  for (const path of paths) next.set(path, previous.get(path) ?? now)
  return next
}

export const accumulate = (
  paths: ReadonlyArray<DirtyPath>,
  firstSeen: ReadonlyMap<DirtyPath, number>,
  now: number,
): AccumulationReport => {
  const entries = paths
    .map(path => ({ path, startedAt: firstSeen.get(path) ?? now }))
    .sort((left, right) => left.startedAt - right.startedAt)
  const oldest = entries[0]
  const violating = entries
    .filter(({ startedAt }) => now - startedAt > FIFTEEN_MINUTES_MS)
    .map(({ path }) => path)
  return {
    count: entries.length,
    oldestPath: oldest?.path ?? null,
    oldestAgeMinutes: oldest
      ? Math.floor((now - oldest.startedAt) / 60_000)
      : 0,
    violating,
    violated: violating.length > 0,
  }
}

export const formatStatusLabel = (report: AccumulationReport): StatusLine => {
  if (report.count === 0) return `${STATUS_KEY}: clean`
  const base = `${STATUS_KEY}: ${report.count} uncommitted, oldest ${report.oldestAgeMinutes}m`
  return report.violated
    ? `${base} — 15-MIN RULE VIOLATED (${report.violating.length})`
    : base
}

export const shouldBlockWrite = (report: AccumulationReport): boolean =>
  report.violated

export const blockedReason = (report: AccumulationReport): string => {
  const listed = report.violating.slice(0, VIOLATING_PATHS_LIMIT).join(", ")
  const omitted = report.violating.length - VIOLATING_PATHS_LIMIT
  const suffix = omitted > 0 ? `, +${omitted} more` : ""
  return `15-minute work limit exceeded for uncommitted additions: ${listed}${suffix}. Commit or clean these paths before further file writes.`
}

interface GuardState {
  report: AccumulationReport
  firstSeen: ReadonlyMap<DirtyPath, number>
}

const runGuard: (pi: ExtensionAPI) => void = pi => {
  let state: GuardState = {
    report: {
      count: 0,
      oldestPath: null,
      oldestAgeMinutes: 0,
      violating: [],
      violated: false,
    },
    firstSeen: new Map(),
  }

  let timer: ReturnType<typeof setInterval> | undefined

  const observe = (ctx: ExtensionContext): void => {
    void (async () => {
      const proc = Bun.spawn(["git", "status", "--porcelain"], {
        stdout: "pipe",
        stderr: "pipe",
      })
      const output = await new Response(proc.stdout).text()
      const exitCode = await proc.exited
      if (exitCode !== 0) {
        ctx.ui.setStatus(STATUS_KEY, "untracked-guard: status unavailable")
        return
      }
      const paths = parseStatusLines(output.split("\n"))
      const now = Date.now()
      const firstSeen = trackFirstSeen(paths, state.firstSeen, now)
      const report = accumulate(paths, firstSeen, now)
      state = { report, firstSeen }
      ctx.ui.setStatus(STATUS_KEY, formatStatusLabel(report))
    })()
  }

  pi.on("session_start", (_event, ctx) => {
    if (timer) clearInterval(timer)
    const raw = Number(process.env.PI_UNTRACKED_GUARD_INTERVAL_MS)
    const interval = raw > 0 ? raw : DEFAULT_INTERVAL_MS
    timer = setInterval(() => observe(ctx), interval)
    timer.unref?.()
    observe(ctx)
  })

  pi.on("session_shutdown", (_event, ctx) => {
    if (timer) clearInterval(timer)
    timer = undefined
    ctx.ui.setStatus(STATUS_KEY, undefined)
  })

  pi.on("tool_call", event => {
    if (!WRITE_TOOLS.has(event.toolName)) return undefined
    if (!shouldBlockWrite(state.report)) return undefined
    return { block: true, reason: blockedReason(state.report) }
  })
}

export default runGuard
