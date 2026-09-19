# Locate one fixed dependency relative to its declared parent, including Bun's
# isolated linker. Resolve links before following a dependency's own dependencies.
def dependency-root [parent: path, name: string] {
  let candidate = ($parent | path join node_modules $name)
  if ($candidate | path exists) { return ($candidate | path expand) }
  let ancestor = ($parent | path dirname)
  if $ancestor == $parent { error make {msg: $"Missing declared dependency: ($name)"} }
  dependency-root $ancestor $name
}

# Validate the emitted package without copying source or using workspace links.
def main [scratch: path] {
  let package = ($env.CURRENT_FILE | path dirname)
  let fixture = ($scratch | path expand | path join $"consumer-(random uuid)")
  mkdir $fixture
  try {
    let modules = ($fixture | path join node_modules)
    let destination = ($modules | path join @metagenda/work-core)
    mkdir $destination
    cp ($package | path join package.json) ($destination | path join package.json)
    cp -r ($package | path join dist) ($destination | path join dist)
    cp ($package | path join fixtures/compiled-consumer.mts) ($fixture | path join consumer.mts)
    # Fixed declared closures, not dependencies inferred from arbitrary imports.
    let effect = (dependency-root $package effect)
    let fast_check = (dependency-root $effect fast-check)
    let node_types = (dependency-root $package @types/node)
    let dependencies = [
      {name: effect, source: $effect}
      {name: fast-check, source: $fast_check}
      {name: pure-rand, source: (dependency-root $fast_check pure-rand)}
      {name: @standard-schema/spec, source: (dependency-root $effect @standard-schema/spec)}
      {name: typescript, source: (dependency-root $package typescript)}
      {name: @types/node, source: $node_types}
      {name: undici-types, source: (dependency-root $node_types undici-types)}
    ]
    for dependency in $dependencies {
      let target = ($modules | path join $dependency.name)
      mkdir ($target | path dirname)
      cp -r $dependency.source $target
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
