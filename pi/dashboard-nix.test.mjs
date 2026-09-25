import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("native Nix checks include the receiving dashboard asset build", () => {
  const flake = readFileSync(new URL("../flake.nix", import.meta.url), "utf8")
  assert.match(flake, /pi-dashboard\s*=\s*packages\.pi-dashboard/)
})

test("downstream flakes can select the same checked dashboard package", () => {
  const flake = readFileSync(new URL("../flake.nix", import.meta.url), "utf8")
  const packages = flake.slice(
    flake.indexOf("packages = {"),
    flake.indexOf("apps = {"),
  )
  assert.match(
    packages,
    /pi-dashboard\s*=\s*pkgs\.callPackage\s+\.\/pi\/dashboard\.nix/,
  )
})
