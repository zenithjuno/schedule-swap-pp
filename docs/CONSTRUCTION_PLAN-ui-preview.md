# CONSTRUCTION PLAN — ui-preview
Control: `BUILD-CONTROL-ui-preview.md`. Task contract: `BLUEPRINT-ui-preview.md §Task contract`.
User approved S01 on 2026-11-11. Each stage is create → test → human review. “ผ่าน S01” closes S01 and authorizes starting S02; no blanket approval for all stages.

## Stage map
| Stage | Lifecycle | Gate |
|---|---|---|
| S01 | PASS | ผ่าน S01 |
| S02 | VERIFY | ผ่าน S02 |
| S03 | DEFERRED | settle partial-day leave rule first |
| S04 | PLANNED | preview both parties without approval |
| S05 | PLANNED | proposal paperwork and filters |
| S06 | DEFERRED | substitute mode and screen polish |
| S07 | PLANNED | end-to-end acceptance |

## S01 — ตั้งรุ่นทดลองและสำเนาข้อมูล
- Contract: DEC-001–DEC-005; Blueprint §1. รุ่นทดลองและสำเนาข้อมูล.
- Exact paths: `preview/index.html`, `tests/preview-s01.cjs`, `AGENTS.md`, `docs/BLUEPRINT-ui-preview.md`, `docs/CONSTRUCTION_PLAN-ui-preview.md`, `docs/BUILD-CONTROL-ui-preview.md`, `docs/history/BUILD-LOG-ui-preview-P01.md`, `docs/GRILL-LEDGER-ui-preview.md`.
- Read-only: `index.html`, `private/**`, existing engine specs and tests, previous audit/bug-plan documents.
- Create: clone standalone shell, isolate every persistent key, add review/copy summary and source-change protection, copied-at marker, return link, experimental export filenames.
- Test: `SWAP_PLAYWRIGHT_MODULE=/Users/chutpong/.npm/_npx/31e32ef8478fbf80/node_modules/playwright node tests/preview-s01.cjs`; existing ledger suite against preview; frozen engine self-test from real browser; root hash remains identical; original/preview storage isolation including restored and self-exported variants; malformed/missing/quota/source-change cases.
- Quota regression: run the focused command with `SWAP_SOURCE_BACKUP=private/swap_backup_2569-2_2026-11-10.json SWAP_QUOTA_BYTES=5242880`; includes 400 KiB unrelated same-origin data, all-row round trip, normal JSON backup and ready-file compatibility.
- Publication: add only managed files; push without rewriting root; verify new URL content and root content against baseline; wait for deployment.
- Checkpoint: scoped git commit on main, no unrelated audit documents or private data.
- Pass gate: published working preview with copy action and proof root preserved; stop for user to try before S02.

## S02 — หน้าแรกและผลค้นหา
- Contract: DEC-001–DEC-006; Blueprint §2. หน้าแรกและผลค้นหา (S02).
- Exact paths: `preview/index.html`, `tests/preview-s02.cjs`, `docs/BLUEPRINT-ui-preview.md`, `docs/CONSTRUCTION_PLAN-ui-preview.md`, `docs/BUILD-CONTROL-ui-preview.md`, `docs/history/BUILD-LOG-ui-preview-P01.md`.
- Read-only: root index.html, existing S01 test and private fixtures/specs.
- Build: compact stage shell; new homepage layout; candidate cards and accessible buttons; folded detail; responsive screen styles. No new dependencies, ranking, validation, storage format or candidate generation changes.
- Test: `SWAP_PLAYWRIGHT_MODULE=/Users/chutpong/.npm/_npx/31e32ef8478fbf80/node_modules/playwright node tests/preview-s02.cjs`; run existing S01 byte-quota regression and ledger suite. Compare real-case candidate fields against stable root engine, update week/date/warnings, keyboard expand/save, empty states and 390px fit. Visually inspect desktop/mobile screenshots. Root unchanged; no personal data in public files.
- Checkpoint/publication: scoped main commit; update only existing preview URL; verify deployed bytes and preserved root.
- Pass gate: show S02 live to user; stop before S03 policy/logic work.

## S03 — ความถูกต้อง
DEFERRED until policy confirmation. Independent expectations for same-weekday dates; validation of return during leave; consistent subject/group/room across all outputs (S02 detail now labels the partner subject as reference rather than mixing it with the requester room); autocomplete coherence. Read existing bug plan; do not blindly rewrite fixture.

## S04 — ตารางจำลอง
PLANNED. Approved entries as baseline plus only selected candidate; both parties, before/after, experimental watermark, print before save/approval. No ledger writes from viewing.

## S05 — ข้อเสนอและใบขออนุมัติ
PLANNED. Filter by teacher/round/status; form before approval; one applicant per form; no rows ≠ no teaching.

## S06 — สอนแทนและการใช้งาน
DEFERRED. Separate one-way substitute eligibility, draft persistence, narrow screens and disabled empty actions.

## S07 — ตรวจรับ
PLANNED. End-to-end copy → absence → candidate → preview/print → proposal/form → approval → real timetable → cancel/restore. Root remains available.
