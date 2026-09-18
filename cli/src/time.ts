import { DurationInput, millis } from "effect/Duration"
import { Option, Effect } from "effect"
import * as platform from "@effect/platform"
import { cfgFx } from "./cfg"

// TODO: interface Notifier
export const announceFx = (duration: DurationInput, msg: string) => {
  console.clear()
  return withTimeout(duration)(
    Effect.forever(
      Effect.gen(function* (_) {
        const terminal = yield* _(platform.Terminal.Terminal)
        const columns = yield* _(terminal.columns)

        const cfg = yield* cfgFx()
        const delay = millis(cfg.spamDelayMs)
        const separator = " ".repeat(Math.floor(msg.length / 3))
        const perLine = Math.floor(columns / (msg.length + separator.length))
        const pad = Math.floor(
          (columns - perLine * msg.length - (perLine - 1) * separator.length) /
            2,
        )

        yield* _(terminal.display("\n"))
        yield* _(terminal.display(" ".repeat(pad)))

        for (const word of `${msg}${separator}`.repeat(perLine - 1)) {
          yield* _(terminal.display(word))
          yield* Effect.sleep(delay)
        }

        for (const word of msg) {
          yield* _(terminal.display(word))
          yield* Effect.sleep(delay)
        }

        yield* _(terminal.display("\n"))
      }),
    ),
  )
}

export const withTimeout = (duration: DurationInput) =>
  Effect.race(Effect.sleep(duration))

export const fmtTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

export const fmtDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export const today = () => fmtDate(new Date())

export const resolveDay = (dayOpt: Option.Option<string>) =>
  Option.match(dayOpt, {
    onNone: () => today(),
    onSome: (day: string) => day,
  })
