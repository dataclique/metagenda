{
  lib,
  stdenvNoCC,
  fetchurl,
  nodejs_26,
  nushell,
}:

let
  source = builtins.fromJSON (builtins.readFile ./skills-source.json);
  skillFiles = builtins.filter (file: lib.hasSuffix "/SKILL.md" file.path) source.files;
  manifest = builtins.toJSON {
    name = "@metagenda/pi-skills";
    version = "0.1.0";
    private = true;
    pi.skills = map (file: "./skills/${builtins.dirOf file.path}") skillFiles;
  };
  installFile =
    file:
    let
      fetched = fetchurl {
        url = "https://raw.githubusercontent.com/${source.repository}/${source.revision}/ai/skills/${file.path}";
        sha256 = file.sha256;
      };
    in
    ''install -Dm644 ${fetched} "$destination"/${lib.escapeShellArg "skills/${file.path}"}'';
in
stdenvNoCC.mkDerivation {
  pname = "metagenda-pi-skills";
  version = "0.1.0";
  dontUnpack = true;
  dontBuild = true;
  nativeBuildInputs = [
    nodejs_26
    nushell
  ];
  doInstallCheck = true;
  installCheckPhase = ''
    runHook preInstallCheck
    nu --no-config-file --no-history ${./test-skills-verifier.nu} \
      "$out/share/metagenda/pi-skills" ${./skills-installed.test.ts} "$TMPDIR"
    runHook postInstallCheck
  '';
  installPhase = ''
    runHook preInstall
    destination="$out/share/metagenda/pi-skills"
    mkdir -p "$destination"
    ${lib.concatMapStringsSep "\n" installFile source.files}
    install -m644 ${builtins.toFile "pi-skills-package.json" manifest} "$destination/package.json"
    install -m644 ${./LICENSE} "$destination/LICENSE"
    install -m644 ${./SKILLS-PROVENANCE.md} "$destination/PROVENANCE.md"
    install -m644 ${./skills-source.json} "$destination/SOURCE.json"
    runHook postInstall
  '';
  meta = {
    description = "Hash-pinned Pi skills and their source support files";
    license = lib.licenses.mit;
    platforms = lib.platforms.unix;
  };
}
