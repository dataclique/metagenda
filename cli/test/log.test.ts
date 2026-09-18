import { context, trace } from "@opentelemetry/api"
import {
  BasicTracerProvider,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base"
import * as fs from "fs"
import { expect, it, vi } from "vitest"

import { FileSpanExporter } from "../src/log"

vi.mock("fs", async importOriginal => ({
  ...(await importOriginal<typeof import("fs")>()),
  appendFileSync: vi.fn(),
}))

it("preserves parent IDs for real SDK child spans without assigning one to roots", async () => {
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(new FileSpanExporter())],
  })
  try {
    const tracer = provider.getTracer("metagenda-export-test")
    const root = tracer.startSpan("root")
    const child = tracer.startSpan(
      "child",
      {},
      trace.setSpan(context.active(), root),
    )
    child.end()
    root.end()
    await provider.forceFlush()

    const records = vi
      .mocked(fs.appendFileSync)
      .mock.calls.flatMap(([, data]) =>
        String(data)
          .split("\n")
          .filter(Boolean)
          .map(line => JSON.parse(line)),
      )
    expect(records).toHaveLength(2)
    expect(records).toContainEqual(
      expect.objectContaining({
        name: "child",
        parentId: root.spanContext().spanId,
        traceId: root.spanContext().traceId,
      }),
    )
    const rootRecord = records.find(record => record.name === "root")
    expect(rootRecord).toBeDefined()
    expect(rootRecord).not.toHaveProperty("parentId")
  } finally {
    await provider.shutdown()
  }
})
