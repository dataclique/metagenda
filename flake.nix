{
  inputs = {
    # Nix
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    systems.url = "github:nix-systems/default";
    flake-utils = {
      url = "github:numtide/flake-utils";
      inputs.systems.follows = "systems";
    };
    pre-commit-hooks = {
      url = "github:cachix/git-hooks.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    bun2nix = {
      url = "github:nix-community/bun2nix/2.1.2";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.systems.follows = "systems";
    };
    but = {
      url = "github:dataclique/but.nix";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.flake-utils.follows = "flake-utils";
    };
    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.git-hooks.follows = "pre-commit-hooks";
    };
  };

  outputs =
    inputs@{
      self,
      nixpkgs,
      flake-utils,
      pre-commit-hooks,
      bun2nix,
      devenv,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ bun2nix.overlays.default ];
        };

        hooks = {
          actionlint.enable = true;
          beautysh.enable = true;
          check-added-large-files.enable = true;
          eslint.enable = true;
          nil.enable = true;
          nixfmt.enable = true;
          shellcheck.enable = false;
        };

      in
      rec {
        packages = {
          devenv-up = self.devShells.${system}.default.config.procfileScript;
          fj = pkgs.callPackage ./tooling/fj { };
          pi-skills = pkgs.callPackage ./pi/skills.nix { };
        };

        apps = {
          fj = {
            type = "app";
            program = "${packages.fj}/bin/fj";
          };
        };

        devShells = {
          default = devenv.lib.mkShell {
            inherit inputs pkgs;
            modules = [
              {
                # https://devenv.sh/reference/options/
                packages = with pkgs; [
                  inputs.but.packages.${system}.gitbutler-cli
                  pkgs.bun2nix
                  deno
                  nil
                  nixfmt
                  nushell
                  obs-cmd
                ];

                languages = {
                  nix.enable = true;
                  typescript.enable = true;
                  javascript = {
                    enable = true;
                    package = pkgs.nodejs_26;
                    bun.enable = true;
                    bun.install.enable = true;
                  };
                  python = {
                    enable = true;
                    venv = {
                      quiet = true;
                      requirements = "auto-editor";
                    };
                  };
                };

                delta.enable = true;
                dotenv.disableHint = true;
                difftastic.enable = true;
                git-hooks.hooks = hooks;
              }
            ];
          };
        };

        checks = {
          fj = packages.fj;
          work-core = pkgs.bun2nix.mkDerivation {
            pname = "metagenda-work-core-check";
            version = "0.1.0";
            src = ./.;
            bunDeps = pkgs.bun2nix.fetchBunDeps { bunNix = ./bun.nix; };
            nativeBuildInputs = [
              pkgs.nodejs_26
              pkgs.nushell
            ];
            dontRunLifecycleScripts = true;
            buildPhase = ''
              runHook preBuild
              bun run --cwd packages/work-core typecheck
              bun run --cwd packages/work-core lint
              bun run --cwd packages/work-core build
              runHook postBuild
            '';
            doCheck = true;
            checkPhase = ''
              runHook preCheck
              bun run --cwd packages/work-core test
              nu --no-config-file --no-history packages/work-core/test-consumer.nu "$TMPDIR"
              runHook postCheck
            '';
            installPhase = ''
              runHook preInstall
              mkdir -p "$out"
              cp -r packages/work-core/dist "$out/dist"
              cp packages/work-core/package.json packages/work-core/LICENSE packages/work-core/PROVENANCE.md "$out/"
              runHook postInstall
            '';
          };
          pre-commit = pre-commit-hooks.lib.${system}.run {
            src = ./.;
            inherit hooks;
          };
        };
      }
    );

  nixConfig = {
    extra-trusted-public-keys = "devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw=";
    extra-substituters = "https://devenv.cachix.org";
  };
}
