import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { lstatSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

// Explicit build-artifact argument; never infer a user's installed Pi directory.
const root = process.argv[2]
assert.ok(root, "pass the installed Pi skills package directory")

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const readRecord = (name: string): Record<string, unknown> => {
  const value: unknown = JSON.parse(readFileSync(join(root, name), "utf8"))
  assert.ok(isRecord(value), name)
  return value
}

test("installed skills retain every pinned source file and explicit Pi resource", () => {
  const source = readRecord("SOURCE.json")
  const manifest = readRecord("package.json")
  assert.equal(source.repository, "0xgleb/dotconfig")
  assert.equal(source.revision, "540ea10b2892f33d6c5fc486287050a2b6092b7b")
  assert.ok(Array.isArray(source.files))
  assert.equal(source.files.length, 51)
  const resources: string[] = []
  const paths = new Set<string>()
  for (const file of source.files) {
    assert.ok(isRecord(file))
    assert.ok(typeof file.path === "string")
    assert.ok(typeof file.sha256 === "string")
    assert.ok(typeof file.gitBlob === "string")
    assert.match(file.gitBlob, /^[a-f0-9]{40}$/)
    assert.match(
      file.path,
      /^[a-z-]+\/(?:SKILL\.md|references\/[a-z-]+\.md|scripts\/[a-z-]+\.nu)$/,
    )
    assert.match(file.sha256, /^[a-f0-9]{64}$/)
    assert.equal(paths.has(file.path), false)
    paths.add(file.path)
    const installed = join(root, "skills", file.path)
    assert.ok(lstatSync(installed).isFile(), file.path)
    const bytes = readFileSync(installed)
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      file.sha256,
      file.path,
    )
    assert.equal(
      createHash("sha1")
        .update(`blob ${bytes.length}\0`)
        .update(bytes)
        .digest("hex"),
      file.gitBlob,
      file.path,
    )
    if (file.path.endsWith("/SKILL.md")) {
      resources.push(`./skills/${file.path.slice(0, -"/SKILL.md".length)}`)
    }
  }
  assert.equal(resources.length, 46)
  assert.deepEqual(
    [...paths].filter(path => !path.endsWith("/SKILL.md")).sort(),
    [
      "eod/scripts/collect.nu",
      "eod/scripts/evidence.nu",
      "gitbutler/references/concepts.md",
      "gitbutler/references/examples.md",
      "gitbutler/references/reference.md",
    ],
  )
  assert.equal(manifest.name, "@metagenda/pi-skills")
  assert.ok(isRecord(manifest.pi))
  assert.deepEqual(manifest.pi.skills, resources)
  assert.equal(manifest.pi.extensions, undefined)
  assert.match(readFileSync(join(root, "LICENSE"), "utf8"), /MIT License/)
  assert.ok(lstatSync(join(root, "PROVENANCE.md")).isFile())
})
