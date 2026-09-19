# Validate the emitted package without copying source or using workspace links.
def main [scratch: path] {
  let package = ($env.CURRENT_FILE | path dirname)
  let root = ($package | path join ../.. | path expand)
  let fixture = ($scratch | path expand | path join $"consumer-(random uuid)")
  mkdir $fixture
  try {
    let modules = ($fixture | path join node_modules)
    let destination = ($modules | path join @metagenda/work-core)
    mkdir $destination
    cp ($package | path join package.json) ($destination | path join package.json)
    cp -r ($package | path join dist) ($destination | path join dist)
    cp ($package | path join fixtures/compiled-consumer.mts) ($fixture | path join consumer.mts)
    # Fixed declared runtime closure; do not discover dependencies from imports.
    for name in [effect fast-check pure-rand @standard-schema/spec] {
      let target = ($modules | path join $name)
      mkdir ($target | path dirname)
      cp -r ($root | path join node_modules $name | path expand) $target
    }
    # Type tooling is fixture-local too; preserve its declared dependency closure.
    for name in [typescript @types/node undici-types] {
      let target = ($modules | path join $name)
      mkdir ($target | path dirname)
      cp -r ($root | path join node_modules $name | path expand) $target
    }
    let config = {
      compilerOptions: {
        target: ES2022 module: NodeNext moduleResolution: NodeNext
        strict: true noUncheckedIndexedAccess: true skipLibCheck: false
        allowImportingTsExtensions: false noEmit: true types: [node]
        typeRoots: [./node_modules/@types]
      }
      include: [consumer.mts]
    }
    $config | to json | save ($fixture | path join tsconfig.json)
    let compiled = (do {
      ^node --permission $"--allow-fs-read=($fixture)" ($modules | path join typescript/bin/tsc) -p ($fixture | path join tsconfig.json)
    } | complete)
    if $compiled.exit_code != 0 { error make {msg: $"consumer typecheck failed: ($compiled.stdout) ($compiled.stderr)"} }
    let runtime = (do {
      ^node --permission $"--allow-fs-read=($fixture)" ($fixture | path join consumer.mts)
    } | complete)
    if $runtime.exit_code != 0 { error make {msg: $"consumer runtime failed: ($runtime.stdout) ($runtime.stderr)"} }
    print ($runtime.stdout | str trim)
  } catch {|failure|
    rm -r $fixture
    error make {msg: $failure.msg}
  }
  rm -r $fixture
}
