import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import test from "node:test"
import { transformSync } from "@babel/core"

const require = createRequire(import.meta.url)

test("the dashboard compiler declares its directly consumed build inputs", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  )
  // Bun's isolated Nix install does not hoist dockview-solid's dependencies.
  // build-dashboard.nu compiles this source, so it is a direct build input.
  for (const [name, version] of Object.entries({
    "@arminmajerie/dockview": "5.0.3",
    "@arminmajerie/dockview-core": "5.0.3",
    "effect": "3.22.2",
    "fast-check": "3.23.2",
    "pure-rand": "6.1.0",
  })) {
    assert.equal(manifest.devDependencies[name], version, name)
  }
  assert.equal(
    manifest.devDependencies["@arminmajerie/dockview"],
    manifest.devDependencies["@arminmajerie/dockview-solid"],
  )
})

test("the receiving dashboard toolchain compiles TypeScript JSX for Solid, not React", () => {
  const compiled = transformSync(
    "export const View = (props: { label: string }) => <div>{props.label}</div>",
    {
      filename: "synthetic.tsx",
      babelrc: false,
      configFile: false,
      presets: [
        require.resolve("@babel/preset-typescript"),
        require.resolve("babel-preset-solid"),
      ],
    },
  )
  assert.ok(typeof compiled?.code === "string")
  assert.match(compiled.code, /from "solid-js\/web"/)
  assert.doesNotMatch(compiled.code, /React\.createElement|props:/)
  // Solid's DOM template is a string containing HTML, not remaining JSX.
  assert.doesNotThrow(() =>
    transformSync(compiled.code, {
      babelrc: false,
      configFile: false,
      ast: true,
      code: false,
    }),
  )
})
