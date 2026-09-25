import assert from "node:assert/strict"
import test from "node:test"
import { fileURLToPath } from "node:url"

// Pi 0.85.1 does not export its loader publicly. Resolve this pinned test seam
// from the installed dependency, never from a host-specific Nix store path.
const sdkEntry = import.meta.resolve("@earendil-works/pi-coding-agent")
const { loadExtensions } = await import(
  new URL("./core/extensions/loader.js", sdkEntry).href
)
const { createEventBus } = await import(
  new URL("./core/event-bus.js", sdkEntry).href
)
const cwd = fileURLToPath(new URL("./", import.meta.url))
const extensionPath = fileURLToPath(
  new URL("./extensions/btw/index.ts", import.meta.url),
)

// This explicit, source-reviewed factory only registers a command and a version
// listener. Do not discover the received manifest or invoke command/session code.
test("received btw loads through Pi and releases its version listener", async () => {
  const bus = createEventBus()
  const loaded = await loadExtensions([extensionPath], cwd, bus)
  const versions = []
  const report = (component, version) => versions.push([component, version])
  try {
    assert.deepEqual(loaded.errors, [])
    assert.equal(loaded.extensions.length, 1)
    const [extension] = loaded.extensions
    assert.deepEqual([...extension.commands.keys()], ["btw"])
    assert.equal(extension.tools.size, 0)
    assert.equal(extension.handlers.size, 0)
    assert.equal(extension.shortcuts.size, 0)
    assert.equal(extension.flags.size, 0)
    assert.deepEqual(loaded.runtime.pendingProviderRegistrations, [])
    assert.deepEqual(loaded.runtime.pendingNativeProviderRegistrations, [])
    bus.emit("pi:runtime-version-request", report)
    assert.deepEqual(versions, [["btw", "2026.07.23.1"]])
    loaded.runtime.invalidate()
    bus.emit("pi:runtime-version-request", report)
    assert.equal(
      versions.length,
      1,
      "invalidated runtime retained its listener",
    )
  } finally {
    loaded.runtime.invalidate()
    bus.clear()
  }
})

test("native loading reports an absent entrypoint rather than false success", async () => {
  const missingPath = fileURLToPath(
    new URL("./native-load-test-missing-entrypoint.ts", import.meta.url),
  )
  const loaded = await loadExtensions([missingPath], cwd)
  try {
    assert.deepEqual(loaded.extensions, [])
    assert.equal(loaded.errors.length, 1)
    assert.equal(loaded.errors[0].path, missingPath)
    assert.match(loaded.errors[0].error, /Failed to load extension:/)
    assert.deepEqual(loaded.runtime.pendingProviderRegistrations, [])
    assert.deepEqual(loaded.runtime.pendingNativeProviderRegistrations, [])
  } finally {
    loaded.runtime.invalidate()
  }
})
