import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { evaluateAskQuality, structuralContextFreeDefects } from "./quality.ts"

const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8")

const operatorStatusChecksQuestion = {
  question: "Should I continue with the operator status checks?",
  header: "Operator checks",
}

const concreteDeliveryQuestion = {
  question:
    "Send the weekly Boulder CABA tracker card to your Telegram now, or hold it until after the 15:00 standup? The tracker is built; delivery has not run this week.",
  header: "Tracker delivery",
  guess: "Send it now",
  options: [{ label: "Send now" }, { label: "Hold until after standup" }],
}

test("the operator status checks question is structurally context-free", () => {
  assert.ok(structuralContextFreeDefects(operatorStatusChecksQuestion.question))
})

test("a concrete self-contained question has no structural defect", () => {
  assert.equal(
    structuralContextFreeDefects(concreteDeliveryQuestion.question),
    undefined,
  )
})

test("a structurally context-free ask is rejected before queueing", async () => {
  const verdict = await evaluateAskQuality(operatorStatusChecksQuestion, {
    runJudge: async () => undefined,
  })
  assert.equal(verdict.admissible, false)
  assert.match(verdict.reason, /context-free/i)
})

test("a judge rejection is honored for semantically vague questions", async () => {
  const verdict = await evaluateAskQuality(
    { question: "Is the current approach still what you want?" },
    {
      runJudge: async () => ({
        admissible: false,
        reason:
          "No concrete referent: names no artifact, path, number, or interval.",
      }),
    },
  )
  assert.equal(verdict.admissible, false)
})

test("judge failure admits the question without stalling", async () => {
  const verdict = await evaluateAskQuality(
    { question: "Merge PR #63 now or after CodeRabbit clears?" },
    { runJudge: async () => undefined },
  )
  assert.equal(verdict.admissible, true)
})

test("ask_user gates asks through the quality check before queueing", () => {
  assert.match(source, /evaluateAskQuality\(/)
  assert.match(source, /outcome: "rejected"/)
  assert.match(source, /Rewrite it with concrete referents/)
})
