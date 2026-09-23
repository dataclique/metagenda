import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("the flake exposes skills without replacing existing package outputs", () => {
  const flake = readFileSync(new URL("../flake.nix", import.meta.url), "utf8")
  assert.match(flake, /pi-skills\s*=\s*pkgs\.callPackage\s+\.\/pi\/skills\.nix/)
  assert.match(flake, /default\s*=\s*pkgs\.callPackage\s+\.\/default\.nix/)
  assert.match(flake, /fj\s*=\s*pkgs\.callPackage\s+\.\/tooling\/fj/)
})
