import assert from "node:assert/strict"
import test from "node:test"

const config = await import("../eslint.config.mjs").then(
  m => m.default,
  error => {
    const message = error instanceof Error ? error.message : String(error)
    if (
      error?.code === "ERR_MODULE_NOT_FOUND" &&
      /@eslint\/js|typescript-eslint|eslint/.test(message)
    ) {
      return null
    }
    throw error
  },
)

const isConfigEntry = entry => typeof entry === "object" && entry !== null

if (config === null) {
  test(
    "strict eslint config contract (skipped: dependencies not installed)",
    { skip: true },
    () => {},
  )
} else {
  const { ESLint } = await import("eslint")
  const eslint = new ESLint()
  const effective = await eslint.calculateConfigForFile(
    "pi/extensions/todo/state.ts",
  )

  test("the exported config is a flat array of entries", () => {
    assert.ok(Array.isArray(config))
    assert.ok(config.length > 0)
    for (const entry of config) assert.ok(isConfigEntry(entry))
  })

  test("effective pi rules relax both original rule settings", () => {
    const severity = value => (Array.isArray(value) ? value[0] : value)
    const nonNullAssertion =
      effective.rules["@typescript-eslint/no-non-null-assertion"]
    assert.ok(
      severity(nonNullAssertion) === "off" || severity(nonNullAssertion) === 0,
    )
    const restrictTemplate =
      effective.rules["@typescript-eslint/restrict-template-expressions"]
    assert.ok(
      severity(restrictTemplate) === "off" || severity(restrictTemplate) === 0,
    )
  })

  test("effective pi type-checking binds to the extension tsconfig", () => {
    assert.deepEqual(effective.languageOptions.parserOptions.project, [
      "pi/extensions/tsconfig.json",
    ])
  })

  test("the strict preset stack is present and scoped to the pi tree", () => {
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
    for (const entry of config) {
      if (!isConfigEntry(entry) || Array.isArray(entry.ignores)) continue
      assert.ok(
        Array.isArray(entry.files) && entry.files.includes("pi/**/*.ts"),
        `rule-bearing entry missing pi scope: ${String(entry.name)}`,
      )
    }
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
      assert.ok(
        ignoreEntry.ignores.includes(expected),
        `missing ignore: ${expected}`,
      )
    }
  })
}
