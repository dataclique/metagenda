{
  lib,
  bun2nix,
  nodejs_26,
  nushell,
}:

bun2nix.mkDerivation {
  pname = "metagenda-pi-dashboard";
  version = "0.1.0";
  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.unions [
      ../package.json
      ../bun.lock
      ../cli/package.json
      ../packages/work-core/package.json
      ./build-dashboard.nu
      ./dashboard-build.test.mjs
      ./dashboard-toolchain.test.mjs
      ./LICENSE
      ./licenses/dockview-MIT.txt
      ./extensions/control-plane/job-runtime.ts
      ./extensions/control-plane/job-presentation.ts
      ./extensions/control-plane/harness-protocol.ts
      ./extensions/control-plane/harness-research-protocol.ts
      ./extensions/control-plane/review-duty-profile.ts
      ./extensions/control-plane/allowance-pool.ts
      ./extensions/control-plane/usage-policy.ts
      ./extensions/control-plane/dashboard/allowance-chart.ts
      ./extensions/control-plane/dashboard/dock-layout.ts
      ./extensions/control-plane/dashboard/app.tsx
      ./extensions/control-plane/dashboard/ControlPlaneDock.tsx
      ./extensions/control-plane/dashboard/app.css
      ./extensions/control-plane/dashboard/index.html
    ];
  };
  bunDeps = bun2nix.fetchBunDeps { bunNix = ../bun.nix; };
  nativeBuildInputs = [
    nodejs_26
    nushell
  ];
  dontRunLifecycleScripts = true;
  buildPhase = ''
    runHook preBuild
    nu --no-config-file --no-history pi/build-dashboard.nu "$TMPDIR/dashboard-assets"
    runHook postBuild
  '';
  doCheck = true;
  checkPhase = ''
    runHook preCheck
    node --test pi/dashboard-toolchain.test.mjs pi/dashboard-build.test.mjs
    runHook postCheck
  '';
  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp "$TMPDIR/dashboard-assets/"{app.js,app.css,index.html} "$out/"
    cp -r "$TMPDIR/dashboard-assets/licenses" "$out/licenses"
    runHook postInstall
  '';
  meta = {
    description = "Build-checked observational Pi dashboard assets";
    license = lib.licenses.mit;
    platforms = lib.platforms.unix;
  };
}
