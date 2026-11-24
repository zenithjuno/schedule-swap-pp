# Site layout (2026-11-16, final)
| URL | Content |
|---|---|
| `/schedule-swap-pp/` | **The app** (this document) |
| `/schedule-swap-pp/legacy/` | The previous single-file app, kept as-is with a banner; the logic core below is generated from it |
| `/schedule-swap-pp/preview/` | Redirect stub to `/` (old bookmarks) |
Both apps share one browser origin but different storage keys (`swapApp.preview.v1` for this app — the key name is kept so existing data stays — and `swapApp.v1` for legacy), so neither touches the other's data. The app's "copy from legacy" reads `swapApp.v1` read-only.

# Preview rebuild — 2026-11-16 (CHG-002)

The user asked for a one-shot rebuild of the preview's UI and structure with full
authority, replacing the staged S01–S02A preview (its last version is in git
history at `99921a9`). The stage gates in `BUILD-CONTROL-ui-preview.md` no longer
describe the current preview. The old app was untouched during the rebuild.

## Structure
| Path | What |
|---|---|
| `index.html` | Shell only (~3 KB). Empty `embedded-data` island. |
| `css/app.css` | All screen + print styles. System Thai sans on screen; TH Sarabun New only for paper. |
| `js/core.js` | **Generated** by `tools/build-preview-core.cjs` — engine, ledger, store, import contract, leave model copied verbatim from root `index.html` by line range, plus the listed patches. Never edit by hand. |
| `js/base.js` | State, router, dialogs, shared timetable renderer, write-gates. |
| `js/plan.js` · `pick.js` · `records.js` · `docs.js` · `data.js` · `main.js` | Pages: จัดคาบที่ลา · หาคนแทน · รายการ + ตารางไปคุย · ตารางสอน + ใบขอแลกคาบ · ข้อมูล · boot. |
| `assets/` | Loaded only when needed: `xlsx.js` (import/templates), `selftest-fixture.js` (ตรวจสอบระบบ), fonts (paper). |

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
`js/formdoc.js` lays the พพ.1-1 form out from measurements of a real signed copy: one A4 page per leave day, crest, dotted leaders, all on one page. The same model feeds both writers, with no external library.
- **PDF**: each page is drawn on a canvas (the browser shapes Thai correctly) and stored as a full-page image at 220 dpi. Text in the PDF is therefore not selectable.
- **DOCX**: real editable Word XML (TH Sarabun New, exact line spacing, Wingdings 2 tick boxes), zipped store-only.
- Per-teacher fields (ตำแหน่ง, กลุ่มสาระ, signatories) live in `STORE.data.formProfiles`, the crest in `STORE.data.formLogo` — local store and backups only, never in the repo.
- Checked by converting the DOCX with LibreOffice and rasterising both outputs. Not yet opened in Microsoft Word itself.

## Getting data in and out (reworked 2026-11-16)
Real data never lives on the public site, so every browser needs one file once. `js/data.js` now has a single entry point: drop or choose any file, anywhere on the page. The app classifies it, says what it is, and asks before changing anything.
| File | Recognised by | Effect |
|---|---|---|
| School data file `ข้อมูลตารางสอน_<ภาคเรียน>.json` | `kind:"swap-data-pack"` | New semester, or — if that semester already exists — replaces timetable + phones and keeps the user's swap records and leave rounds |
| Personal backup `.json` (this app or the stable site) | `schemaVersion` + `semesters` | Replaces the whole local store, after a warning |
| Timetable `.xlsx` | sheet `VERIFIED_DATA` | Import contract → name the semester |
| Phones `.xlsx` | `teacher_id … phone` header | Replaces the phone book |
The school data file holds timetable + phones + settings only (no swap records), in the same compact table as the local store (~140 KB). It contains personal data: it is shared person to person (LINE, Drive) and is git-ignored.

