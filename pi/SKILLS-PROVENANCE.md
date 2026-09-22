# Pi skills receiving contract

The owner requested the public skills from `0xgleb/dotconfig` as part of the Pi
setup, including Nix exposure. The earlier three-inspector proposal is not the
completion target.

## Source and file boundary

Source repository: <https://github.com/0xgleb/dotconfig>. Revision:
`540ea10b2892f33d6c5fc486287050a2b6092b7b`.

The selected file boundary is the 46 `ai/skills/<name>/SKILL.md` documents at
that revision, plus these five referenced support files:

- `ai/skills/gitbutler/references/reference.md`
- `ai/skills/gitbutler/references/concepts.md`
- `ai/skills/gitbutler/references/examples.md`
- `ai/skills/eod/scripts/collect.nu`
- `ai/skills/eod/scripts/evidence.nu`

Source bytes and Git blob identities were retrieved through exact public GitHub
Contents paths. No host configuration, credentials, runtime state, extension
implementation, or dependency cache belongs to this file boundary. The source
MIT notice is preserved in `pi/LICENSE`; existing attribution and links in the
skills must remain. This is not a claim that every referenced external tool is
owned by Metagenda.

## Output contract

The receiving output is `packages.<system>.pi-skills`, additive to the existing
CLI and `fj` packages. It installs the selected files at
`$out/share/metagenda/pi-skills/skills/`, preserving directories and relative
support-file references, with the MIT notice and this provenance record. An
explicit Pi package manifest lists the 46 skill directories under `pi.skills`;
it must not enroll any extension, invoke the skills, or activate host settings.

A successful output must contain all 46 requested skill documents and five
support files, not just the initial three inspectors. Each platform needs its
own build verification; current evidence is recorded below.

## Compatibility limits

Several source instructions refer to host installation paths. Review skills
refer to `~/.claude/skills/review-core/SKILL.md`; `eod` refers to its collector
through the original dotconfig path; `eow` and `new-skill` describe personal
workspace or dotconfig conventions. Preserve these source instructions rather
than silently changing their behavior. They are documented host assumptions, not
permission to access or copy the referenced configuration or personal data.
Packaging them does not prove those commands work on an arbitrary host.

The referenced review-core, review-loop, review-pr and review-sweep documents
are present in the 46-file source inventory. `/questions` is a command provided
by the questions extension, not a missing skill document. Host commands such as
`pi-bridge`, `gh`, `but`, `cargo`, `forge`, and `nix` remain external
requirements. The EOD collector's `evidence.nu` sibling is included in the
selected support closure. Scripts are packaged as source, not executed during
import.

## Intake review

The bounded review covered 45 files: 21 in its first group (including the five
support files), 16 in its second, and eight in its interrupted third group.
Those reviews found instruction/example text and host assumptions, not embedded
credentials or copied host state. Follow-up parent reads covered the six
remaining skills: shape-work, strong-typing-inspector, test-inspector,
threat-model-first, unslop, and worktree. Those texts likewise contain workflow
instructions and examples, not copied personal configuration. This is file
inspection evidence, not proof that host-specific commands work portably or
permission to invoke them. Source attribution remains unchanged.

## Current receiving status

`skills.nix` fetches all 51 selected public files by revision and SHA256 from
`skills-source.json`, without copying the Dotconfig checkout. It generates the
explicit 46-resource manifest and installs the source inventory, MIT notice, and
this record.

The real Apple Silicon flake output built successfully, and its installed
hash/resource test passed. Metadata tests also pass. The post-documentation
build emitted a segmentation fault in Nix's temporary-path audit subprocess,
then completed its install check and exited zero. The artifact check passed; the
upstream audit warning remains unresolved. Four-platform CI has not yet produced
results for this change.

The three initial local copies remain preserved; they are not Nix package
inputs. Publication, other-platform verification, and full shared Pi runtime
integration remain unfinished.
