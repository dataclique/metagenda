import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

test("public skill source pins use unique bounded paths and immutable digests", () => {
  const source: unknown = JSON.parse(
    readFileSync(new URL("./skills-source.json", import.meta.url), "utf8"),
  )
  assert.ok(isRecord(source))
  assert.equal(source.repository, "0xgleb/dotconfig")
  assert.ok(typeof source.revision === "string")
  assert.match(source.revision, /^[a-f0-9]{40}$/)
  assert.ok(Array.isArray(source.files))
  assert.equal(source.files.length, 51)
  const paths = new Set<string>()
  for (const file of source.files) {
    assert.ok(isRecord(file))
    assert.ok(typeof file.path === "string")
    assert.ok(typeof file.sha256 === "string")
    assert.ok(typeof file.gitBlob === "string")
    assert.match(
      file.path,
      /^[a-z-]+\/(?:SKILL\.md|references\/[a-z-]+\.md|scripts\/[a-z-]+\.nu)$/,
    )
    assert.match(file.sha256, /^[a-f0-9]{64}$/)
    assert.match(file.gitBlob, /^[a-f0-9]{40}$/)
    assert.equal(
      paths.has(file.path),
      false,
      `duplicate source path: ${file.path}`,
    )
    paths.add(file.path)
  }
  assert.equal([...paths].filter(path => path.endsWith("/SKILL.md")).length, 46)
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
})
