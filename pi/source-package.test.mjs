import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import test from "node:test"

// Pure package-contract evaluation: synthetic source, no extension execution.
const expression = `let
  f = builtins.getFlake "git+file://${process.cwd()}";
  pkgs = import f.inputs.nixpkgs { system = builtins.currentSystem; };
  package = pkgs.callPackage ${process.cwd()}/pi/source.nix {};
in { name = package.pname; buildsCode = !(package.dontBuild or false); hasConsumerNotes = builtins.pathExists (package.src + "/SOURCE.md"); }
`

test("the host can consume Pi source without a new SDK or build toolchain", () => {
  const result = JSON.parse(
    execFileSync("nix", ["eval", "--impure", "--json", "--expr", expression], {
      encoding: "utf8",
    }),
  )
  assert.deepEqual(result, {
    name: "metagenda-pi-source",
    buildsCode: false,
    hasConsumerNotes: true,
  })
})

test("the flake exports the source package without replacing existing packages", () => {
  const flake = readFileSync(new URL("../flake.nix", import.meta.url), "utf8")
  assert.match(flake, /pi-source\s*=\s*pkgs\.callPackage\s+\.\/pi\/source\.nix/)
  assert.match(flake, /fj\s*=\s*pkgs\.callPackage/)
  assert.match(flake, /pi-skills\s*=\s*pkgs\.callPackage/)
})
