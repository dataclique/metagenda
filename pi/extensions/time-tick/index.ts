import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent"

const STATUS_KEY = "time-tick"
const DEFAULT_INTERVAL_MS = 5 * 60 * 1_000

const formatDuration = (milliseconds: number): string => {
  const totalMinutes = Math.floor(milliseconds / 60_000)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  return `${hours}h${totalMinutes % 60 ? ` ${totalMinutes % 60}m` : ""}`
}

const sessionTick: (pi: ExtensionAPI) => void = pi => {
  let sessionStartedAt = Date.now()
  let lastUserInputAt = Date.now()
  let tickTimer: ReturnType<typeof setInterval> | undefined

  const updateStatus = (ctx: ExtensionContext): void => {
    const now = Date.now()
    const elapsed = formatDuration(now - sessionStartedAt)
    const idle = formatDuration(now - lastUserInputAt)
    ctx.ui.setStatus(
      STATUS_KEY,
      `session ${elapsed}${idle !== "0m" ? ` · idle ${idle}` : ""}`,
    )
  }

  pi.on("input", event => {
    if (event.source !== "extension") lastUserInputAt = Date.now()
  })

  pi.on("session_start", (_event, ctx) => {
    sessionStartedAt = Date.now()
    lastUserInputAt = Date.now()
    if (tickTimer) clearInterval(tickTimer)
    const interval =
      Number(process.env.PI_TIME_TICK_INTERVAL_MS) > 0
        ? Number(process.env.PI_TIME_TICK_INTERVAL_MS)
        : DEFAULT_INTERVAL_MS
    tickTimer = setInterval(() => updateStatus(ctx), interval)
    tickTimer.unref?.()
    updateStatus(ctx)
  })

  pi.on("session_shutdown", (_event, ctx) => {
    if (tickTimer) clearInterval(tickTimer)
    tickTimer = undefined
    ctx.ui.setStatus(STATUS_KEY, undefined)
  })
}

export default sessionTick
