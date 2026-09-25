import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

const scratch = fileURLToPath(
  new URL("../.tmp/pi-dashboard-tests/", import.meta.url),
)
const script = fileURLToPath(new URL("./build-dashboard.nu", import.meta.url))
mkdirSync(scratch, { recursive: true })

const build = output =>
  spawnSync("nu", ["--no-config-file", "--no-history", script, output], {
    encoding: "utf8",
    timeout: 30_000,
  })

test("the dashboard builds local Solid assets without starting a service", () => {
  const fixture = mkdtempSync(join(scratch, "build-"))
  try {
    const output = join(fixture, "assets")
    const result = build(output)
    assert.equal(result.error, undefined)
    assert.equal(result.status, 0, result.stderr)
    assert.ok(
      existsSync(join(output, "app.js")),
      "successful build must produce app.js",
    )
    assert.deepEqual(readdirSync(output).sort(), [
      "app.css",
      "app.js",
      "index.html",
      "licenses",
      "metafile.json",
    ])
    const bundle = readFileSync(join(output, "app.js"), "utf8")
    assert.doesNotMatch(bundle, /React\.createElement\(/)
    assert.match(bundle, /VIEW ONLY/)
    assert.match(
      readFileSync(join(output, "index.html"), "utf8"),
      /src="\/app\.js"/,
    )
    const css = readFileSync(join(output, "app.css"), "utf8")
    assert.match(css, /\.dv-/)
    assert.match(css, /control-plane-dockview-theme/)
    const metadata = JSON.parse(
      readFileSync(join(output, "metafile.json"), "utf8"),
    )
    assert.ok(
      Object.keys(metadata.inputs).some(path =>
        path.endsWith("ControlPlaneDock.tsx"),
      ),
    )
    for (const artifact of Object.values(metadata.outputs)) {
      assert.deepEqual(
        artifact.imports,
        [],
        "the browser bundle must not need unresolved imports",
      )
    }
    for (const notice of [
      "dotconfig-MIT.txt",
      "dockview-MIT.txt",
      "solid-js-LICENSE.txt",
      "effect-LICENSE.txt",
      "fast-check-LICENSE.txt",
      "pure-rand-LICENSE.txt",
    ]) {
      assert.ok(existsSync(join(output, "licenses", notice)), notice)
    }
    const license = readFileSync(join(output, "licenses", "dockview-MIT.txt"))
    const blob = createHash("sha1")
      .update(`blob ${license.length}\0`)
      .update(license)
      .digest("hex")
    assert.equal(blob, "7ec9c34314180c0f160839b8fdc80f74d0c2dadd")
  } finally {
    rmSync(fixture, { recursive: true })
  }
})

test("the dashboard builder refuses a dangling destination symlink", () => {
  const fixture = mkdtempSync(join(scratch, "symlink-"))
  try {
    const target = join(fixture, "missing")
    const destination = join(fixture, "link")
    symlinkSync(target, destination, "dir")
    const result = build(destination)
    assert.equal(result.error, undefined)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /destination already exists/)
    assert.equal(readlinkSync(destination), target)
    assert.equal(existsSync(target), false)
  } finally {
    rmSync(fixture, { recursive: true })
  }
})

test("the dashboard builder refuses an existing destination without altering it", () => {
  const fixture = mkdtempSync(join(scratch, "preserve-"))
  try {
    writeFileSync(join(fixture, "sentinel"), "preserve")
    const result = build(fixture)
    assert.equal(result.error, undefined)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /destination already exists/)
    assert.equal(readFileSync(join(fixture, "sentinel"), "utf8"), "preserve")
    assert.deepEqual(readdirSync(fixture), ["sentinel"])
  } finally {
    rmSync(fixture, { recursive: true })
  }
})
