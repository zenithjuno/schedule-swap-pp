# Schedule Swap
Root `index.html` is the current app (see `docs/PREVIEW-REBUILD.md`); the previous app lives in `legacy/index.html`, and `js/core.js` is generated from it. Private school data must never be committed or embedded in published HTML.

## Preview (rebuilt 2026-11-16)
- Read `docs/PREVIEW-REBUILD.md` first. `js/core.js` is generated: change `tools/build-preview-core.cjs`, never the output.
- Symbol map: check `CODEMAP.md` before reading large `js/*.js` files (`core.js` is 1,797L).
- Anti-slop & syntax gate: `python3 ~/.codex/skills/gas-html-guard/scripts/gas_html_guard.py .` (exit 2 = FAIL, fix before commit).
- Verify: `node tools/build-preview-core.cjs && node tests/preview-core.cjs && git diff --exit-code -- legacy/index.html`
- The staged-build block below predates the rebuild; its stage gates and scope list are historical.

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
