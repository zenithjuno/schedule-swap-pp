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
- Focused test command: `SWAP_PLAYWRIGHT_MODULE=/Users/chutpong/.npm/_npx/31e32ef8478fbf80/node_modules/playwright node tests/preview-a.cjs`
- Regression command: `node private/test_ledger_suite.js preview/index.html`
- Static command: `git diff --exit-code -- index.html`
### Artifacts
- Working: `private/ux-preview/**`, `.impeccable/review/**` (private captures, ignored)
- Final outputs: `preview/index.html`
- Temporary/disposable: `/tmp/swap-preview-*`
### Boundaries
- Managed: `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/surfaces/**`, `preview/**`, `tests/**`, `AGENTS.md`, `docs/SHAPE-ui-overhaul.md`, `docs/BLUEPRINT-ui-preview.md`, `docs/CONSTRUCTION_PLAN-ui-preview.md`, `docs/BUILD-CONTROL-ui-preview.md`, `docs/history/**`, `docs/GRILL-LEDGER-ui-preview.md`
- Read-only: `index.html`, `private/**`, `docs/BLUEPRINT-swap-html.md`, `docs/PLAN-fix-same-weekday-giveback.md`, `docs/UX-UI-AUDIT-2026-11-11.md`
- Protected: `.gitignore`, `templates/**`
### Current truth surfaces
| Role | Canonical source | Refresh trigger | Coverage |
|---|---|---|---|
| product-contract | `BLUEPRINT-ui-preview.md` | behavior change | semantic |
| execution-plan | `CONSTRUCTION_PLAN-ui-preview.md` | stage transition | semantic |
| operational-state | `BUILD-CONTROL-ui-preview.md §STATE` | every transition | structural |
| product-context | `../PRODUCT.md` | confirmed users/jobs/workflow change | semantic |
| accepted-design-brief | `SHAPE-ui-overhaul.md` | user concept/brief decision | semantic |
| legacy-product-contract | `BLUEPRINT-swap-html.md` | root changes (not authorized) | semantic |

## STATE
- Current stage: `S02A`
- Done: `S01 (accepted by user 2026-11-11)`
- Open / next: `Set A built, reviewed and documented; user review before B.`
- Active gate: `S02A delivered for user review; do not start B until accepted.`
- Active history log: `history/BUILD-LOG-ui-preview-P01.md`
- Last change: `PRG-006 — set A published and byte-verified; user review pending`

## VERSION CONTROL
- Mode: `git`
- Repository root: `.`
- Branch: `main`
- Approved-plan baseline: `7134bfb1b32b5c143589976ecfc50eb00df3f5f3`
- Current checkpoint: `build/ui-preview/S02A-delivery`
- Working-tree state: `CLEAN — managed stage checkpoint; unrelated historical audit files remain untracked`
- Checkpoint rule: `scoped commit per delivered stage; no unrelated files`

## ACTIVE CONTRACT INDEX
| Scope | Active contract | Current source | Enforcement |
|---|---|---|---|
| `preview/**` | `DEC-001`, `DEC-002`, `DEC-003`, `DEC-004`, `DEC-005`, `DEC-008` | `BLUEPRINT-ui-preview.md` | `tests/preview-s01.cjs`, `tests/preview-a.cjs` |
| `tests/**` | `DEC-001`, `DEC-002`, `DEC-005`, `DEC-008` | `BLUEPRINT-ui-preview.md` | browser isolation, UI interaction and original digest assertions |


## OPEN CHANGES
- Partial-day return policy must be settled before set B's related correctness change. Owner: user; trigger: B planning.
- Agreement tracking must be mapped to existing statuses before set D; no new stored enum authorized. Owner: implementation review; trigger: D planning.

## HISTORY INDEX
| Segment | Stages | Status | Log |
|---|---|---|---|
| P01 | S01–S02 | IN PROGRESS | `history/BUILD-LOG-ui-preview-P01.md` |
