import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Inspect resource metadata without importing or activating an extension.
test("every declared received extension entrypoint exists", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("./package.json", import.meta.url), "utf8"),
  )
  assert.ok(Array.isArray(manifest.pi.extensions))
  for (const entrypoint of manifest.pi.extensions) {
    assert.equal(typeof entrypoint, "string")
    assert.equal(
      existsSync(new URL(entrypoint, import.meta.url)),
      true,
      `missing declared extension: ${entrypoint}`,
    )
  }
})
