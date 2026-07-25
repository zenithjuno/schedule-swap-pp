# CONSTRUCTION PLAN — โปรแกรมสลับคาบสอน HTML version (swap-html)

**Companion to:** `BLUEPRINT-swap-html.md` (the what; sacred). This is the how — the build order.
**Method:** strict **create → test → pass** loop. Nothing advances until the current stage passes its gate. Deviations from the BLUEPRINT are recorded only in `schedule_swap_HTML_CHANGELOG.txt`.
**Output:** `schedule_swap_HTML_s{NN}[.rev]_{YYYY-MM-DD}.html` — single self-contained file, plain JS/CSS, Thai UI, Chrome/Edge target. A delivered file is NEVER overwritten; every fix is its own `.rev`.
**Required session inputs:** the BLUEPRINT, this plan, the s23 oracle workbook(s), `69_1_schedule_ALL_DEPARTMENTS_CLEAN.xlsx`, and (from Stage 19) a real filled พพ.1-1 memo for the wording variants.

---

## HOW TO READ THIS (for the owner, a non-dev)

Each stage: 🔨 BUILD (what gets made) · 🧪 TEST (how Claude verifies alone) · 👁️ YOU SEE (plain-language evidence you judge against your ground truth) · ✅ PASS GATE (the binary condition to advance; where judgment is needed, the gate is your explicit "pass"). Your job at every gate: "looks right" or "wrong because…".

## GOLDEN RULES OF THIS BUILD

1. **The s23 workbook is the oracle.** Every engine number must match it to the integer, except the two documented deviations (D1 date-aware block-list, D2 smart week default), which are tested as expected-differences.
2. **Engine before interface.** The whole calculation engine is built headless and proven against the oracle before any page exists. A UI bug can then never be a math bug.
3. **Imported data is sacred** — the app never mutates a schedule row.
4. **Zero console errors** at every gate; every stage's self-checks green before the user is asked to look.
5. **Real examples only** — gates use teacher 0221's actual schedule and the real 69/1 data, never synthetic data.
6. **Stages small enough that a bug's origin is obvious.**

## STAGE MAP

```
PHASE 0 — THE ORACLE
  s00  Extract oracle_fixture.json from the s23 workbook

PHASE 1 — FOUNDATION (trustworthy inputs)
  s01  App shell: single-file skeleton, tabs, font, SheetJS, file:// storage proof
  s02  Import contract: strict parser + blockers (Thai error report)
  s03  Import warnings tier + ซ่อมเสริม re-parse + acknowledgment flow
  s04  Semester store, persistence schema, backup/restore
  s05  Phone import (2-column) + template .xlsx deliverables
  s06  Settings page (Config), advanced toggle

PHASE 2 — THE ENGINE (headless; proven before any UI)
  s07  Derived flags & indexes (level, lunch, building, eligibility, keys)
  s08  Lookup spine
  s09  Candidate generator — Checks A–F        ← highest-risk stage #1
  s10  Workload calcs (weekly + daily)
  s11  Consecutive-run calc
  s12  Walking calc (two ends, independent)
  s13  Score + warnings assembly + tie-break    ← full oracle table match
  s14  Dates, week offsets, D2 smart default,
       D1 date-aware block-list                 ← highest-risk stage #2
  s15  Embedded self-test (ตรวจสอบระบบ) — whole fixture green

PHASE 3 — THE INTERFACE (reads from the proven engine)
  s16  หน้าหลัก: inputs + dashboard + ค้นหา buttons
  s17  ผลการค้นหา: table + inline-expand detail + บันทึกลง Log
  s18  บันทึกการสลับ: real Log table (edit/delete rules, filter, ✓ tag, phones)
  s19  ฟอร์ม พพ.1-1 generator (leave-event range, wording variants, print)
  s20  ตารางสอน handout (per-affected-week grids)
  s21  อ่านก่อนใช้งาน + semester strip + archive switcher

PHASE 4 — HARDENING & DISTRIBUTION
  s22  Backup-reminder trio + storage-capacity warnings
  s23  Self-export "สร้างไฟล์พร้อมใช้"            ← highest-risk stage #3
  s24  Full end-to-end dress rehearsal (browser port of the POC's s20)
  s25  Edge-case sweep + cross-browser + print verification
  s26  Handover: changelog, deliverables, final file

LATE (post-v1, each needs its own explicit approval): F3 Mode B · F4 full-day grids
```

