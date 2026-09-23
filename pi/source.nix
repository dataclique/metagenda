{ lib, stdenvNoCC }:

let
  # Source only: the consuming host keeps its dependencies and activation.
  sharedDirectories = [
    ./extensions/activity-status
    ./extensions/agent-registry
    ./extensions/agent-workspace
    ./extensions/auto-reload
    ./extensions/btw
    ./extensions/classified-workflows
    ./extensions/compact-footer
    ./extensions/compact-read
    ./extensions/control-plane
    ./extensions/disk-pressure
    ./extensions/image-summary
    ./extensions/input-ergonomics
    ./extensions/lsp
    ./extensions/nushell-default
    ./extensions/questions
    ./extensions/release-cadence
    ./extensions/remote-control
    ./extensions/request-observability
    ./extensions/safe-compaction
    ./extensions/shared
    ./extensions/usage-governor
    ./extensions/write-result-inspector
  ];
  sourceFiles = lib.fileset.unions (
    map (
      directory:
      lib.fileset.fileFilter (
        file:
        (lib.any file.hasExt [
          "ts"
          "tsx"
          "css"
          "html"
          "md"
        ])
        && !(lib.any (name: lib.hasPrefix name file.name) [
          "owner-telegram."
          "bridge-cli."
          "caba-tracker."
        ])
      ) directory
    ) sharedDirectories
  );
in
stdenvNoCC.mkDerivation {
  pname = "metagenda-pi-source";
  version = "0.1.0";
  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./LICENSE
      ./SOURCE.md
      sourceFiles
    ];
  };
  dontBuild = true;
  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp -R extensions LICENSE SOURCE.md "$out/"
    runHook postInstall
  '';
  doInstallCheck = true;
  installCheckPhase = ''
    runHook preInstallCheck
    diff -r "$src/extensions" "$out/extensions"
    cmp "$src/LICENSE" "$out/LICENSE"
    cmp "$src/SOURCE.md" "$out/SOURCE.md"
    test -f "$out/extensions/classified-workflows/index.ts"
    test -f "$out/extensions/control-plane/harness-worker-main.ts"
    for omitted in browser-control local-models pi-vim todo; do
      test ! -e "$out/extensions/$omitted"
    done
    for omitted in owner-telegram bridge-cli caba-tracker; do
      test ! -e "$out/extensions/remote-control/$omitted.ts"
    done
    runHook postInstallCheck
  '';
  meta = {
    description = "Unmodified received shared Pi source for host-side integration";
    license = lib.licenses.mit;
    platforms = lib.platforms.all;
  };
}
