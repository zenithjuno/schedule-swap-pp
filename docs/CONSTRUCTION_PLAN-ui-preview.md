# CONSTRUCTION PLAN — ui-preview
Control: `BUILD-CONTROL-ui-preview.md`. Task contract: `BLUEPRINT-ui-preview.md §Task contract`.
User approved S01 on 2026-11-11. Each stage is create → test → human review. “ผ่าน S01” closes S01 and authorizes starting S02; no blanket approval for all stages.

CHG-001 accepted: user chose the library composition, accepted SHAPE-ui-overhaul.md and authorized set A (S02A). S03–S07 correspond to sets B–F and remain gated. The rejected S02 visual recipe is retired.

## Stage map
| Stage | Lifecycle | Gate |
|---|---|---|
| S01 | PASS | ผ่าน S01 |
| S02 | RETIRED | rejected card design; replaced by S02A |
| S02A | VERIFY | set A user review |
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
RETIRED: failed design acceptance; replaced by S02A. tests/preview-s02.cjs records the old composition and is not the current UI acceptance command.

## S02A — ชุด A: โครงหน้าและพื้นที่คัดเลือก
- Authorization: user accepted full SHAPE brief and said “ชุด A ได้เลย”. Replaces S02 visual composition; subsequent B–F remain review-gated.
- Contract: DEC-001–005, DEC-008; SHAPE-ui-overhaul.md; library decision sketch.
- Modify/create scope: `preview/index.html`, `tests/preview-a.cjs`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/surfaces/**`, current blueprint/plan/control/shape and active history log. Root `index.html`, S01 tests, private fixtures/engine spec remain read-only. Replace S02 composition assertions with A tests, retain S02 test file as historical evidence.
- Create: four destination navigation with all seven legacy routes accessible; home starts/resumes existing leave rounds; results period rail covers the selected round's declared teaching periods across dates; semantic comparison table preserves every candidate/offset and detail evidence; selected-proposal bar groups the round's existing non-cancelled log rows by partner. User explicitly selects and saves as เสนอ through existing save/ledger path; opening/navigating does not save. Selected state survives navigation/reload via existing records. No new draft schema, no auto-approval, no simulation button before C exists.
- Date/period changes re-run the existing engine from current context; no retained stale candidate object across periods. Existing read-only, duplicate and collision guards stay enforced. Existing settings/forms/timetable/help remain available; UI overhaul there deferred.
- Verify: `SWAP_PLAYWRIGHT_MODULE=/Users/chutpong/.npm/_npx/31e32ef8478fbf80/node_modules/playwright node tests/preview-a.cjs` with fixture and real backup; unchanged engine region and candidate fields against stable page; create/select round, navigate across dates, keyboard details/week/save, selected summary refresh/reload, empty/error/archive/long content and all seven destinations. Desktop 1440/1280, mobile 390; capture real data privately; S01 full-data quota test and existing ledger suite; root digest; independent finish review and design documentation.
- Delivery: publish only preview after checks; preserve root deployed bytes and private data isolation. Checkpoint under `build/ui-preview/S02A`; stop for user review before B.

## S03 — ชุด B: ความถูกต้อง
DEFERRED until policy confirmation. Independent expectations for same-weekday dates; validation of return during leave; consistent subject/group/room across all outputs (S02 detail now labels the partner subject as reference rather than mixing it with the requester room); autocomplete coherence. Read existing bug plan; do not blindly rewrite fixture.

## S04 — ชุด C: ตารางจำลอง
PLANNED. Approved entries as baseline plus only selected candidate; both parties, before/after, experimental watermark, print before save/approval. No ledger writes from viewing.

## S05 — ชุด D: ข้อเสนอและใบขออนุมัติ
PLANNED. Filter by teacher/round/status; form before approval; one applicant per form; no rows ≠ no teaching.

## S06 — ชุด E: สอนแทนและการใช้งาน
DEFERRED. Separate one-way substitute eligibility, draft persistence, narrow screens and disabled empty actions.

## S07 — ชุด F: ตรวจรับ
PLANNED. End-to-end copy → absence → candidate → preview/print → proposal/form → approval → real timetable → cancel/restore. Root remains available.
