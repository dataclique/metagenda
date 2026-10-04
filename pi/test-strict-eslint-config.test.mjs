import assert from "node:assert/strict"
import test from "node:test"
import { fileURLToPath } from "node:url"

const dependenciesPresent = await Promise.all([
  import("eslint"),
  import("@eslint/js"),
  import("typescript-eslint"),
])
  .then(() => true)
  .catch(() => false)

const isConfigEntry = entry => typeof entry === "object" && entry !== null

if (!dependenciesPresent) {
  test(
    "strict eslint config contract (skipped: dependencies not installed)",
    { skip: true },
    () => {},
  )
} else {
  const config = (await import("../eslint.config.mjs")).default
  const { ESLint } = await import("eslint")
  const root = fileURLToPath(new URL("../", import.meta.url))
  const target = fileURLToPath(
    new URL("../pi/extensions/todo/state.ts", import.meta.url),
  )
  const eslint = new ESLint({ cwd: root })
  const effective = await eslint.calculateConfigForFile(target)

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
