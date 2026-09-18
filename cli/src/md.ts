import * as platform from "@effect/platform"
import { Effect, Option, Duration, Match } from "effect"
import YAML from "yaml"
import * as cli from "@effect/cli"
import * as fs from "fs"

import { Cfg, DurationSetting, Project, cfgFx } from "./cfg"
import { announceFx, today } from "./time"
import { sh } from "./sys"
import { zessionFx } from "./cast"
import { journalFx, planFx } from "./review"
import { Action, LineOfWork, Priority, Todo, urgency } from "./todo"

export interface MdTag {
    readonly tag: string
    readonly subtags?: string[]
}

export interface MdTodo extends Todo {
    readonly fromd: Fromd
    readonly subtasks?: MdTodo[]
    readonly startTime?: Date
    readonly endTime?: Date
}

export interface Fromd {
    readonly lineNum: number
    readonly raw: string
    readonly path: string
    readonly depth: number
    readonly tags?: MdTag[]
    readonly dataview: Record<string, string>
}

export const loadFileAttrs = (path: string): Record<string, string> => {
    const lines = fs.readFileSync(path, "utf8").split("\n")

    if (lines.length === 0) return {}

    if (lines[0] !== "---") return {}
    const frontMatterEnd = lines.indexOf("---", 1)
    const frontMatter = lines.slice(1, frontMatterEnd).join("\n")

    const parsed = YAML.parse(frontMatter, { strict: false }) as unknown
    if (parsed && typeof parsed === "object")
        return parsed as Record<string, string>
    else {
        console.error(`Failed to parse front matter in ${path}`)
        return {}
    }
}

export const todoRegex = /^\s*- \[.\] /g
const timeRegex = /(?<hours>\d{2}):(?<minutes>\d{2})/g
export const tagRegex = /\s#(?<tag>[a-zA-Z0-9\-_/]+)/g
const dataviewRegex = /\[(?<name>\w+):: (?<value>[a-zA-Z0-9.\-_]+)\],?/g

export const fromRaw = (
    cfg: Cfg,
    raw: string,
    lineNum: number,
    path: string,
): MdTodo => {
    const line = raw.trimStart()
    const depth = raw.length - line.length

    const matches = [...line.matchAll(tagRegex)]
    const tags: MdTag[] = matches
        .map(({ groups }) => groups!.tag.split("/"))
        .map(([tag, ...subtags]) => ({ tag, subtags }))

    const dataview = [...line.matchAll(dataviewRegex)]
        .map(({ groups }) => ({
            [groups!.name]: groups!.value,
        }))
        .reduce((acc, obj) => ({ ...acc, ...obj }), {})

    const firstTag = tags.length ? tags[0] : undefined
    const fileAttrs: Record<string, string> = loadFileAttrs(path)
    const project =
        "project" in fileAttrs
            ? Project(fileAttrs.project)
            : firstTag
              ? Project(firstTag.tag)
              : undefined

    const qualifier = firstTag?.subtags ?? []
    const lineOfWork = project
        ? LineOfWork(
              [
                  project,
                  ...(firstTag && firstTag.tag !== project
                      ? [firstTag.tag]
                      : []),
                  ...qualifier,
              ].join("/"),
          )
        : undefined

    const action = Action(line)

    const fromd: Fromd = {
        lineNum,
        raw,
        path,
        depth,
        dataview,
    }

    const check = line.match(todoRegex)
    const progress =
        check![0] === "- [!] "
            ? "overrun"
            : check![0] === "- [x] "
              ? "done"
              : check![0] === "- [/] "
                ? "doing"
                : "todo"

    let startTime, endTime: Date | undefined
    if (line.match(timeRegex)) {
        const timeFmt = "HH:mm "
        const timeWindowFmt = "HH:mm - HH:mm "
        const startTimeSlice = line.slice(
            check![0].length,
            check![0].length + timeFmt.length,
        )
        const startHours = Number(startTimeSlice.slice(0, 2))
        const startMinutes = Number(startTimeSlice.slice(3, 5))
        startTime = new Date(`${today()} ${startHours}:${startMinutes}`)

        const endTimeSlice = line.slice(
            check![0].length + timeFmt.length + "- ".length,
            check![0].length + timeWindowFmt.length,
        )
        const endHours = Number(endTimeSlice.slice(0, 2))
        const endMinutes = Number(endTimeSlice.slice(3, 5))
        endTime = new Date(`${today()} ${endHours}:${endMinutes}`)
    }

    const description = line
        .replace(todoRegex, "")
        .replace(dataviewRegex, "")
        .replace(tagRegex, "")
        .trim()

    const priority = Priority(dataview.priority)

    const dvDuration = DurationSetting({ ...dataview })

    const todo: MdTodo = {
        action,
        lineOfWork,
        description,
        startTime,
        endTime,
        priority,
        progress,
        fromd,
        duration:
            startTime && endTime
                ? Duration.decode(endTime.getTime() - startTime.getTime())
                : action
                  ? dvDuration ?? DurationSetting(cfg[action])
                  : dvDuration,
    }

    return todo
}

