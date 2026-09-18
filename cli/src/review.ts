import * as platform from "@effect/platform"
import { Effect, Option, Duration, Match } from "effect"

import { cfgFx } from "./cfg"
import { $, std, sh } from "./sys"
import { playbackFx } from "./cast"
import { announceFx } from "./time"
import { LineOfWork, Todo } from "./todo"
import { Fromd, updMdFx } from "./md"

// TODO: interface ProgressChecker
const completionPromptFx = (task: string) =>
    Effect.gen(function* (_) {
        const { display, readInput } = yield* _(platform.Terminal.Terminal)
        console.clear()
        yield* _(display(task))
        const inputs = yield* _(readInput)

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
            yield* _(display("\nHas the task been completed? [y/n] "))
            const { input: answer } = yield* _(inputs.take)
            yield* _(display("\n"))

            if (Option.contains("y")(answer)) return true
            if (Option.contains("n")(answer)) return false
        }
    }).pipe(Effect.scoped)

export const planFx = (lineOfWork: LineOfWork) =>
    Effect.gen(function* () {
        // yield* obsidianFx(`backlog/${lineOfWork.project}`)
        const cfg = yield* cfgFx()

        yield* playbackFx(lineOfWork, cfg.planPlaybackSpeed)
    }).pipe(Effect.withSpan(`plan #${lineOfWork}`))

// TODO: replace crazy if statements with dependency injection
export const journalFx = (todo: Todo, fromd?: Fromd) =>
    Effect.gen(function* (_) {
        const cfg = yield* cfgFx()

        if (!fromd) {
            if (todo.action === ("hack" as const) && todo.lineOfWork)
                yield* playbackFx(todo.lineOfWork, cfg.journalPlaybackSpeed)

            console.clear()
            const { display, readInput } = yield* _(platform.Terminal.Terminal)
            yield* _(display("Press any key to continue..."))
            yield* _(readInput.pipe(
                Effect.flatMap(inputs => inputs.take),
                Effect.scoped,
            ))

            return
        }

        const done = yield* completionPromptFx(fromd.raw)
        const progress = Match.value({ before: todo.progress, done }).pipe(
            Match.when({ done: true }, () => "done" as const),
            Match.when({ before: "done" }, () => "doing" as const),
            Match.when({ before: "doing" }, () => "overrun" as const),
            Match.when({ before: "todo" }, () => "doing" as const),
            Match.when({ before: "overrun" }, () => "overrun" as const),
            Match.exhaustive,
        )

        yield* updMdFx({ ...todo, progress, fromd })

        const date = new Date()
        const msg = date.toISOString()
        yield* $(`git -C ${cfg.vaultPath} add .`).pipe(std)
        yield* $(`git -C ${cfg.vaultPath} commit -m ${msg}`).pipe(std)

        if (todo.action === ("hack" as const)) {
            if (progress === "done") {
                // TODO: this should either use Project as the key or have a way
                // of loading values from less qualified configs if no exact
                // matches were found for the full line of work path
                if (todo.lineOfWork && cfg[todo.lineOfWork].repoPath) {
                    const repoPath = cfg[todo.lineOfWork].repoPath

                    console.clear()
                    yield* $(`git -C ${repoPath} add .`).pipe(std)
                    yield* $(`git -C ${repoPath} commit`).pipe(std)
                    yield* $(`git -C ${repoPath} show HEAD`).pipe(std)
                }

                if (cfg.obsEnabled) {
                    yield* announceFx(
                        Duration.seconds(cfg.spamSecs),
                        `Get ready to film a review of '${todo.description}'`,
                    )
                    yield* sh("obs-cmd recording start")
                }

                yield* playbackFx(todo.lineOfWork, cfg.journalPlaybackSpeed)

                if (cfg.obsEnabled) {
                    yield* announceFx(
                        Duration.seconds(cfg.spamSecs),
                        "OBS is about to stop recording",
                    )
                    yield* sh("obs-cmd recording stop")
                }
            } else {
                yield* playbackFx(todo.lineOfWork, cfg.journalPlaybackSpeed * 4)
            }
        }

        // yield* $(`${__dirname}/../magit.sh ${repoPath}`).pipe(std)
    }).pipe(Effect.withSpan(todo.description))

export const obsRecStartFx = sh("obs-cmd recording start")
export const obsRecStoptFx = sh("obs-cmd recording stop")
