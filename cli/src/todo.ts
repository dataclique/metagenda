import { Brand, Duration } from "effect"

import { Project } from "./cfg"

export type Action = "hack" | "plan" | "review" | "afk"

export const Action = (input: string | undefined): Action | undefined => {
    if (!input) return undefined

    const actionRegex = /\s!\w+/
    switch (actionRegex.exec(input)?.[0].trim()) {
        case "!afk":
        case "afk":
            return "afk"
        case "!hack":
        case "hack":
            return "hack"
        case "!plan":
        case "plan":
            return "plan"
        case "!review":
        case "review":
            return "review"
        default:
            return undefined
    }
}

export type Progress = "todo" | "doing" | "done" | "overrun"

export type Priority = "highest" | "high" | "medium" | "low" | "lowest"
export const Priority = (priority: number | string) => {
    if (typeof priority === "string") {
        switch (priority) {
            case "highest":
            case "high":
            case "medium":
            case "low":
            case "lowest":
                return priority
            default:
                return undefined
        }
    }

    if (typeof priority === "number") {
        switch (priority) {
            case 1:
                return "highest" as Priority
            case 2:
                return "high" as Priority
            case 3:
                return "medium" as Priority
            case 4:
                return "low" as Priority
            case 5:
                return "lowest" as Priority
            default:
                return undefined
        }
    }

    return undefined
}

export const urgency = (priority?: Priority): number => {
    switch (priority) {
        case "highest":
            return 9.0
        case "high":
            return 6.0
        case "medium":
            return 3.9
        case undefined:
            return 1.95
        case "low":
            return 0.0
        case "lowest":
            return -1.8
    }
}

export interface Todo {
    readonly action?: Action
    readonly dryRun?: boolean
    readonly progress: Progress
    readonly priority?: Priority
    readonly description: string
    readonly lineOfWork?: LineOfWork
    readonly duration?: Duration.Duration
}

export const Todo = (
    lineOfWork: LineOfWork,
    description: string,
    duration: Duration.Duration,
): Todo => {
    const action = Action(description)

    return {
        action,
        dryRun: false,
        progress: "todo",
        description,
        duration,
        lineOfWork,
    }
}

export type LineOfWork = string & Brand.Brand<"LineOfWork">

export const LineOfWork = (path: string): LineOfWork =>
    Brand.refined<LineOfWork>(
        path => /[a-zA-Z0-9\-_/]+/.test(path),
        path => Brand.error(`Invalid LineOfWork path format: ${path}`),
    )(path.trim())

export const splitLineOfWork = (lofw: LineOfWork) => {
    const [project, ...sub] = lofw.split("/").filter(_ => _.length)
    const qualifier = sub.length && sub[0] === project ? sub.slice(1) : sub
    return qualifier.length
        ? { project: Project(project), qualifier }
        : { project: Project(project) }
}

export const inLineWith =
    (ref?: LineOfWork) =>
    (check?: LineOfWork): boolean => {
        if (!ref) return true
        if (!check) return false

        const { project: refProject, qualifier: refQualifier } =
            splitLineOfWork(ref)
        const { project: checkProject, qualifier: checkQualifier } =
            splitLineOfWork(check)

        if (refProject !== checkProject) return false

        if (!refQualifier) return true
        if (!checkQualifier) return false
        if (checkQualifier.length < refQualifier.length) return false

        return refQualifier.every(
            (chunk, index) => chunk === checkQualifier[index],
        )
    }
