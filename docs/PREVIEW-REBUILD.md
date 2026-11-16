# Preview rebuild — 2026-11-16 (CHG-002)

The user asked for a one-shot rebuild of the preview's UI and structure with full
authority, replacing the staged S01–S02A preview (its last version is in git
history at `99921a9`). The stage gates in `BUILD-CONTROL-ui-preview.md` no longer
describe the current preview. Root `index.html` and its storage are still untouched.

## Structure
| Path | What |
|---|---|
| `preview/index.html` | Shell only (~3 KB). Empty `embedded-data` island. |
| `preview/css/app.css` | All screen + print styles. System Thai sans on screen; TH Sarabun New only for paper. |
| `preview/js/core.js` | **Generated** by `tools/build-preview-core.cjs` — engine, ledger, store, import contract, leave model copied verbatim from root `index.html` by line range, plus the listed patches. Never edit by hand. |
| `preview/js/base.js` | State, router, dialogs, shared timetable renderer, write-gates. |
| `preview/js/plan.js` · `pick.js` · `records.js` · `docs.js` · `data.js` · `main.js` | Pages: จัดคาบที่ลา · หาคนแทน · รายการ + ตารางไปคุย · ตารางสอน + ใบขอแลกคาบ · ข้อมูล · boot. |
| `preview/assets/` | Loaded only when needed: `xlsx.js` (import/templates), `selftest-fixture.js` (ตรวจสอบระบบ), fonts (paper). |

Page weight on first load: about 0.3 MB (was 2.6 MB in one file).

## Patches applied to the copied logic (see the build script)
1. Store key `swapApp.preview.v1`, compact envelope `SWAP-PREVIEW-TABLES-2:` (reads v1 and plain JSON). A load failure is kept and blocks saving, so a corrupt store is never overwritten with an empty one.
2. Oracle fixture is a lazily loaded file instead of an inline island.
3. `docs/PLAN-fix-same-weekday-giveback.md`: with real dates, a give-back on the same weekday is a different calendar date — no combining. The dateless oracle path is unchanged (self-test stays 21/21). **This changes scores/ranks versus the root site for same-weekday pairs.**
4. Template example row uses a fictional name.

## Behaviour added in the UI layer (no stored-schema change)
- ตารางไปคุย: both teachers' full-week tables before approval, as a labelled simulation; never changes status or reserves a slot by viewing (audit F01).
- ใบขอแลกคาบ works from เสนอ / รออนุมัติ rows and is filtered to one requester (F02).
- Change sentences keep each teacher's own subject and room (F05).
- The absent teacher only changes by picking from the list (F06).
- “สอนแทน ไม่ต้องคืน” search: any teacher free in that slot, same `free()` rule and ledger (F07).
- A give-back on the absence date is selectable only when a leave round says that period is not on leave; give-back dates outside the semester are not offered (F04).

## ใบขอแลกคาบ → PDF / DOCX (added 2026-11-16)
`preview/js/formdoc.js` lays the พพ.1-1 form out from measurements of a real signed copy: one A4 page per leave day, crest, dotted leaders, all on one page. The same model feeds both writers, with no external library.
- **PDF**: each page is drawn on a canvas (the browser shapes Thai correctly) and stored as a full-page image at 220 dpi. Text in the PDF is therefore not selectable.
- **DOCX**: real editable Word XML (TH Sarabun New, exact line spacing, Wingdings 2 tick boxes), zipped store-only.
- Per-teacher fields (ตำแหน่ง, กลุ่มสาระ, signatories) live in `STORE.data.formProfiles`, the crest in `STORE.data.formLogo` — local store and backups only, never in the repo.
- Checked by converting the DOCX with LibreOffice and rasterising both outputs. Not yet opened in Microsoft Word itself.

## Getting data in and out (reworked 2026-11-16)
Real data never lives on the public site, so every browser needs one file once. `preview/js/data.js` now has a single entry point: drop or choose any file, anywhere on the page. The app classifies it, says what it is, and asks before changing anything.
| File | Recognised by | Effect |
|---|---|---|
| School data file `ข้อมูลตารางสอน_<ภาคเรียน>.json` | `kind:"swap-data-pack"` | New semester, or — if that semester already exists — replaces timetable + phones and keeps the user's swap records and leave rounds |
| Personal backup `.json` (this app or the stable site) | `schemaVersion` + `semesters` | Replaces the whole local store, after a warning |
| Timetable `.xlsx` | sheet `VERIFIED_DATA` | Import contract → name the semester |
| Phones `.xlsx` | `teacher_id … phone` header | Replaces the phone book |
The school data file holds timetable + phones + settings only (no swap records), in the same compact table as the local store (~140 KB). It contains personal data: it is shared person to person (LINE, Drive) and is git-ignored.

## Verify
```
node tools/build-preview-core.cjs
node tests/preview-core.cjs [private/swap_backup_….json]
node private/test_ledger_suite.js preview/js/core.js
git diff --exit-code -- index.html
node tools/serve-preview.cjs      # http://127.0.0.1:8765/preview/
```
Not yet verified: printed/PDF pagination, Safari, and the GitHub Pages deployment.
