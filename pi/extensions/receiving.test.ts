import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import test from "node:test"

// Resolve the verified btw entrypoint's SDK dependencies without importing the
// SDK or starting an extension, provider request, or user configuration loader.
for (const specifier of [
  "@earendil-works/pi-ai/compat",
  "@earendil-works/pi-coding-agent",
  "@earendil-works/pi-tui",
]) {
  test(`receiving test environment resolves the SDK entrypoint ${specifier}`, () => {
    const resolved = new URL(import.meta.resolve(specifier))
    assert.equal(resolved.protocol, "file:")
    assert.equal(existsSync(fileURLToPath(resolved)), true)
  })
}