export const taskMd = (todo: Todo & { fromd: Omit<Fromd, "raw"> }) => {
    const indent = " ".repeat(todo.fromd.depth)
    const prefix = Match.value(todo.progress).pipe(
        Match.when("done", () => "- [x] "),
        Match.when("overrun", () => "- [!] "),
        Match.when("doing", () => "- [/] "),
        Match.when("todo", () => "- [ ] "),
        Match.exhaustive,
    )

    const dataview = Object.entries(todo.fromd.dataview)
        .map(([name, value]) => `[${name}:: ${value}]`)
        .join(" ")

    return `${indent}${prefix}${todo.description} #${todo.lineOfWork} ${dataview}`.trimEnd()
}

export const updMd = (todo: MdTodo) => {
    const { fromd } = todo
    const fileBefore = fs.readFileSync(fromd.path, "utf8")
    const fileAfter = fileBefore
        .split("\n")
        .map((line, index) =>
            index + 1 === fromd.lineNum ? taskMd(todo) : line,
        )
        .join("\n")
    return { fileBefore, fileAfter }
}

export const updMdFx = (todo: MdTodo) =>
    Effect.sync(() => {
        const { fromd } = todo
        const { fileAfter } = updMd(todo)
        fs.writeFileSync(fromd.path, fileAfter, "utf8")
    })

export const fileTodosFx = (path: string) =>
    Effect.gen(function* () {
        const cfg = yield* cfgFx()
        const lines = fs.readFileSync(path, "utf8").split("\n")

        if (lines.length === 0) return [] as MdTodo[]

        const inherit = (
            { subtasks, lineOfWork, ...dataview }: MdTodo,
            parent: MdTodo,
        ): MdTodo => {
            const duration = DurationSetting(dataview) ?? parent.duration

            const todo: MdTodo = {
                ...dataview,
                lineOfWork: lineOfWork ?? parent.lineOfWork,
                subtasks: [],
                duration,
            }

            return {
                ...todo,
                subtasks: subtasks?.map(sub => inherit(sub, todo)),
            }
        }

        const vaultodos = lines
            .map(
                (line, index) =>
                    [index + 1, line] as [index: number, line: string],
            )
            .filter(([, line]) => line.trim().match(todoRegex))
            .map(([lineNum, raw]) => fromRaw(cfg, raw, lineNum, path))
            .filter(({ action, lineOfWork }) => action ?? lineOfWork)
            .reduce<MdTodo[]>((grouped, todo) => {
                if (todo.fromd.depth === 0) return [...grouped, todo]
                else if (grouped.length === 0) {
                    console.warn(
                        `${JSON.stringify(todo)} has depth != 0 but no parent found`,
                    )
                    return grouped
                } else {
                    const prev = grouped.pop()!
                    const parent: MdTodo = {
                        ...prev,
                        subtasks: !prev.subtasks
                            ? [todo]
                            : [...prev.subtasks, todo],
                    }
                    grouped.push(parent)
                    return grouped
                }
            }, [])
            .map(({ subtasks, ...todo }) => ({
                ...todo,
                subtasks: subtasks?.map(sub => inherit(sub, todo)),
            }))
            .sort((a, b) => {
                if (
                    !a.priority &&
                    !b.priority &&
                    a.fromd.lineNum &&
                    b.fromd.lineNum
                )
                    return a.fromd.lineNum - b.fromd.lineNum

                return urgency(b.priority) - urgency(a.priority)
            })

        return vaultodos
    })

