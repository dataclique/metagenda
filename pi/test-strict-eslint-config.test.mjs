import assert from "node:assert/strict"
import test from "node:test"

const config = (await import("../eslint.config.mjs")).default

const isConfigEntry = entry =>
  typeof entry === "object" && entry !== null

test("the exported config is a flat array of entries", () => {
  assert.ok(Array.isArray(config))
  assert.ok(config.length > 0)
  for (const entry of config) assert.ok(isConfigEntry(entry))
})

test("the pi override applies both original rule relaxations", () => {
  const override = config.find(
    entry =>
      isConfigEntry(entry) &&
      Array.isArray(entry.files) &&
      entry.files.includes("pi/**/*.ts"),
  )
  assert.ok(override, "expected a pi/**/*.ts override entry")
  assert.equal(override.rules["@typescript-eslint/no-non-null-assertion"], "off")
  assert.equal(
    override.rules["@typescript-eslint/restrict-template-expressions"],
    "off",
  )
})

test("the pi override binds type-checking to the extension tsconfig", () => {
  const override = config.find(
    entry =>
      isConfigEntry(entry) &&
      Array.isArray(entry.files) &&
      entry.files.includes("pi/**/*.ts"),
  )
  assert.ok(override)
  assert.deepEqual(override.languageOptions.parserOptions.project, [
    "pi/extensions/tsconfig.json",
  ])
})

test("the strict preset stack is present", () => {
  assert.ok(
    config.some(
      entry =>
        isConfigEntry(entry) &&
        entry.name === "typescript-eslint/strict-type-checked",
    ),
  )
  assert.ok(
    config.some(
      entry =>
        isConfigEntry(entry) &&
        entry.name === "typescript-eslint/stylistic-type-checked",
    ),
  )
})

test("generated and out-of-scope trees are ignored", () => {
  const ignoreEntry = config.find(
    entry => isConfigEntry(entry) && Array.isArray(entry.ignores),
  )
  assert.ok(ignoreEntry)
  for (const expected of [
    "dist/",
    "test/",
    "packages/",
    "tooling/",
    "eslint.config.mjs",
  ]) {
    assert.ok(ignoreEntry.ignores.includes(expected), `missing ignore: ${expected}`)
  }
})
