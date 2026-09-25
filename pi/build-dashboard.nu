# Build only observational browser assets. Never starts the control plane.
# The caller owns the new destination; existing paths are never replaced.
def checked [executable: string, arguments: list<string>] {
    let result = (^$executable ...$arguments | complete)
    if $result.exit_code != 0 {
        error make {msg: $result.stderr}
    }
    if ($result.stdout | str trim | is-not-empty) {
        print $result.stdout
    }
}

def main [destination: path] {
    let pi_root = $env.FILE_PWD
    let repository = ($pi_root | path dirname)
    let source = ($pi_root | path join "extensions" "control-plane")
    let dependencies = ($repository | path join "node_modules")
    let output = ($destination | path expand --no-symlink)
    if ($output | path type) != null {
        error make {msg: "dashboard destination already exists"}
    }

    let modules = [
        "job-runtime.ts" "job-presentation.ts" "harness-protocol.ts"
        "harness-research-protocol.ts" "review-duty-profile.ts"
        "allowance-pool.ts" "usage-policy.ts"
        "dashboard/allowance-chart.ts" "dashboard/dock-layout.ts"
    ]
    let stage = ($output | path join ".build")
    let babel = ($dependencies | path join "@babel" "cli" "bin" "babel.js")
    let typescript = ($dependencies | path join "@babel" "preset-typescript")
    let solid = ($dependencies | path join "babel-preset-solid")
    let esbuild = ($dependencies | path join "esbuild" "bin" "esbuild")
    let dockview = ($dependencies | path join "@arminmajerie" "dockview" "dist")
    let dockview_css = ($dependencies | path join "@arminmajerie" "dockview-solid" "dist" "styles" "dockview.css")

    mkdir ($stage | path join "dashboard")
    try {
        for module in $modules {
            cp ($source | path join $module) ($stage | path join $module)
        }
        checked "ln" ["-s" $dependencies ($stage | path join "node_modules")]
        let config = ($stage | path join "babel.json")
        "{}" | save $config
        let common = ["--no-babelrc" "--config-file" $config "--env-name" "production"]
        let presets = ($typescript + "," + $solid)
        checked "node" ([
            $babel ($source | path join "dashboard" "app.tsx")
            "--out-file" ($stage | path join "dashboard" "app.js")
            "--presets" $presets
        ] ++ $common)
        checked "node" ([
            $babel ($source | path join "dashboard" "ControlPlaneDock.tsx")
            "--out-file" ($stage | path join "dashboard" "ControlPlaneDock.tsx")
            "--presets" $presets
        ] ++ $common)
        # Published Dockview 5.0.3 ships JSX. Compile that pinned dependency
        # with Solid's preset; do not replace it or persist a source fork.
        checked "node" ([
            $babel $dockview "--extensions" ".js,.jsx"
            "--out-dir" ($stage | path join "dockview")
            "--presets" $solid
        ] ++ $common)
        checked "node" [
            $esbuild ($stage | path join "dashboard" "app.js")
            "--bundle" "--platform=browser" "--format=esm" "--target=es2023"
            "--legal-comments=inline"
            $'--alias:@arminmajerie/dockview=($stage | path join "dockview" "index.js")'
            $'--outfile=($output | path join "app.js")'
            $'--metafile=($output | path join "metafile.json")'
        ]
        ((open --raw $dockview_css) + "\n" + (open --raw ($source | path join "dashboard" "app.css")))
        | save ($output | path join "app.css")
        cp ($source | path join "dashboard" "index.html") ($output | path join "index.html")
        let licenses = ($output | path join "licenses")
        mkdir $licenses
        cp ($pi_root | path join "LICENSE") ($licenses | path join "dotconfig-MIT.txt")
        cp ($pi_root | path join "licenses" "dockview-MIT.txt") ($licenses | path join "dockview-MIT.txt")
        cp ($dependencies | path join "solid-js" "LICENSE") ($licenses | path join "solid-js-LICENSE.txt")
        cp ($dependencies | path join "effect" "LICENSE") ($licenses | path join "effect-LICENSE.txt")
        cp ($dependencies | path join "fast-check" "LICENSE") ($licenses | path join "fast-check-LICENSE.txt")
        cp ($dependencies | path join "pure-rand" "LICENSE") ($licenses | path join "pure-rand-LICENSE.txt")
        rm --recursive $stage
    } catch {|failure|
        rm --recursive $output
        error make {msg: $failure.msg}
    }
}