export const vaultodosFx = (filter?: (todo: MdTodo) => boolean) =>
    Effect.gen(function* () {
        if (process.title.includes("vitest")) {
            const paths = [`${__dirname}/../test/backlog.md`]
            const tasks: MdTodo[][] = yield* Effect.all(paths.map(fileTodosFx))
            return tasks.flat().filter(filter ?? (() => true))
        }

        const { vaultPath } = yield* cfgFx()

        const out = yield* sh(`git -C ${vaultPath} ls-files`)
        const paths = out
            .filter(_ => !_.startsWith("archive"))
            .filter(line => line.endsWith(".md"))

        const tasks: MdTodo[][] = yield* Effect.all(
            paths.map(line => `${vaultPath}/${line}`).map(fileTodosFx),
        )

        return tasks.flat().filter(filter ?? (() => true))
    })

export const exeFx =
    (dryRun = false) =>
    <Args extends unknown[], Ok, Err, Req>(
        fx: (...args: Args) => Effect.Effect<Ok, Err, Req>,
    ) =>
    (...args: Args) =>
        dryRun
            ? Effect.sync(() => {
                  console.log(
                      `\n${fx.name}`,
                      ...args.map(arg => JSON.stringify(arg, null, 2)),
                  )
              })
            : fx(...args)

export const flattenTodo = ({
    subtasks,
    ...todo
}: MdTodo): Omit<MdTodo, "subtasks">[] =>
    !subtasks ? [todo] : [...subtasks.flatMap(flattenTodo), todo]

export const doFx = (todo: Todo, fromd?: Fromd) =>
    Effect.gen(function* () {
        const { lineOfWork } = todo
        const cfg = yield* cfgFx()
        const exe = exeFx(todo.dryRun)

        if (todo.action === ("afk" as const)) {
            const duration = todo.duration ?? DurationSetting(cfg.afk)

            if (!duration) {
                console.error(
                    "No duration found for",
                    JSON.stringify(todo, null, 2),
                )
                return
            }

            yield* exe(announceFx)(duration, todo.description.toUpperCase())
            const clearFx = () =>
                Effect.sync(() => {
                    console.clear()
                })
            yield* exe(clearFx)()
            yield* exe(journalFx)(todo, fromd)
        } else if (lineOfWork && todo.action === ("hack" as const)) {
            const duration = todo.duration ?? DurationSetting(cfg.hack)

            if (!duration) {
                console.error(
                    "No duration found for",
                    JSON.stringify(todo, null, 2),
                )
                return
            }

            yield* exe(announceFx)(
                Duration.seconds(cfg.spamSecs),
                fromd?.raw ?? todo.description,
            )
            yield* exe(planFx)(lineOfWork)
            yield* exe(zessionFx)(lineOfWork, duration)
            yield* exe(journalFx)(todo, fromd)
        }
    }).pipe(Effect.withSpan(todo.description, { attributes: { ...todo } }))

export const planCli = cli.Command.make(
    "plan",
    { lineOfWork: cli.Args.text({ name: "lineOfWork" }) },
    ({ lineOfWork }) => planFx(LineOfWork(lineOfWork)),
)

export const upgradeCli = cli.Command.make("upgrade", {}, () => upgradeFx)
const upgradeFx = Effect.gen(function* () {
    yield* Effect.sync(() => {
        console.error("unimplemented")
    })
    // const piped = (cmd: string) => platform.Command.pipeTo($(cmd))
    // yield* pipe(
    //     $("nix profile list"),
    //     piped("awk '{print $NF}'"),
    //     piped("grep -E metagenda"),
    //     piped("xargs nix -v profile remove"),
    //     std,
    // )

    // yield* $("nix -v profile install ~/code/0xgleb/metagenda").pipe(std)
})

export const compareFx = (todoA: Todo, todoB: Todo) =>
    Effect.gen(function* (_) {
        const term = yield* _(platform.Terminal.Terminal)
        const println = (msg: string) => _(term.display(`${msg}\n`))
        const inputs = yield* _(term.readInput)
        const input = inputs.take.pipe(Effect.map(({ input }) => input))

        yield* println("# Task A")
        yield* println(todoA.description)
        yield* println("# Task B")
        yield* println(todoB.description)

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
            yield* _(term.display("Which task is more important? [a/b] "))
            const answer = yield* input
            yield* _(term.display("\n"))

            if (Option.contains("a")(answer)) return true
            if (Option.contains("b")(answer)) return false
        }
    }).pipe(Effect.scoped)
