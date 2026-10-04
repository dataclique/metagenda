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

const unquote = (path: DirtyPath): DirtyPath =>
  path.startsWith('"') && path.endsWith('"') && path.length >= 2
    ? path.slice(1, -1)
    : path

const isRenameCode = (code: string): boolean =>
  code.includes("R") || code.includes("C")

export const parseStatusLines = (
  lines: ReadonlyArray<string>,
): Array<DirtyPath> =>
  lines
    .filter(line => line.trim().length > 0)
    .map(line => {
      const code = line.slice(0, 2)
      const entry = line.slice(3)
      const arrow = isRenameCode(code) ? entry.indexOf(" -> ") : -1
      const current = arrow === -1 ? entry : entry.slice(arrow + 4)
      return unquote(current)
    })

export const resolveInterval = (raw: number): number =>
  Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_INTERVAL_MS

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
  let pollInFlight = false
  let shutdown = false

  const observe = (ctx: ExtensionContext): void => {
    if (pollInFlight) return
    pollInFlight = true
    void (async () => {
      try {
        const proc = Bun.spawn(["git", "status", "--porcelain"], {
          stdout: "pipe",
          stderr: "pipe",
        })
        const output = await new Response(proc.stdout).text()
        const exitCode = await proc.exited
        if (exitCode !== 0 || shutdown) {
          if (!shutdown)
            ctx.ui.setStatus(STATUS_KEY, "untracked-guard: status unavailable")
          return
        }
        const paths = parseStatusLines(output.split("\n"))
        const now = Date.now()
        const firstSeen = trackFirstSeen(paths, state.firstSeen, now)
        const report = accumulate(paths, firstSeen, now)
        state = { report, firstSeen }
        ctx.ui.setStatus(STATUS_KEY, formatStatusLabel(report))
      } catch {
        if (!shutdown)
          ctx.ui.setStatus(STATUS_KEY, "untracked-guard: status unavailable")
      } finally {
        pollInFlight = false
      }
    })()
  }

  pi.on("session_start", (_event, ctx) => {
    if (timer) clearInterval(timer)
    const raw = Number(process.env.PI_UNTRACKED_GUARD_INTERVAL_MS)
    const interval = resolveInterval(raw)
    timer = setInterval(() => observe(ctx), interval)
    timer.unref?.()
    observe(ctx)
  })

  pi.on("session_shutdown", (_event, ctx) => {
    shutdown = true
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
