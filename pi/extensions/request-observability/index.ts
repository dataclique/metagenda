import { channel } from "node:diagnostics_channel"
import { homedir } from "node:os"

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"

import {
  installRequestLifecycleLogging,
  requestLifecycleLogPath,
  type RequestLifecycleLoggingFailure,
} from "./core.ts"

const logPath = requestLifecycleLogPath(
  process.env.XDG_STATE_HOME,
  homedir(),
  process.pid,
)

export default function requestObservabilityExtension(pi: ExtensionAPI) {
  const lifecycleChannel = channel("pi.request.lifecycle")
  let loggingFailure: RequestLifecycleLoggingFailure | undefined
  const uninstall = installRequestLifecycleLogging(
    lifecycleChannel,
    logPath,
    failure => {
      loggingFailure = failure
      try {
        process.stderr.write(
          `Request lifecycle logging disabled: ${failure.operation} failed (${failure.code})\n`,
        )
      } catch {
        // The typed failure remains available through /request-log.
      }
    },
  )

  pi.registerCommand("request-log", {
    description: "Show this Pi process's structured request lifecycle log",
    handler: async (_args, ctx) => {
      if (loggingFailure) {
        ctx.ui.notify(
          `Request lifecycle logging disabled: ${loggingFailure.operation} failed (${loggingFailure.code})`,
          "warning",
        )
        return
      }
      ctx.ui.notify(logPath, "info")
    },
  })

  pi.on("session_shutdown", () => uninstall())
}
