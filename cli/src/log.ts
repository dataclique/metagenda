import * as cli from "@effect/cli"
import * as fs from "fs"
import { SpanExporter } from "@opentelemetry/sdk-trace-base"
import { ReadableSpan } from "@opentelemetry/sdk-trace-base"
import {
    ExportResult,
    ExportResultCode,
    hrTimeToMicroseconds,
} from "@opentelemetry/core"
import { Effect, LogLevel, Logger } from "effect"

import { $, std } from "./sys"
import { cfgFx } from "./cfg"
import { LineOfWork } from "./todo"

export const logger = Logger.minimumLogLevel(LogLevel.Debug)

export const exportCli = cli.Command.make("export", {}, () => exportFx)
export const exportFx = Effect.gen(function* () {
    const cfg = yield* cfgFx()
    const repoPath = cfg[LineOfWork("metagenda")].repoPath!

    const lines = fs
        .readFileSync(`${repoPath}/logs.jsonl`, "utf8")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line) as ExportSpan)

    const logs = lines
        .filter(({ parentId }) => parentId === undefined)
        .map(({ name, timestamp, duration }) => ({
            name: name.replace(/[\s\]].*/, "").replace(/#/, ""),
            timestamp: timestamp / 1000,
            duration: Math.round(duration / 1000 / 1000 / 60),
        }))
        .filter(({ duration }) => duration > 0)
        .map(
            ({ name, timestamp, duration }) =>
                `${name},${timestamp},${duration}`,
        )

    const header = "name,timestamp,duration"
    const csv = [header, ...logs].join("\n")

    const outPath = `${repoPath}/logs.csv`
    fs.writeFileSync(outPath, csv)

    yield* $(`bat ${outPath}`).pipe(std)
})

type ExportSpan = ReturnType<typeof exportInfo>

const exportInfo = (span: ReadableSpan) => {
    return {
        resource: {
            attributes: span.resource.attributes,
        },
        traceId: span.spanContext().traceId,
        parentId: span.parentSpanContext?.spanId,
        traceState: span.spanContext().traceState?.serialize(),
        name: span.name,
        id: span.spanContext().spanId,
        kind: span.kind,
        timestamp: hrTimeToMicroseconds(span.startTime),
        duration: hrTimeToMicroseconds(span.duration),
        attributes: span.attributes,
        status: span.status,
        events: span.events,
        links: span.links,
    }
}

export class FileSpanExporter implements SpanExporter {
    private spans: ExportSpan[] = []

    private flush() {
        const jsonLogs =
            this.spans.map(span => JSON.stringify(span)).join("\n") + "\n"
        fs.appendFileSync(`${__dirname}/../../logs.jsonl`, jsonLogs)
        this.spans = []
    }

    export(
        spans: ReadableSpan[],
        resultCallback: (result: ExportResult) => void,
    ): void {
        this.spans.push(...spans.map(exportInfo))
        this.flush()
        resultCallback({ code: ExportResultCode.SUCCESS })
    }

    async shutdown() {
        await this.forceFlush()
    }

    forceFlush(): Promise<void> {
        this.flush()
        return Promise.resolve()
    }
}