---

# PHASE 0

## Stage 00 — Oracle fixture extraction
🔨 Headless (Python/openpyxl) read of the s23 workbook + clean data → `oracle_fixture.json`: (a) self-contained mini-dataset (every row the fixture's searches touch, so the fixture runs with no semester loaded); (b) golden test (0221/จันทร์/p2/2026-06-08 → 104/103/89/87/74, rank-1 partner 1202, give-back พฤหัสฯ p6 ญ30213) with the FULL expected candidate table; (c) s20 scenario (p2→5 partners, p3→9, block/unblock round-trip); (d) every BLUEPRINT §8.3 edge case; (e) ~10 random breadth searches re-derived independently from raw data (the POC's own independent-check method, not trusting workbook recalc); (f) D1/D2 expected-difference annotations.
🧪 Re-derive golden + breadth cases from raw data by an independent code path; both derivations must agree exactly. Validate JSON completeness (every referenced teacher/slot exists in the mini-dataset).
👁️ A plain-language inventory: "fixture holds N searches, M expected candidates, the golden test reproduces your known 104/103/89/87/74, here are 3 sample expected rows you can eyeball against the workbook."
✅ Independent derivation matches the workbook everywhere; you confirm the samples; fixture frozen (never edited again — a wrong fixture is fixed only via a documented changelog entry).

# PHASE 1

## Stage 01 — App shell
🔨 `schedule_swap_HTML_s01_{date}.html`: tab bar (7 Thai tabs + header strip placeholders), embedded TH Sarabun New (woff2), embedded SheetJS, empty `<script type="application/json" id="embedded-data">` island, localStorage read/write proof, print-CSS scaffold.
🧪 Open via double-click (`file://`) in Chrome and Edge: zero console errors; localStorage persists across close/reopen; Thai renders in TH Sarabun on a test print page; file size ≤ ~3.5 MB.
👁️ Screenshot-level description: the empty app with all 7 Thai tabs, and a print preview showing Thai text in the correct font.
✅ Both browsers pass all checks from a plain double-clicked file; you confirm the tab names and look.

## Stage 02 — Import contract (blockers)
🔨 "นำเข้าตารางสอน" flow: SheetJS parse preserving teacher_id as 4-char text, strict `VERIFIED_DATA` sheet + 10-header check, all 7 blockers (BLUEPRINT §4.2) with precise Thai messages + row numbers, all-or-nothing rejection.
🧪 Feed: the real 69/1 file (must pass); 7 sabotaged copies — renamed sheet, swapped headers, id "221", day "พฤหัส" (without ฯ), period "10", status typo, duplicated (teacher,day,period) row — each must reject with the right named error and leave any active semester untouched.
👁️ The validation report for the real file ("ผ่าน: 3,823 แถว, 186 ครู…") and the exact Thai error each sabotage produces.
✅ Real file imports; all 7 sabotages rejected with correct messages; you confirm the error wording is clear Thai a teacher would understand.

## Stage 03 — Import warnings + ซ่อมเสริม re-parse
🔨 Warning tier: reconstruction equality, unknown-room vocabulary (KNOWN_ALPHA_ROOMS; no space-tokenization), 4-digit-room-starts-with-1, subject-code shape, ±20% row-count drift, counts summary. ซ่อมเสริม re-parse per §4.4 with the ambiguity rule. Acknowledgment screen before activation.
🧪 On real 69/1: exactly **9** ซ่อมเสริม rows re-parsed (print before→after for each — e.g. `ซ่อมเสริม4.9332` → ซ่อมเสริม / 4.9 / 332); MANUAL rows appear in the reconstruction warnings (expected); zero unknown rooms; counts match (2950/868/3/2 statuses). Inject a fake room "999X" and a 4-digit room "2224" → both warned.
👁️ The full warning report for your real file, plus the 9-row ซ่อมเสริม before/after table (you approved this parse once in the POC — confirm it still reads right).
✅ 9/9 re-parsed correctly; warnings fire on injections and stay quiet otherwise; you acknowledge the report flow feels right.

