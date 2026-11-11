# Build Control — UI Preview

## ENTRYPOINT
- Slug: `ui-preview`
- Control schema: `2`
- Project root: `/Users/chutpong/Documents/Claude โปรแกรมแลกคาบ/schedule-swap`
- Blueprint: `BLUEPRINT-ui-preview.md`
- Construction plan: `CONSTRUCTION_PLAN-ui-preview.md`
- Task contract: `BLUEPRINT-ui-preview.md §Task contract`
- AGENTS instructions: `../AGENTS.md`

## PROJECT MAP
### Code
- Original application: `index.html` (protected)
- Preview application: `preview/index.html`
### Verification
- Focused test command: `SWAP_PLAYWRIGHT_MODULE=/Users/chutpong/.npm/_npx/31e32ef8478fbf80/node_modules/playwright node tests/preview-s02.cjs`
- Regression command: `node private/test_ledger_suite.js preview/index.html`
- Static command: `git diff --exit-code -- index.html`
### Artifacts
- Working: `private/ux-preview/**`
- Final outputs: `preview/index.html`
- Temporary/disposable: `/tmp/swap-preview-*`
### Boundaries
- Managed: `preview/**`, `tests/**`, `AGENTS.md`, `docs/BLUEPRINT-ui-preview.md`, `docs/CONSTRUCTION_PLAN-ui-preview.md`, `docs/BUILD-CONTROL-ui-preview.md`, `docs/history/**`, `docs/GRILL-LEDGER-ui-preview.md`
- Read-only: `index.html`, `private/**`, `docs/BLUEPRINT-swap-html.md`, `docs/PLAN-fix-same-weekday-giveback.md`, `docs/UX-UI-AUDIT-2026-11-11.md`
- Protected: `.gitignore`, `templates/**`
### Current truth surfaces
| Role | Canonical source | Refresh trigger | Coverage |
|---|---|---|---|
| product-contract | `BLUEPRINT-ui-preview.md` | behavior change | semantic |
| execution-plan | `CONSTRUCTION_PLAN-ui-preview.md` | stage transition | semantic |
| operational-state | `BUILD-CONTROL-ui-preview.md §STATE` | every transition | structural |
| legacy-product-contract | `BLUEPRINT-swap-html.md` | root changes (not authorized) | semantic |

## STATE
- Current stage: `S02`
- Done: `S01 (accepted by user 2026-11-11)`
- Open / next: `S02 verified locally; deploy and await user review before S03.`
- Active gate: `ผ่าน S02`
- Active history log: `history/BUILD-LOG-ui-preview-P01.md`
- Last change: `PRG-006 — S02 ready for review`

## VERSION CONTROL
- Mode: `git`
- Repository root: `.`
- Branch: `main`
- Approved-plan baseline: `7134bfb1b32b5c143589976ecfc50eb00df3f5f3`
- Current checkpoint: `build/ui-preview/S02`
- Working-tree state: `CLEAN`
- Checkpoint rule: `scoped commit per delivered stage; no unrelated files`

## ACTIVE CONTRACT INDEX
| Scope | Active contract | Current source | Enforcement |
|---|---|---|---|
| `preview/**` | `DEC-001`, `DEC-002`, `DEC-003`, `DEC-004`, `DEC-005`, `DEC-006` | `BLUEPRINT-ui-preview.md` | `tests/preview-s01.cjs`, `tests/preview-s02.cjs` |
| `tests/**` | `DEC-001`, `DEC-002`, `DEC-005`, `DEC-006` | `BLUEPRINT-ui-preview.md` | browser isolation, UI interaction and original digest assertions |


## OPEN CHANGES
- (none)

## HISTORY INDEX
| Segment | Stages | Status | Log |
|---|---|---|---|
| P01 | S01–S02 | IN PROGRESS | `history/BUILD-LOG-ui-preview-P01.md` |
