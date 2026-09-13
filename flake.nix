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
          default = pkgs.callPackage ./default.nix { };
          fj = pkgs.callPackage ./tooling/fj { };
        };

        apps = {
          fj = {
            type = "app";
            program = "${packages.fj}/bin/fj";
          };
          default = {
            type = "app";
            program = "${packages.default}/bin/metagenda";
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