## Stage 04 — Semester store + backup/restore
🔨 Versioned store per BLUEPRINT §5.1; semester label/start/end inputs; archive-on-new-import (read-only bundles); backup download (`swap_backup_{label}_{date}.json`); restore with confirm; bundle export.
🧪 Import 69/1 as `2569/1` → close/reopen → data intact. Import a second copy as `2569/2` → first auto-archives, switcher shows it read-only. Backup → wipe localStorage → restore → byte-equal store. Restore a corrupted file → clean Thai error, store untouched.
👁️ The semester strip showing the active label, the archive switcher, and a backup file you open in Notepad (human-readable JSON with your data visibly inside).
✅ Round-trips lossless; corruption handled; archive read-only; your "pass".

## Stage 05 — Phone import + templates
🔨 2-column phone import (§4.6) with unknown-id report; one-time conversion script producing the initial phone file from the s23 `teacher_phone` sheet (ids + display values only). Deliverables: blank schedule template .xlsx + blank phone template .xlsx.
🧪 Import the converted real file: exactly **150** teachers with numbers, **36** without (matches the POC's known distribution — 4 blocked shared-name + 32 no-match show ไม่มีข้อมูลเบอร์ติดต่อ); spot-check 0221's own number and one blocked teacher (0108 or 0223 สุพัตรา → no number).
👁️ "150 มีเบอร์ / 36 ไม่มี" summary + 5 spot-checks including your own number (shown to you privately, not in the changelog).
✅ Distribution = 150/36; spot-checks right; templates open cleanly in Excel/Sheets.

## Stage 06 — Settings page
🔨 All Config keys, Thai labels + one-line explanations, defaults per BLUEPRINT §3.6, reset button, ตั้งค่าขั้นสูง toggle, values in store + backups.
🧪 Change DAY_OVERLOAD_THRESHOLD 5→6, reload, persists; reset restores all defaults; basic view hides scoring weights.
👁️ The settings page in both basic and advanced views; you confirm a colleague seeing only the basic view can't break anything.
✅ Persistence + reset correct; toggle hides the dangerous knobs; your "pass".

# PHASE 2 — Engine stages run headless against `oracle_fixture.json`; every gate is a side-by-side xlsx-vs-JS table matching to the integer.

## Stage 07 — Derived flags & indexes
🔨 Per-row derivations (level, lunch_period, is_lunch, is_combined, nt_class, is_teaching, is_eligible, building, key indexes) computed at import time per BLUEPRINT §3.4/§3.8/§3.6-building.
🧪 10 hand-checked rows covering every branch (junior, senior, combined, ประชุม*, ที่ปรึกษา*, 3-digit room, 4-digit, 331F, alpha, blank); bucket counts vs the data (role-bound/flexible totals).
👁️ The 10-row table: original cell beside every derived flag.
✅ 10/10 correct; bucket counts plausible; zero errors.

## Stage 08 — Lookup spine
🔨 (teacher,day,period)→row|empty and (group,day,period)→room, O(1) via the key indexes.
🧪 Probe 0221's known slots: teaching slot, free slot, lunch; one (group,day,period) room check vs raw data.
👁️ 4 probes you know the answers to.
✅ All probes correct.

## Stage 09 — Candidate generator (HIGHEST RISK #1 — slow down)
🔨 Checks A–F per BLUEPRINT §3.3 (without dates/block-list yet — those are s14).
🧪 Golden test slot: JS candidate set must equal the fixture's EXACTLY (same partners, same give-back slots, same flags). Period-3 case: 9 partners exact. Combined-group source → invalid-source signal; thin group (5.10A) → empty set. One case fully re-derived by hand in this session as a third opinion.
👁️ "For your Monday p2 class (ค31103/4.7), here are the partners and WHY each survived every check" — the same plain list you once verified in the POC's Stage 6; the names must still make school-sense to you.
✅ Exact set equality with the fixture on every test; your plausibility "pass".

## Stage 10 — Workload calcs
🔨 Weekly W per teacher; 4 affected-day before→after counts with same-day combining.
🧪 0221's weekly W vs hand count; one candidate's 4 daily numbers vs fixture; a same-day swap case (deltas net correctly).
👁️ "Your weekly load = N; this swap moves your Monday 4→3, Thursday 3→4; Y's Monday 3→4, Thursday 5→4."
✅ Matches fixture + hand counts.

## Stage 11 — Consecutive-run calc
🔨 Longest after-swap run per affected day; lunch and gaps break runs.
🧪 Fixture cases incl. the senior 3,4,5(lunch),6 → max 2 example; a constructed 3-in-a-row trigger reporting exactly 3.
👁️ Two worked examples incl. the lunch-split proof.
✅ Run lengths exact.

## Stage 12 — Walking calc
🔨 Per-end transition deltas + 3-period room sequences; lunch reset; first/last single-neighbor; blank skip; alpha self-building; **independent two-end sum, no same-day dedup** (inherited law).
🧪 The four canonical cases (all-same → 0; round-trip → +; surrounded-same → −; partial) + each edge; fixture deltas exact.
👁️ The canonical-cases table: before rooms / after rooms / crossings / delta.
✅ All deltas exact.

## Stage 13 — Score + warnings + ordering
🔨 §3.6 formula from settings; §3.7 warning assembly, priority + Me-before-Y; Tier-1 truncation strings; tie-break sort.
🧪 **Full golden-test table match: 104/103/89/87/74 with identical warnings per candidate.** Hand-sum one candidate's receipt. Flip one Config weight → score moves by the exact expected amount → flip back. Tied groups compared as unordered sets.
👁️ The score receipt for rank-1 (partner 1202): base 100, each term, final — the same auditable math the POC showed you.
✅ Golden test integer-exact; receipt reconciles; sensitivity correct.

## Stage 14 — Dates + D1 + D2 (HIGHEST RISK #2 — slow down)
🔨 BE rendering; weekday derivation (พฤหัสฯ exact); offsets −3..+3; the three preference defaults; D2 absence-date skip; ⚠️ ย้อนหลัง; **D1 date-aware entries** (consumed give-back slot + two busy entries per อนุมัติแล้ว row; week-picker greying; drop only if all offsets blocked; ยกเลิก revokes).
🧪 Fixture date cases (Mon 2026-06-08 absence: Thu→11 มิ.ย., Wed→10 มิ.ย.); the 0507-type clash now auto-skips to the next week with the warning absent, and the warning returns when the clashing week is manually forced. D1: approve the s20 swap (partner 0603) → September search for the same slot still offers 0603 (the over-block is GONE — expected difference vs xlsx); a search whose give-back computes to the consumed date shows that week greyed; ยกเลิก restores everything.
👁️ A worked calendar story in plain Thai dates: the June approval, the September search where the partner correctly reappears, and the greyed week in between.
✅ All date math hand-verified; D1/D2 behave exactly per the BLUEPRINT's expected-difference notes; your "pass".

## Stage 15 — Embedded self-test
🔨 "ตรวจสอบระบบ" in ตั้งค่าขั้นสูง: runs the entire fixture against the engine using the fixture's own mini-dataset (independent of any loaded semester), per-case pass/fail in plain Thai.
🧪 All cases green; sabotage one engine constant temporarily → the right cases turn red with readable diffs → revert.
👁️ The green board; then the sabotaged red board proving the test actually tests.
✅ Green on clean code, red on sabotage, green again; runs with zero semesters loaded.

# PHASE 3 — every page reads ONLY from the proven engine.

## Stage 16 — หน้าหลัก
🔨 Inputs (date pickers w/ BE display, teacher autocomplete, preference), out-of-semester warning, the 9-row dashboard (statuses, highest-priority rule, single-lunch logic, color bands), per-row **ค้นหา** buttons.
🧪 The POC s16 matrix: fresh day = correct red/grey/ไม่ต้องสลับ mix; teacher 0219 lunch correctness across จ/อ/ศ; teachers 1317/1810 → no lunch tag; an อนุมัติแล้ว + later เสนอ on one period → board shows อนุมัติแล้ว.
👁️ Your real Monday board, fresh and mid-progress, side by side with the xlsx dashboard.
✅ Board states match the oracle's dashboard logic; buttons jump correctly; your "pass".

## Stage 17 — ผลการค้นหา
🔨 Banner; candidate table (band colors live from settings); inline-expand detail (every BLUEPRINT §6.2 section incl. phone, loud-red treatment, Tier-3 tables, receipt, audit); บันทึกลง Log; §8.1/§8.2 empty/invalid states.
🧪 Golden test rendered = engine output verbatim; each invalid source shows its exact Thai message; truncation "… และอีก K รายการ" with a 3-warning candidate; loud-red fires on a forced clash.
👁️ The page you'll use daily, on your real golden case — click rank 1, read the full breakdown.
✅ Display = engine everywhere; all states correct; your "pass" on readability.

## Stage 18 — บันทึกการสลับ
🔨 Log table per BLUEPRINT §5.2–5.3: add from detail, status dropdown w/ full-row tint, delete-only-เสนอ w/ confirm, default filter + ทั้งหมด toggle, เสร็จสิ้น ✓ tag, phone column, static stored values.
🧪 Commit → edit statuses → D1 reacts live (s17 verification pattern: approve → slot consumed; ยกเลิก → restored); delete blocked on a รออนุมัติ row; filter hides a past completed row, shows it under ทั้งหมด; ✓ appears only when give-back has passed.
👁️ The commit→approve→cancel round-trip narrated with your real candidates, plus the filter in action.
✅ All rules enforced; D1 reacts instantly; statuses survive reload; your "pass".

## Stage 19 — ฟอร์ม พพ.1-1 (**owner input due: the real filled memo, ideally multi-day**)
🔨 Leave-event range inputs; auto-fill + pre-checked row list; adaptive single/multi-date wording (from your memo; placeholders until supplied); dynamic paginated table; editable non-table fields; first-name derivation (title-strip rule); BE short dates; print CSS; คัดลอกตาราง button. No phone field.
🧪 Single-day with 2 swaps; multi-day range with 7 swaps (pagination across the 5-row boundary); untick one row → excluded; copy-paste the table into Word/Docs → structure intact; print preview in TH Sarabun.
👁️ A printed PDF of each variant next to your real memo for wording/layout judgment — the gate is yours entirely.
✅ Both variants match the school's real document conventions per your judgment; pagination clean; copy fallback works.

## Stage 20 — ตารางสอน handout
🔨 Teacher pick (quick-list = everyone touched by approvals); auto-detected affected weeks pre-selected; one Mon–Fri×9 grid per week, dated BE headers, applied date-specific swaps, highlights + footnotes; print one grid/page.
🧪 A swap whose give-back lands 2 weeks out → exactly 2 pages, each correct for its own dates; an untouched week absent; both the give-up teacher's and partner's handouts consistent (mirror images of the trade).
👁️ Your own handout and partner 1202's for the golden swap, printed — do they say what the receiving teacher needs?
✅ Grids correct against the raw schedule + log; your "pass" (flag anything missing for the receiving teacher).

## Stage 21 — อ่านก่อนใช้งาน + strip + switcher
🔨 In-app read-me (usage flow, page guide, backup model, semester import steps — written for a colleague who never met you); header strip (semester label, สำรองล่าสุด line); archive switcher with read-only badge.
🧪 Switch to an archived semester → everything renders read-only (no commits possible) → switch back.
👁️ The read-me text itself — your gate: "could ครู X down the hall use this without calling me?"
✅ Read-only enforced; your "pass" on the read-me.

# PHASE 4

## Stage 22 — Backup-reminder trio + capacity
🔨 The three reminders (end-of-semester loud; passive header line; soft nag iff >30 days AND new approvals) + localStorage capacity warning + export-then-purge flow.
🧪 Simulate clock/state combinations: quiet semester never nags; stale-with-approvals nags once; near-end-date prompts; near-capacity warns and purge flow round-trips through a bundle file.
👁️ Each reminder's exact Thai wording and when it fires, as a table.
✅ Fires exactly per spec, never more; your "pass" on wording.

## Stage 23 — Self-export (HIGHEST RISK #3 — slow down)
🔨 "สร้างไฟล์พร้อมใช้ (.html)": serialize the document with the embedded-data island filled (active semester schedule+phones+settings, NOT your log); `</script>` escaping; embedded-data load precedence (browser store wins if present).
🧪 The hard acceptance loop: exported file opens cold on a "clean machine" (fresh browser profile) with the semester ready; **passes the full ตรวจสอบระบบ self-test; can itself re-export; the grandchild also passes** — three generations deep. Thai data survives byte-exact (no encoding loss); print output identical to the master.
👁️ The colleague experience demonstrated: double-click the exported file on a clean profile → it just works, your log absent, data present.
✅ Three-generation reproduction with full self-test green each time; no data corruption; your "pass".

## Stage 24 — End-to-end dress rehearsal (the POC's s20, in the browser)
🔨 Nothing new — run the real workflow: 0221 absent Mon 8 มิ.ย.; search p2 and p3; pick candidates; commit; statuses through เสนอ→รออนุมัติ→อนุมัติแล้ว; dashboard tracking; D1 block/unblock; generate the form; generate both handouts; backup.
🧪 Every intermediate number cross-checked against the fixture's s20 scenario; final state inspected after close/reopen.
👁️ The full narrated walk-through, ending with a filled dashboard, a printed form, and two handouts.
✅ Complete flow correct end to end; survives reload; your "pass".

## Stage 25 — Edge sweep + cross-browser + print
🔨 Batch-run every §8.3 edge case in the UI; full pass in Chrome AND Edge; print verification of form + handout from both; mobile viewport smoke-check (read-only candidate viewing).
🧪 Checklist with every case marked; zero console errors anywhere.
👁️ The checklist + screenshots of both browsers' print previews.
✅ All cases pass in both browsers; printing identical.

## Stage 26 — Handover
🔨 Final `schedule_swap_HTML_s26_{date}.html`; `schedule_swap_HTML_CHANGELOG.txt` complete; deliverable bundle: master file, blank schedule template .xlsx, blank phone template .xlsx, the converted initial phone file, a fresh backup, and a one-page Thai quick-start.
👁️ You import next semester's file (or a copy of 69/1 relabeled) entirely unaided.
✅ You complete an unaided semester import + one full swap search + one form print. **Project v1 done.**

---

## WHAT I NEED FROM YOU DURING THE BUILD
- A verdict at every 👁️ gate; the build never stacks onto an unverified stage.
- Extra patience at the three flagged stages: **s09** (candidate generator), **s14** (dates/D1/D2), **s23** (self-export) — these get slowed-down, extra-detailed gates.
- **Owed input before s19:** a real filled พพ.1-1 memo, ideally a multi-day example, for the two wording variants.
- School ground truth whenever names/dates "feel wrong" — that instinct caught real bugs four times in the POC.

## RISK NOTES (watched closely)
- `พฤหัสฯ` verbatim everywhere a weekday is derived (s14, s16, s19, s20).
- teacher_id leading zeros through SheetJS (s02) and through JSON round-trips (s04, s23).
- localStorage on `file://` (proven at s01 before anything depends on it).
- Lunch's three distinct uses: hard block, consecutive break, walking reset — plus the per-day display lunch (s07/s11/s12/s16).
- Walking = independent two-end sum, NO same-day dedup (s12) — do not "fix" this; it is correct.
- D1 semantics (consumed vs busy entries) and the all-offsets-blocked drop rule (s14).
- `</script>` escaping + UTF-8 integrity in self-export (s23).
- Print CSS differences Chrome vs Edge (s25).

## DELIVERABLES
`schedule_swap_HTML_s{NN}_{date}.html` (versioned lineage) · `schedule_swap_HTML_CHANGELOG.txt` (cumulative) · `oracle_fixture.json` (embedded + standalone copy) · blank schedule + phone template .xlsx · initial converted phone file · `BLUEPRINT-swap-html.md` + this plan as the durable record.
