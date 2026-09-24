# Pi source dependency

`packages.<system>.pi-source` provides the received shared Pi source under
`$out/extensions/` and its original MIT notice at `$out/LICENSE`. It copies the
selected files without compiling, formatting, upgrading dependencies, or
starting services. `source.nix` defines the source selection directly.

Consume it through a Metagenda flake input pinned by the consumer's
`flake.lock`:

```nix
piSource = inputs.metagenda.packages.${pkgs.system}.pi-source;
```

Replace corresponding local shared-source paths with `${piSource}/extensions/`.
Keep the existing host dependency installation and launch configuration.

This is a source snapshot, not a standalone Pi package or service release. The
host still assembles the shared files with separately owned modules at their
original relative paths. The package excludes personal browser/local-model code,
upstream pi-vim/todo copies, and personal remote-control
owner-telegram/bridge-cli/caba-tracker files. Do not delete these separately
owned dependencies when replacing shared copies. No extension manifest is
enrolled automatically.

The received source came from `0xgleb/dotconfig`, with published baseline
`540ea10b2892f33d6c5fc486287050a2b6092b7b`. Some transferred files retain
changes beyond that baseline; this package preserves the received bytes and does
not claim that every file matches the published revision. The original MIT
notice remains separate from the Metagenda root license.

The Nix install check compares every packaged source file and the license with
the input, and checks key entrypoint presence and ownership exclusions. This
verifies packaging, not SDK compatibility, extension execution, or live
adoption.
