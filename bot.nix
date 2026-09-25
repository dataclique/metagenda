{ bun2nix }:

bun2nix.mkDerivation {
  pname = "metagenda-bot";
  version = "0.1.0";
  src = ./.;

  bunDeps = bun2nix.fetchBunDeps {
    bunNix = ./bun.nix;
  };

  module = "bot/src/index.ts";
}
