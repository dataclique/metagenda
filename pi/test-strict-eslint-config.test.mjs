import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(new URL("../eslint.config.mjs", import.meta.url), "utf8")

test("root eslint config preserves the strict 2024 preset stack", () => {
  assert.match(source, /eslint\.configs\.recommended/)
  assert.match(source, /strictTypeChecked/)
  assert.match(source, /stylisticTypeChecked/)
})

test("both original rule relaxations are preserved", () => {
  assert.match(source, /"@typescript-eslint\/no-non-null-assertion": "off"/)
  assert.match(source, /"@typescript-eslint\/restrict-template-expressions": "off"/)
})

test("parser project points at the extension tsconfig", () => {
  assert.match(source, /project: \["pi\/extensions\/tsconfig\.json"\]/)
})

test("type-checked linting is scoped to the pi tree", () => {
  assert.match(source, /files: \["pi\/\*\*\/\*\.ts"\]/)
})
