# Exercise the artifact verifier against modified copies, never the source package.
def main [package_root: path, verifier: path, scratch_root: path] {
    let baseline = (^node $verifier $package_root | complete)
    print $baseline.stdout
    if $baseline.exit_code != 0 {
        error make {msg: "valid skills package failed verification"}
    }
    let outcomes = (["wrong-blob" "missing-support"] | each {|scenario|
        let fixture = (mktemp --directory --tmpdir-path $scratch_root "skills-negative.XXXXXX")
        let copy = ($fixture | path join "package")
        try {
            cp --recursive $package_root $copy
            let permissions = (^chmod -R u+w $copy | complete)
            if $permissions.exit_code != 0 {
                error make {msg: $permissions.stderr}
            }
            let manifest_path = ($copy | path join "SOURCE.json")
            let manifest = (open $manifest_path)
            let changed = if $scenario == "wrong-blob" {
                $manifest | upsert files.0.gitBlob "0000000000000000000000000000000000000000"
            } else {
                let original = "gitbutler/references/reference.md"
                let renamed = "gitbutler/references/renamed.md"
                mv ($copy | path join "skills" $original) ($copy | path join "skills" $renamed)
                $manifest | update files {|row|
                    $row.files | each {|file|
                        if $file.path == $original { $file | upsert path $renamed } else { $file }
                    }
                }
            }
            $changed | to json | save --force $manifest_path
            let result = (^node $verifier $copy | complete)
            rm --recursive $fixture
            {scenario: $scenario, accepted: ($result.exit_code == 0)}
        } catch {|failure|
            rm --recursive $fixture
            error make {msg: $failure.msg}
        }
    })
    print ($outcomes | to json)
    if ($outcomes | any {|outcome| $outcome.accepted}) {
        error make {msg: "skills verifier accepted an invalid package"}
    }
}
