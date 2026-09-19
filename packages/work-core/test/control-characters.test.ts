import assert from "node:assert/strict"
import test from "node:test"
import { Effect, Either } from "effect"
import { backlogRequirementsFromText } from "../src/canonical-backlog.ts"
import { backlogDocumentSnapshot } from "../src/backlog-normalization.ts"

void test("control validation preserves the nominated ASCII and Unicode boundary", async () => {
  for (let code = 0; code <= 160; code += 1) {
    const text = `left${String.fromCharCode(code)}right`
    const forbidden = code === 127 || (code < 32 && ![9, 10, 13].includes(code))
    assert.deepEqual(backlogRequirementsFromText(text), forbidden ? [] : [text])
    const result = await Effect.runPromise(
      Effect.either(
        backlogDocumentSnapshot({
          project: "/workspace/metagenda",
          documentId: "ROADMAP.md",
          observedAt: 1,
          content: text,
        }),
      ),
    )
    assert.equal(Either.isLeft(result), forbidden, `character ${String(code)}`)
  }
  assert.deepEqual(backlogRequirementsFromText("left🙂right"), ["left🙂right"])
})
