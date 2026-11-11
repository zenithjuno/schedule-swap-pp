# Schedule Swap
Root `index.html` is the stable application. Do not edit it during preview work. Private school data must never be committed or embedded in published HTML.

<!-- grill-to-build:ui-preview:start -->
## Active staged build: ui-preview
- Control file: `docs/BUILD-CONTROL-ui-preview.md`
- Validate: `python3 /Users/chutpong/.codex/skills/build-changelog/scripts/build_context.py validate docs/BUILD-CONTROL-ui-preview.md`
- Context: `python3 /Users/chutpong/.codex/skills/build-changelog/scripts/build_context.py context docs/BUILD-CONTROL-ui-preview.md`
- Lookup: `python3 /Users/chutpong/.codex/skills/build-changelog/scripts/build_context.py lookup docs/BUILD-CONTROL-ui-preview.md PRG-001`
- Scope gate: `python3 /Users/chutpong/.codex/skills/build-changelog/scripts/build_context.py check-scope docs/BUILD-CONTROL-ui-preview.md preview/index.html tests/preview-s01.cjs`
- Doctor: `python3 /Users/chutpong/.codex/skills/build-changelog/scripts/build_context.py doctor docs/BUILD-CONTROL-ui-preview.md`
- Stale-claim sweep: `python3 /Users/chutpong/.codex/skills/build-changelog/scripts/build_context.py grep-current docs/BUILD-CONTROL-ui-preview.md "NOT STARTED — awaiting plan approval"`
- Begin with Validate and Context; read active contract and current stage only.
- Do not bulk-read history; edit/checkpoint only declared paths.
- Scope gate exit 3 blocks edits. Protected files stay unchanged.
- Honor stage gates; no S02 until S01 review. Update current contract/plan/control on transitions.
<!-- grill-to-build:ui-preview:end -->