## Dynamic load — swaps already on the books (2026-11-20)
`js/dynamic.js` re-scores each candidate against the *effective* timetable of the two real dates involved: base timetable + every live record (เสนอ / รออนุมัติ / อนุมัติแล้ว; ยกเลิก frees) + the candidate's own two moves. This feeds the overload and consecutive-run penalties, the before→after load table, the tags, the rank order and the saved record.
- Pick page: the week chips mark a week "แน่นขึ้น" when swaps already made would lower the score there; the default week skips such weeks (only when the plain timetable would not be tighter, so with no swaps the result is identical to before); the detail panel says how many swapped-in periods each teacher already has that day.
- สอนแทน-only search uses the same effective counts.
- Weekly workload term (2026-11-23): the covering teacher's periods in the actual week of the absence (Mon–Fri), counting swaps already made AND this swap. A give-back in the same week leaves that load unchanged; a give-back in another week adds one period, so it scores one bonus step lower than the legacy engine (which counts the base week before the swap). Holidays are not modelled.
- The absent teacher's load in the give-back week is shown in the detail panel ("จำนวนคาบสอนในสัปดาห์") but not scored: they teach the make-up whoever covers.
- Each week chip shows the score that week would get, so tighter weeks are visible without clicking.
- Same covering teacher with two possible give-back periods stays as two rows (user decision 2026-11-23).
- Still plain-timetable (not dynamic): student walking between buildings.
- Not added on purpose: any penalty for piling swaps on the same weekday across the semester (the user does not want that).
- Tests: `node tests/preview-dynamic.cjs` — hand-computed expectations plus equality with the engine on the oracle fixture when the log is empty.

## Verify
```
node tools/build-preview-core.cjs
node tests/preview-core.cjs [private/swap_backup_….json]
node tests/preview-dynamic.cjs
node private/test_ledger_suite.js legacy/index.html
node tools/serve-preview.cjs      # http://127.0.0.1:8765/  (old app: /legacy/)
```
Not yet verified: printed/PDF pagination, Safari, and the GitHub Pages deployment.

## จัดคนสอนแทนทั้งวัน (`#subs/<date>`, js/subs.js)
- Entry: button "จัดคนสอนแทนทั้งวัน" on a day card in the plan page when 2+ periods still need cover.
- UI over `S.activeModes().planSubstitutes()` / `S.commitMode('substitute')` from js/modes.js (see docs/MODES-ENGINE.md). Saves `kind:'สอนแทน'`, status เสนอ, `recordLeave:false` (leave rounds stay managed by the plan page).
- Subject-group filter (both here and in the single-period "สอนแทน ไม่ต้องคืน" list): groups come from the first letter of every subject code a teacher teaches (อ จ ญ ฝ = ภาษาต่างประเทศ). It narrows the list; a name search always looks through everyone.
- Substitute score `S.subScore` (js/dynamic.js), its own formula since v3 (2026-11-25): BASE + subject group (20) + this class (15) + same subject in another class (10) + same grade, not this class (5) − 4 per period already taught that day − day overload − long run ± weekly load (1 per period from the baseline, capped at ±10) − 5 per cover (no give-back) in the 30 days before (`S.recentCovers`) − meeting − lunch. All weights are `SUB_*` settings, added to DEFAULT_SETTINGS / SETTINGS_META at load time by dynamic.js. Stored settings are upgraded step by step (`SCORE_DEFAULTS_V` 2 → 3); a value someone changed is kept.
- CSS: the page's classes are prefixed `sb-` (an earlier `.sc` clashed with the week-chip score).
- Candidate load counts the other periods picked on the same screen (draft assignments).

## Score defaults v2 (2026-11-23)
- Agreed with the school: weekly baseline 16 (median real load; was 20), +2 / −2 per period under / over (bonus was 1), day overload −15 (was −10) so a heavy day weighs the same as a long run (−15), and a 5-period day counts as overloaded (threshold 4, was 5: in the real timetable 91% of teacher-days are ≤ 4 periods). Long runs that already exist in the timetable still count: a teacher who already teaches 3+ in a row is less likely to accept.
- Set in js/dynamic.js on top of the generated defaults (the legacy app keeps the old numbers). `S.upgradeScoreSettings` moves stored settings still holding an old default to the new one once (marker `SCORE_DEFAULTS_V:2`), on load, backup restore, ready-file and legacy-copy imports; values someone changed are kept.
- Subject code ก = การงานอาชีพ (grouped with ง).
- Real data (955 searches, 7,180 candidates), with the 5-period rule: median score 72, best candidate per search median 100; colour bands green 21% / yellow 37% / red 42% with the unchanged 90 / 70 thresholds.
- Tests pin their own settings; tests/preview-dynamic.cjs [11] covers the upgrade.
