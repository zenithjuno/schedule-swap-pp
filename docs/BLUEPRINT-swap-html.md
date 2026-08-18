# BLUEPRINT — โปรแกรมสลับคาบสอน HTML version (swap-html)

**Version:** 1.0 (build-ready spec)
**Owner:** ครูชัชพงษ์ โชคพนารัตน์ (teacher_id 0221), โรงเรียนพิษณุโลกพิทยาคม
**Status:** Approved design, built and shipped (v1 = s26 master / s27 public edition). SACRED document: never edited mid-build; deviations are recorded only in `schedule_swap_HTML_CHANGELOG.txt` (with date + rationale). To learn "what the system actually does today," read this file first, then apply changelog overrides on top.

**AMENDMENT LOG** — post-v1 spec changes, each a dated numbered section that supersedes what it names. Amendments are additive: nothing above them is rewritten or deleted, so the original design intent stays readable.
- **A1 · 2026-08-17 · §5.9 Occupancy ledger.** Closes the double-booking defect found in live use (three approved swaps landing on one give-back slot). Supersedes part of §5.8. Approved by the owner; oracle-neutral by construction.
**Audience:** a fresh Claude session with ZERO prior context must be able to build flawlessly from this file alone (+ the two reference xlsx files listed in §2). The owner is NOT the main audience.
**Companion:** `CONSTRUCTION_PLAN-swap-html.md` (the staged how).

---

## 0. PURPOSE & ELEVATOR PITCH

A Thai high-school teacher who will be absent needs to find colleagues to swap teaching periods with. A 23-stage Excel/Google-Sheets POC (`schedule_swap_POC_s23`) already exists, is in daily use, and is **correct** — it is the proven oracle. This project re-implements it as a **single self-contained offline `.html` file**: same engine, dramatically better UX, first-class per-semester data import, durable for years with zero maintenance by a non-developer. UI entirely in **Thai**; conversation with the owner in **English**.

What HTML buys over the xlsx (the reasons this project exists):
1. **Per-semester data change** — import a new clean schedule `.xlsx` each semester; the program file itself never changes.
2. No spreadsheet fragility — no paste-values dance, no formula erasure, no CF rules silently dropped on save.
3. The POC's deferred features become cheap (per-teacher handout, dynamic period list, later Mode B).

---

## 1. RELATIONSHIP TO THE XLSX POC (the oracle)

### 1.1 Reference files (must be supplied to the build session)
- `schedule_swap_POC_s23_*_ข้อมูลจริง*.xlsx` and/or the canonical s23 file — the **correctness oracle**. The JS engine must reproduce its numbers exactly, except for the two documented deviations (§1.3).
- `69_1_schedule_ALL_DEPARTMENTS_CLEAN.xlsx` — the real semester-69/1 clean schedule (3,823 data rows, 186 teachers), used as real test data and as the model for the import contract.
- The POC's `BLUEPRINT of schedule swap program.md` + cumulative changelog — background only; **this file supersedes both** for the HTML build. Where the POC blueprint and its changelog disagree, the changelog won (user decisions); those resolutions are already folded into this document.

### 1.2 Golden test (memorize; it gates the engine)
Input: teacher **0221**, day **จันทร์**, period **2**, absence date **2026-06-08** (8 มิ.ย. 2569), preference อนาคต, default Config.
Expected: top-5 scores **104 / 103 / 89 / 87 / 74**; rank-1 partner **1202**, give-back **พฤหัสฯ period 6**, subject **ญ30213**. (Period-2 search yields 5 partners; the same teacher/date at period 3 yields 9 partners — also in the fixture.)

### 1.3 The ONLY two deliberate deviations from the oracle (everything else must match)
- **D1 — Date-aware block-list** (POC blocked teacher+weekday+period, date-unaware = accepted over-blocking debt). HTML semantics in §5.8, **binding rules in §5.9 (A1)**.
- **D2 — Smart week default**: the auto-suggested week-offset skips any week whose give-back date equals the absence date (the POC only warned after the fact). The loud warning REMAINS if the user manually forces the clashing week.
The oracle test harness (§10) encodes both as *expected differences*, never as failures.

---

## 2. ARCHITECTURE & PLATFORM (all locked)

| Decision | Value |
|---|---|
| Runtime | Pure client-side, offline, **no server / no backend / no network calls ever** |
| Delivery | **One self-contained `.html` file** (~3 MB), double-click to open from disk (`file://`) |
| Stack | **Plain JavaScript + CSS. No framework. No build step. No external requests.** |
| Embedded libraries | **SheetJS** (xlsx reading) embedded in the file. Nothing else unless unavoidable; justify any addition in the changelog |
| Embedded font | **TH Sarabun New** embedded (woff2 base64) — printed form + handout must render identically on every machine |
| Browsers | Modern **Chrome / Edge** (~2023+). Firefox best-effort, never special effort. No IE |
| Devices | Desktop-first. Mobile = readable candidate-checking only; printing/table outputs are desktop features |
| Schedule data | **Never baked into the master file** — imported at runtime (§4). Exception: the self-export copies (§7.4) carry embedded data |
| Sharing | File is shareable with colleagues, **phone numbers included** (owner ruled phone privacy non-sensitive at school). Each user's log lives in their own browser; logs never merge — accepted |
| Persistence | localStorage working store + explicit backup/restore file (§7) |
| Language | All UI text Thai. Dates displayed Buddhist Era everywhere (§9.4); internal storage ISO 8601 |

`file://` caveat the builder must verify early: localStorage works on `file://` in Chrome/Edge but is origin-scoped per path in some configurations — Stage 1 of the construction plan tests this explicitly on a real double-clicked file.

---

## 3. CORE MODEL — THE SWAP ENGINE (1:1 port of the proven POC)

### 3.1 Model C — pairwise swap, the only model
Teacher **Me** gives up (day1, period1); teacher **Y** gives back (day2, period2). Exactly two cells of the conceptual timetable change. No cascades.

### 3.2 Iron rules
- **Same group G on both sides.** The slot Me gives up teaches group G; Y's give-back slot must also teach G. Subject ≡ teacher; no subject-qualification filter (Math↔Thai fine).
- **Room inherits with the teacher**; rooms editable; NO room-conflict check. (Drives the walking warning.)
- Raw schedule data is immutable — swaps never mutate it.

### 3.3 Algorithm (Mode A — find any partner), given (Me, day1, period1)
1. Read Me's slot → subject S1, group G, room R1.
2. Validate source slot (§8.1); early-exit with specific Thai message if invalid.
3. `teachers_of_G` = all teachers ≠ Me teaching G anywhere in the week in an eligible slot (VERIFIED / MANUAL / MANUAL (user fixed) / VERIFIED (ซ่อมเสริม); NOT combined-group, NOT lunch, NOT role-bound).
4. For each Y, for each Y-slot (day2, period2) teaching G:
   - **Check A** — Y free at (day1, period1): no row, OR flexible non-teaching (ประชุม*) → allowed with warning. Role-bound / lunch / another class = blocked. *(HTML addition: also consult date-aware busy entries, §5.8.)*
   - **Check B** — Me free at (day2, period2): same logic.
   - **Check C** — (day1,period1) ≠ (day2,period2).
   - **Check D** — neither slot is a lunch period for G's level.
   - **Check E** — neither slot is combined-group (group string contains a comma).
   - **Check F** — neither slot is role-bound non-teaching.
5. Score (§3.6) + warnings (§3.7) per candidate.
6. Sort by §3.5 tie-break.

### 3.4 Lunch rule (hard block + double duty)
- Group level from leading digit: `1./2./3.` = junior → lunch **period 4**; `4./5./6.` = senior → lunch **period 5**. EP groups follow the same rule.
- Lunch can never be source or target; lunch is a **break** for the consecutive-run calc AND a **reset point** for the walking calc.
- A teacher's *displayed* lunch on a given day (dashboard): ONE period — default the predominant level's slot, shifted to the other slot if actually teaching during the default (POC s16.2 lesson; lunch is a property of the student group, not the teacher).

### 3.5 Candidate ordering (locked, deterministic)
`score desc → day order จันทร์<อังคาร<พุธ<พฤหัสฯ<ศุกร์ → period asc → teacher_id asc`. (Excel's tie order was scan-order accident; the oracle harness compares tied groups as unordered sets.)

### 3.6 Scoring (identical to POC; all values are editable Config settings)
```
score = BASE_SCORE
      + weekly_workload_term(Y)
      − DAY_OVERLOAD_PENALTY × (overloaded teacher-days among the 4 affected)
      − CONSECUTIVE_PENALTY  × (consecutive-overrun cases among the 4 affected)
      + walking_term (both ends; negative crossings = bonus)
```
The 4 affected teacher-days = {Me·day1, Me·day2, Y·day1, Y·day2}; if day1=day2 the deltas combine for that teacher.

Config defaults (Thai-labeled settings page, §6.7):

| Key | Default |
|---|---|
| BASE_SCORE | 100 |
| WORKLOAD_WEEKLY_BASELINE | 20 |
| WORKLOAD_WEEKLY_PENALTY_PER_PERIOD | 2 |
| WORKLOAD_WEEKLY_BONUS_PER_PERIOD | 1 |
| DAY_OVERLOAD_THRESHOLD | 5 |
| DAY_OVERLOAD_PENALTY | 10 |
| CONSECUTIVE_THRESHOLD | 3 |
| CONSECUTIVE_PENALTY | 15 |
| WALKING_PENALTY_PER_NEW_CROSSING | 2 |
| WALKING_BONUS_PER_REMOVED_CROSSING | 2 |
| GIVEBACK_PREFERENCE | อนาคต |
| SCORE_COLOR_GREEN_MIN | 90 |
| SCORE_COLOR_YELLOW_MIN | 70 |
| LUNCH_JUNIOR_PERIOD | 4 |
| LUNCH_SENIOR_PERIOD | 5 |

Sub-rules (all proven in the POC — port verbatim):
- **Weekly term:** W = Y's teaching periods Mon–Fri (eligible statuses only). W>baseline → −(W−B)×penalty; W<baseline → +(B−W)×bonus. Display W for both Y and Me.
- **Day overload:** after-swap per-day counts (Me·day1 −1, Me·day2 +1, Y·day1 +1, Y·day2 −1; combine when same day). Count > threshold → one overloaded teacher-day each.
- **Consecutive:** longest run of teaching periods after swap; lunch and gaps and non-teaching are breaks; run ≥ threshold → warning with EXACT count ("ติด N คาบ") + penalty.
- **Walking (hard-won rule — do not "improve"):** a swap is a one-time event on TWO different calendar dates; each date only one period differs, so the give-up end and give-back end are evaluated **independently and summed** — NO same-day dedup. Per end: for group G at the swapped period p, count cross-building transitions among (p−1→p) and (p→p+1), before vs after; delta_end = after − before; total = both ends. Lunch-boundary transitions never count; first/last period uses one neighbor; blank room → transition skipped; alpha rooms are each their own building.
- **Building extraction:** 3-digit room `ABC` → building `A`; 4-digit `ABCD` → building `AB`; `331F`-style → strip trailing letters → building 3; alpha/special room → the full string is its own building; blank → none.

### 3.7 Warnings (priority order, fixed; Me-before-Y tie-break)
1. ติด N คาบ (consecutive) · 2. ภาระเกิน (day overload) · 3. ประชุม Me / ประชุม Y (flexible-meeting conflict, both directions) · 4. นักเรียนเปลี่ยนอาคาร (total walking delta > 0; ×2 form when both transitions of an end turn cross-building) · 5. ⚠️ ย้อนหลัง (give-back date < date_proposed; soft, allowed).
**Loud-red pair (correctness class, shown above all others, never hard blocks):**
- Self-collision: selected give-back lands on a weekday+period+EXACT DATE already promised in an อนุมัติแล้ว row of Me's.
- Give-back == absence date (can never be valid; D2 makes the default avoid it, warning fires only on manual override).
Three display tiers port as-is: Tier-1 compact tags (dashboard + results column, top-2 + "… และอีก K รายการ"), Tier-2 directional sentences (detail), Tier-3 3-period before/after room table per end (detail; shown even when delta ≤ 0, with ผลต่อคะแนน line; improvement shows neutral "นักเรียนเดินข้ามอาคารน้อยลงหลังสลับ" + silent bonus).

### 3.8 Non-teaching classification (string match on `room` field)
- **role_bound** (hard block both directions): contains `ที่ปรึกษา` OR `นศท`. (ชุมนุม-ที่ปรึกษา, คุณธรรมจริยธรรม-ที่ปรึกษา, สาธารณประโยชน์-ที่ปรึกษา, ลูกเสือเนตรนารี-ที่ปรึกษา, การใช้ทักษะชีวิต-ที่ปรึกษา, ลูกเสือ-ที่ปรึกษา, นศท.ม.6-นอกสถานที่.)
- **flexible** (treat as free + bidirectional warning): starts with `ประชุม` (note the real typo `ประชุมกลุ่มงบปรมาณ-งบประมาณ` in source — match on the prefix only).
- Co-teaching (≥2 teachers, same day/period/group/subject): allow + soft warning "คาบนี้มีครูร่วมสอน" — best-effort, never blocks (refinement explicitly OUT of scope).

### 3.9 Dates & week offsets
Three dates: `date_proposed` (planning date, user-entered, never auto-overwritten; =TODAY shown as reference only), `date_absent` (falls on day1), `date_giveback` (falls on day2; = day2's date in week of date_absent + offset).
Per-candidate offset −3..+3, **default per GIVEBACK_PREFERENCE**: อนาคต = first offset ≥ absence-week placing give-back on/after date_absent (0 else +1); อดีต = mirror to the past; ใกล้ที่สุด = minimize |giveback − absent|. **D2:** if the preferred default produces give-back == date_absent, advance to the next offset in the preference's direction. Preference sets defaults only — never filters candidates. Weeks blocked by D1 entries are disabled (greyed) in the picker and skipped by the default.

---

## 4. DATA & THE IMPORT CONTRACT (frozen, eternal)

### 4.1 The contract
Sheet named exactly **`VERIFIED_DATA`**, header row exactly, in order:
`teacher_id | teacher_name | day | period | subject | group | room | raw_cell | status | audit_note`
All values read as strings. A blank **template .xlsx** matching this contract is a project deliverable. The data-cleaning pipeline (a separate, existing project) produces this format; the contract is the fixed interface between the two programs.

Value vocabularies (exact):
- `teacher_id`: 4-char zero-padded text (`0101`, `0221`). Leading zeros must survive (SheetJS: read as text / `raw:false` care).
- `day` ∈ {`จันทร์`, `อังคาร`, `พุธ`, `พฤหัสฯ`, `ศุกร์`} — Thursday carries the abbreviation mark `ฯ`, match verbatim. Canonical order จ(1)…ศ(5).
- `period` ∈ {"1"…"9"} as text.
- `status` ∈ {`VERIFIED`, `NON_TEACHING`, `MANUAL`, `MANUAL (user fixed)`} (semester 69/1 real counts: 2950 / 868 / 3 / 2).
- Scale reference: 3,823 rows, 186 teachers, ~128 distinct group strings, 9 ซ่อมเสริม rows.

### 4.2 Validation — BLOCKERS (any one rejects the entire file; old semester stays live untouched)
1. Sheet `VERIFIED_DATA` missing.
2. Header mismatch (name or order) → error names the column: "หัวตารางคอลัมน์ที่ 3 ควรเป็น 'day' แต่พบ '…'".
3. teacher_id not 4-digit text.
4. day not in the 5-name vocabulary (exact, incl. พฤหัสฯ).
5. period not 1–9.
6. status not one of the 4 known values.
7. **Duplicate (teacher_id, day, period)** — same teacher, two rows, one slot. (Different teachers same slot = co-teaching = fine.)
All errors reported in plain Thai with row numbers. All-or-nothing: no partial import ever.

### 4.3 Validation — WARNINGS (import proceeds; report shown and must be acknowledged before the semester activates)
1. **Reconstruction equality**: `subject + group + room != raw_cell` (string concat, whitespace-insensitive compare) — flag with row number. MANUAL rows legitimately fail; expected.
2. **Unknown room vocabulary**: room neither digits, nor digits+trailing letters, nor on KNOWN_ALPHA_ROOMS = {`STEM`, `331F`, `สนามกีฬาฟุตบอล`, `ศูนย์กีฬาในร่ม`, `โดมแดง`, `ลานเอกภาพันธ์`, `ตึกขาว`, `ดนตรี 1`, `ดนตรี 2`, `นาฏศิลป์ 1`, `นาฏศิลป์ 2`} → "ห้องใหม่ที่ไม่เคยพบ" (rooms with embedded spaces are real — never tokenize rooms by spaces).
3. **4-digit room not starting with "1"** (hard-won cleaning rule; e.g. 1224 = Building 12; room `600` is REAL — 3-digit, Building 6 art studio — not a leading-zero error).
4. **Subject-code shape**: not matching letter-class `[ทควสพอจภงศกฝญI]` + digits, not blank, and not `ซ่อมเสริม` → warn.
5. Row count differing >±20% from the previous active semester; counts summary always shown (rows / teachers / combined groups / ซ่อมเสริม rows / per-status).

### 4.4 ซ่อมเสริม re-parse (importer's job, automatic)
Rows with status NON_TEACHING whose `room` starts with `ซ่อมเสริม` are remedial TEACHING. Re-parse: subject = `ซ่อมเสริม`; remainder after the prefix splits into group + trailing room. Split rule: candidate room = trailing 4 digits **iff they start with "1"**, else trailing 3 digits; the remaining left part must parse as a valid group string (e.g. `4.9332` → group `4.9` room `332`; `6.10A, 6.10B348` → combined group + room `348`); ambiguity → import warning listing both candidate splits for the owner to rule. Set status `VERIFIED (ซ่อมเสริม)` (eligible for swaps; combined ones then auto-blocked by the comma rule — correct). Semester 69/1 has exactly **9** such rows (the POC blueprint said 8; data is source of truth — the two `ซ่อมเสริม4.9332` rows are teacher 0212 on two different days, distinct not duplicate).

### 4.5 Semester identity
Import asks for: **semester label** (required, e.g. `2569/2`) + **start date** + **end date** (both required). Uses: out-of-semester วันที่ลา sanity warning; week-picker bounds sanity; handout/form labeling; the end-of-semester backup prompt (§7.3).

### 4.6 Phone import (separate, simple)
A 2-column xlsx: headers exactly `teacher_id | phone`. teacher_id 4-digit text; phone normalized to 10 digits, displayed `0xx-xxx-xxxx`. Unknown teacher_ids reported and skipped; teachers absent from the file show **`ไม่มีข้อมูลเบอร์ติดต่อ`** in muted grey. The owner produces this file outside the app (a separate data-cleaning project). **The POC's full name-matching pipeline is permanently OUT of scope — cancelled, not deferred.** For the first load, the s23 workbook's hidden `teacher_phone` sheet (columns A=id, F=display) can be converted once into this 2-column format.

---

## 5. STATE MODEL & THE LOG

### 5.1 Storage schema (localStorage, single JSON document, versioned)
```
swapApp.v1 = {
  schemaVersion: 1,
  activeSemester: "2569/1",
  semesters: { "<label>": {
      meta: { label, startDate, endDate, importedAt, sourceFilename, archived: bool },
      schedule: [ {teacher_id, teacher_name, day, period, subject, group, room,
                   raw_cell, status, audit_note, ...derivedFlags} ],
      phones:   { "<teacher_id>": "0812345678" },
      log:      [ LogEntry... ],
  }},
  settings: { ...Config keys §3.6 },
  lastBackupAt: ISO | null,
  approvedSinceBackup: int
}
```
`schemaVersion` exists so future versions can migrate old stores/backups. Backup file (§7.2) = this whole object, pretty-printed JSON, filename `swap_backup_{semesterLabel}_{YYYY-MM-DD}.json`. Restore replaces the store after a confirm dialog.

### 5.2 LogEntry (superset of the POC's 21 Log columns)
```
{ id (uuid), createdAt, dateProposed,
  me:  {teacherId, teacherName, day1, period1, subject1, group1, room1},
  dateAbsent,
  y:   {teacherId, teacherName, day2, period2, subject2, group2, room2, phone},
  dateGiveback, weekOffset,
  status: เสนอ|รออนุมัติ|อนุมัติแล้ว|ยกเลิก,
  reason, notes, impactTag, scoreAtCommit, warningsAtCommit[] }
```
All display values stored static at commit time (POC lesson: logs must survive data changes). Exactly the canonical **4 statuses** — never invent a fifth. (A future แลกคาบ/สอนแทน distinction is an *orthogonal* field, not a fifth status — see §5.9.12.)

### 5.3 Log behavior (replaces the paste-values ritual, which is dropped scar tissue)
- Normal table: add (via "บันทึกลง Log" in the candidate detail), edit status via dropdown, **delete allowed ONLY while status = เสนอ** (confirm dialog); anything past เสนอ can only be ยกเลิก'd. Append-only history otherwise.
- **No clear/reset action exists anywhere.** A new swap session = enter a new absence date; date-keying guarantees zero cross-session pollution. The Log is the semester's permanent record.
- Default view filter: "เฉพาะที่กำลังดำเนินการ + ที่จะถึง" (status ≠ อนุมัติแล้ว, OR give-back date ≥ today); one click shows ทั้งหมด.
- Display-only **เสร็จสิ้น ✓** tag on อนุมัติแล้ว rows whose give-back date has passed (derived from today's date; stored status untouched).
- Row tint by status, full row: อนุมัติแล้ว green · รออนุมัติ amber · เสนอ white · ยกเลิก red (POC palette: green #C6EFCE/#006100, amber #FFEB9C/#9C6500, red #FFC7CE/#9C0006).

### 5.8 D1 — Date-aware block-list (deliberate oracle deviation; exact semantics)
Each อนุมัติแล้ว LogEntry generates date-specific entries (ยกเลิก revokes them instantly):
1. **Consumed give-back slot:** (Y.teacherId, dateGiveback, period2) — Y's G-class at that slot on that date is already promised. A candidate (Y, day2, period2) is NOT removed from results; instead, any week-offset whose computed give-back date hits a consumed/busy entry is **disabled (greyed) in that candidate's week picker** and skipped by the default. Only if ALL offsets −3..+3 are blocked is the candidate dropped.
2. **Busy entries:** (Y.teacherId, dateAbsent, period1) — Y now covers Me's class then; (Me.teacherId, dateGiveback, period2) — Me teaches the make-up then. Checks A/B consult busy entries whenever a concrete date is known for the slot being checked; the existing self-collision loud warning is the Me-side surface of the same data.
Net effect: an approved June swap is invisible to a September search — the POC's over-blocking disappears. Document in the test harness as expected-difference vs the xlsx.

> **SUPERSEDED IN PART by §5.9 (Amendment A1, 2026-08-17).** §5.8's *date-aware* principle stands and is unchanged. What §5.9 replaces is (a) the restriction of block-list generation to `อนุมัติแล้ว` rows only, and (b) the assumption that consulting the block list at search time is sufficient. Read §5.8 for intent, §5.9 for the binding rules.

### 5.9 Occupancy ledger — the single source of truth for "who is where, when" (AMENDMENT A1 · 2026-08-17)

**Why this amendment exists (the incident, recorded so it is never re-litigated).** On 2026-08-17 the owner's live log held **three `อนุมัติแล้ว` rows all giving back at พุธ คาบ 1 / 26 ส.ค. 2569** for the same teacher (0221): give-ups พฤหัสฯ p1 (Y=1301, group 4.7, room 328), พฤหัสฯ p4 (Y=0603, group 4.2, room 323) and ศุกร์ p6 (Y=0603, group 4.2, room 323). The owner was committed to teaching two different groups in two different rooms in one period, and the app said nothing. Root cause, in three layers:

1. `_occupied()` skipped every row whose status was not `อนุมัติแล้ว`, so a `เสนอ`/`รออนุมัติ` row reserved **nothing**. Each of the three searches ran while the others were still `เสนอ` and correctly-but-blindly offered the same free slot.
2. The block list was consulted **only** during candidate generation. `saveToLog()` guarded the give-up side only (`me_id + date_absent + per_give`, the s25.1 FIX #2 guard) and never looked at the give-back side; the status dropdown that promotes a row to `อนุมัติแล้ว` validated nothing at all; and each candidate's `offset_info` is a snapshot frozen at search time, so a results page left open bypassed even the search-time check.
3. Nothing ever looked at the log as a whole. `impactTag`/`warningsAtCommit` are commit-time snapshots by design (§5.2), and the handout renderer returned on the *first* matching log row per cell — so a triple-booked cell **printed as a single ordinary swap**. The one document the owner physically carries was the one that hid the collision most completely.

This is the debt logged as s25.1 "DEFERRED #3 — realtime scoring across already-swapped dates". The reason given for deferring it (would break the frozen-oracle guarantee) is **void**: the embedded self-test builds its engine with an empty log and calls `search()` with no `opts`, so it never executes the occupancy path at all. That also means the occupancy path shipped with **zero** automated coverage — see §5.9.9.

**5.9.0 Where the owner's data actually lives (established 2026-08-18 — read this before assuming anything about deployment).** The owner runs the app from `https://zenithjuno.github.io/schedule-swap-pp/` and has never opened a local copy ("ไม่สะดวก หาไม่เจอ"). Three consequences that override the natural assumptions:
- **The published page is the product.** A fix that exists only in a working tree does not exist. The unit of delivery is a **push**, not a saved file.
- **`localStorage` is partitioned by origin, and the origin is the web page.** The entire semester — schedule, phone book, and the swap log — lives under the `zenithjuno.github.io` origin, imported there by hand; the empty embedded-data island of the public edition (§7.4) is never used to seed it. A local file, a `file://` copy and a `localhost` server are each a *different* store holding *different* data. Any test that opens a different origin is testing an empty program unless a backup is restored into it first.
- **Same origin cuts both ways.** Anything published under that origin — including a `/preview/` path — shares the owner's live store. That is what makes real-data testing effortless, and it is exactly why an unfinished build must never be published to the site's root.

**5.9.1 The ledger is derived, never stored.** One pure function, `buildLedger(log)`, folds the log into a map. It is recomputed from scratch at every point of use — the log is a few hundred rows per semester, so there is no cache, no incremental update, no invalidation, and therefore no staleness bug class. **`LogEntry`'s shape does not change; `schemaVersion` does not change; existing backups and archived semesters load untouched.** This is deliberate: the fix must not put the owner's real data at risk.

**5.9.2 Claim key and claim kinds.** *(Corrected at Stage 28c, 2026-08-18 — the first draft of this section modelled only one kind and was incomplete; see the correction note below.)* The key is absolute — **`teacher_id | ISO date | period`** — never a weekday. There are **two kinds of claim**, and keeping them apart is the whole point:

- **`BUSY`** — this teacher is committed to stand in a room and teach at that slot on that date.
- **`HANDOVER`** — this teacher's **own** class in that slot has been given away on that date, so it can never be given away again.

They are independent facts about the same key. A teacher who has handed their class over is *free*, and may perfectly legitimately be `BUSY` covering someone else in that very slot. Every `LogEntry` whose `status !== 'ยกเลิก'` emits:

| # | claim | key | kind |
|---|---|---|---|
| 1 | Me's class that period is given away | `me_id \| date_absent \| per_give` | `HANDOVER` |
| 2 | Y is covering it | `y_id \| date_absent \| per_give` | `BUSY` |
| 3 | Y's class at the give-back slot is given away | `y_id \| date_back \| per_back` | `HANDOVER` |
| 4 | Me teaches it as the make-up | `me_id \| date_back \| per_back` | `BUSY` |

Each claim carries `{entryId, status, kind, role}` so any conflict can be reported as "which rows, in what state". A `ยกเลิก` row emits nothing — cancelling frees everything instantly.

> **Correction note (28c).** The first draft called the two kinds `OCCUPY` and `RELEASE` and only ever checked `OCCUPY`; `RELEASE` was inert. That model was **incomplete**, and the owner's own data proved it: replayed against the pre-cleanup log it found 4 collisions, while the corrected model finds **8**. The four it missed were all "the same class period given away twice" — including ครู 0603 handing the same 26 ส.ค. คาบ 1 period to two different swaps, which is physically impossible and which nothing in the app would ever have flagged. The lesson, recorded as law in §12: *"this teacher is busy" and "this class period is already promised" are different facts, and a model that collapses them silently loses the second.*

**5.9.3 The invariant (order-independent, and that is the point).**

> **For every key: at most ONE `BUSY` claim, and at most ONE `HANDOVER` claim.**

Two claims of *different* kinds on one key are legal and ordinary. Two of the *same* kind are the bug. Correctness must not depend on the order rows were created, saved, approved, or restored from backup; `created_at` is used **only** to describe a conflict to the human — never to decide who wins. The app never auto-resolves a collision; a human picks which row to `ยกเลิก`.

**5.9.4 Reservation strength (locked decision Q6-1).** Every non-`ยกเลิก` status reserves its slots:

| status | hold | search treats it as | commit / approve |
|---|---|---|---|
| `เสนอ` | **soft** | blocked (identical to hard) | blocked, with the message naming the holder's status |
| `รออนุมัติ` | **soft** | blocked (identical to hard) | blocked, ditto |
| `อนุมัติแล้ว` | **hard** | blocked | blocked |
| `ยกเลิก` | none | free | free |

Rationale (owner's call, 2026-08-17): *"บล็อกเท่าอนุมัติแล้ว"*. §5.3 already permits exactly one substitute per give-up slot, so a soft hold costs the owner no real option — and a `เสนอ` row is a promise already made to a colleague by phone. If the owner changes their mind, `ยกเลิก` frees the slot in one click, which is the escape hatch the s25.1 guard already established. Search must *distinguish* the two strengths in its labels (§5.9.5) even though it blocks both, so the owner can see that a greyed week is freeable.

**5.9.5 Gate G1 — search.** The offset scan consults the ledger, not the old approved-only list, and the two ends ask different questions:

- **Give-up end** — *can Y stand in Me's room?* Blocked by a **`BUSY`** claim on `(Yid, dateAbsent, per1)`. `HANDOVER` on Y does **not** block: a teacher who gave their own class away is free. Checking `BUSY` rather than the old single `ycover` kind is what closes the asymmetry — a partner who owes a **make-up of their own** at that slot is just as committed as one who is covering someone.
- **Give-back end** — *is this trade still available?* Blocked by **any** claim, of either kind, on `(Yid, gb, per2)` or `(me, gb, per2)`. `HANDOVER` on Y is the one that stops a period being given away twice; `BUSY` on Me stops Me being in two rooms at once; `HANDOVER` on Me means Me is away then and cannot teach a make-up. Some of these are redundant in a healthy log and fire only when the log is already broken — that redundancy is deliberate, so the gate fails safe.

Claims from entries about the **same give-up slot** as the current search (`me_id | date_absent | per_give`) are ignored throughout: the owner is looking for a *replacement* for that slot, and §5.3's one-substitute-per-slot rule is enforced at save time instead. A candidate is dropped only when all offsets −3..+3 are blocked (§5.8 rule 1, unchanged). Week-picker labels: `(ติดคิวแล้ว)` for a hard hold, **`(จองไว้แล้ว — ยังไม่อนุมัติ)`** for a soft one.

**5.9.6 Gate G2 — commit (`บันทึกลง Log`).** `saveToLog` **rebuilds the ledger at that instant** and re-validates all four claims of the row about to be written. This is what defeats the stale results page: `offset_info` may be minutes old, the ledger never is. On conflict the save is refused (nothing is written) with a message naming the holder, its slot, its date in BE, and its status:

> `ชนกับรายการที่มีอยู่ — {ชื่อครู} ต้องสอน วัน{วัน} คาบ {คาบ} วันที่ {วันที่ BE} อยู่แล้ว (สถานะ: {สถานะ}) — เลือกสัปดาห์อื่น หรือยกเลิกรายการเดิมก่อน`

The existing give-up-side guard (s25.1 FIX #2) is retained verbatim; it is now the special case of a general rule rather than the only rule.

**5.9.7 Gate G3 — approve.** Promoting a row to `อนุมัติแล้ว` re-validates its claims against a freshly built ledger *excluding that row*. If the promotion would create a second claim of the same kind on any key, the status change is **refused** (the dropdown reverts) with:

> `ไม่สามารถอนุมัติได้ — ชนกับ {ชื่อครู} วัน{วัน} คาบ {คาบ} วันที่ {วันที่ BE} (สถานะ: {สถานะ}) — ต้องยกเลิกรายการใดรายการหนึ่งก่อน`

**Scope widened at 28d:** the check runs on **every** transition to a non-`ยกเลิก` status, not only on promotion to `อนุมัติแล้ว`. Un-cancelling a `ยกเลิก` row re-emits its claims and carries exactly the same risk, and a row sitting in a conflict should not be allowed to advance at all. Transitions **to** `ยกเลิก` are always allowed — the escape hatch must never close, or the owner is trapped in a state they cannot repair. G3 exists because G1+G2 cannot cover a log edited by hand, restored from a backup written by an older build, or promoted in an order nobody predicted.

**5.9.8 The auditor — whole-log integrity, shown not hidden.** `auditLedger(log)` returns every key holding two claims **of the same kind** — two `BUSY` (the teacher is in two rooms at once) or two `HANDOVER` (one class period promised away twice) — each with the full list of offending entries and which kind was violated. Surfaces:

- **บันทึกการสลับ:** a loud red banner above the table when any conflict exists — `⚠️ พบการสอนซ้อน {N} จุดในบันทึกนี้ — ต้องแก้ก่อนใช้งาน` — plus a per-row marker on every entry in a conflicting set, so the owner can see *which* rows to choose between. Recomputed on every render; never a stored flag.
- **ตารางสอน (§6.5) and ฟอร์ม พพ.1-1 (§6.4):** the same banner, because those are the artefacts that leave the screen on paper.

**Second report — คาบที่ลาแล้วยังไม่มีครูสอนแทน (uncovered slots).** *Added to A1 by owner decision, 2026-08-18 — see §5.9.11.* Group log rows by `(me_id, date_absent, per_give)`; a group whose rows are **all** `ยกเลิก` is an uncovered slot: the owner tried to arrange cover and dropped it. A slot with **no** rows at all is NOT reported — that normally just means the owner was not absent that period, and reporting it would bury the real signal in noise. Surfaces, split by actionability:

- **หน้าหลัก reminder strip:** only uncovered slots whose absence date is **today or later** — `⚠️ มี {N} คาบที่ลาแล้วยังไม่มีครูสอนแทน — วัน{วัน} {วันที่ BE} คาบ {คาบ} ({วิชา} ม.{ห้อง})`. These are the ones still fixable, and they are time-critical: the case that produced this requirement was found **two days** before the absence.
- **บันทึกการสลับ:** all of them, past included, as part of the audit banner — the permanent record should not quietly forget a period that went uncovered.

The auditor is not a nicety. G1–G3 protect the future; the auditor is the only thing that can surface the collisions **already sitting in the owner's live log today**, and the only defence against a hand-edited or restored log.

**5.9.9 The handout must never silently pick a winner.** `ttSwapCell` returns on its first matching log row. Replace with: collect **all** matches for the cell; if exactly one, render as today; if more than one, render a red conflict cell — `⚠️ สอนซ้อน {N} รายการ` — listing each moved-in class, and emit one footnote per match. Rationale (law, added to §9): **a printed artefact may never resolve an ambiguity that the data does not resolve.** Showing the owner a wrong-but-tidy grid is strictly worse than showing them a loud mess.

**5.9.10 Oracle impact: none. New coverage: mandatory.** The frozen fixture (§10) contains no log rows, and the self-test calls `search()` without `opts`, so **every fixture expectation is bit-identical before and after A1** — the engine firewall holds by construction, and this must be *demonstrated* (self-test 21/21, golden top-5 unchanged) not assumed. A1 is not complete until a **new ledger suite** joins the harness as a second, independently-frozen test set. It must cover, at minimum:

- the reported incident, replayed exactly: three swaps into พุธ p1 / 26 ส.ค. 2569 — must be impossible at G1 (offer another week), refused at G2, refused at G3;
- soft holds: a `เสนอ` row blocks the next search; promoting it to `รออนุมัติ` keeps it blocked; `ยกเลิก` frees it and the same slot becomes offerable again (the round-trip);
- the asymmetric hole: partner Y already owes a make-up at `dateAbsent`+`per1` → that candidate's give-up end is blocked;
- stale-page defeat: hold a candidate object, approve a conflicting row, then commit — G2 must refuse;
- the auditor on a deliberately corrupt log (a real one is available: the owner's 2026-08-17 state) → reports exactly the expected key and rows;
- handout collision rendering: a double-booked cell renders the conflict cell, never one of the two swaps;
- non-regression of s25.1 FIX #2 (same give-up slot twice = blocked; different periods same day = still allowed).

**5.9.11 Explicitly NOT in A1 (scope fence).** No change to: scoring, ranking, tie-breaks, walking, consecutive runs, lunch rules, the import contract, `LogEntry` shape, `schemaVersion`, the four canonical statuses, or the frozen fixture. **No group/room dimension is added to the claim key.** The reason is `HANDOVER`, not the group being irrelevant: a give-back slot *belongs to* Y, so two swaps trading the same class period both key on the same `y_id` and collide. (The first draft of this fence gave a weaker reason — that both ends share group G — and used it to wave the whole question away; 28c showed that reasoning only holds once `HANDOVER` exists. Keep the conclusion, keep the corrected reason.) A1 changes *when and against what* the app checks, and *what it shows when a check fails*. Nothing else.

**One deliberate widening, by owner decision (2026-08-18).** The uncovered-slot report (§5.9.8, formerly parked as F12) is now **in** A1. It was found by the Stage 28a audit of real data — พฤหัสฯ 20 ส.ค. คาบ 4, two cancelled attempts, no replacement, two days out — and the owner ruled it must be emphasised, not parked. Recorded here rather than quietly absorbed, because a scope fence that moves without a signature is not a fence. It qualifies on the fence's own terms: same ledger, same render surfaces, no new stored field, no engine contact.

**5.9.12 Forward compatibility — entry *kind* (F9, parked; recorded here because A1's shape must not block it).** The owner has identified a second real-world arrangement the app cannot express: **สอนแทน** — giving a period away outright, with nothing taken back — as distinct from **แลกคาบ**, the reciprocal swap that is v1's only model (§3.1 Model C).

This is **not a fifth status.** The four canonical statuses (§5.2) say *how far along* an entry is and stay exactly four, forever. What is missing is an orthogonal field — `kind: แลกคาบ | สอนแทน` — saying *what kind of arrangement* it is. Every row has one status **and** one kind; the two axes never merge. Any future session tempted to add "สอนแทน" to the status dropdown is reading this paragraph wrong.

The only thing A1 owes F9 is **not standing in its way**: `buildLedger` must treat "which claims this entry emits" as a property of the entry, never a hard-coded set of four. A สอนแทน entry has no give-back end, so it emits **two** claims — #1 `OCCUPY (y_id | date_absent | per_give)` and #3 `RELEASE (me_id | date_absent | per_give)` — while #2 and #4 simply do not exist. Written that way, the invariant, all three gates and the auditor keep working unchanged the day F9 lands; written as "always four", every one of them needs surgery. That is the entire A1 obligation.

Everything else F9 touches is **out of A1** and needs its own design pass: search has no give-back slot to place or score (most of §3.6 goes quiet, and Checks B/C/D are moot), the พพ.1-1 wording differs from a swap request, the handout footnote for the give-up cell reads differently and the partner gets no "ย้ายคาบเข้า" pair, and the dashboard/Log need to show the kind at a glance. Do not smuggle any of that into A1.

---

## 6. UI SPEC (one xlsx sheet ≈ one page; Thai labels)

Top tab bar: `หน้าหลัก · ผลการค้นหา · บันทึกการสลับ · ฟอร์ม พพ.1-1 · ตารางสอน · ตั้งค่า · อ่านก่อนใช้งาน` + an always-visible header strip: active semester label, "สำรองล่าสุด: N วันที่แล้ว" (§7.3), and the semester switcher for archives (read-only badge when viewing an archive).

### 6.1 หน้าหลัก (inputs + absence-day dashboard)
Inputs: วันที่เสนอสลับ (kept until changed), วันที่ลา (date picker; weekday auto-derived to the พฤหัสฯ-style names; out-of-semester sanity warning), ครูที่ต้องการลา (autocomplete dropdown "0221 — นายชัชพงษ์ โชคพนารัตน์"), ขอบเขตการสลับคืน (อนาคต/อดีต/ใกล้ที่สุด, default from settings).
Dashboard: 9 rows (period | วิชา/กลุ่ม | ห้อง | สถานะ | ผลกระทบนักเรียน | action). Status values and the per-period lunch logic port from the POC verbatim (ยังไม่ได้ค้นหา / เสนอ↔name / รออนุมัติ↔name / อนุมัติแล้ว↔name / ยกเลิก / ไม่ต้องสลับ / พักกลางวัน / ไม่สามารถสลับได้); when multiple log rows match (Me + dateAbsent + period), show the **highest-priority status**: อนุมัติแล้ว > รออนุมัติ > เสนอ > ยกเลิก. Color bands: green=done, amber=waiting, white=เสนอ, red=to-do/ยกเลิก, grey italic=N/A.
**Every swappable row carries a "ค้นหา" button** → runs the search, jumps to ผลการค้นหา. (This IS the dynamic-period-list feature; there is no separate period dropdown.)

### 6.2 ผลการค้นหา
Banner restating Me's slot. Candidate table: อันดับ | คะแนน (band-colored ≥90 green / ≥70 amber / else red, live from settings) | ครูคู่สลับ | วัน-คาบ | วิชา | สัปดาห์ (offset picker; D1-blocked weeks greyed) | วันที่สอนคืน (BE) | คำเตือน (top-2 + "… และอีก K รายการ").
**Click a row → expands inline** to the full detail panel: identity + partner phone (§6.8), weekly workloads, Me→Y and Y→Me sections with all four before→after day counts, full sectioned warnings (คำเตือนสำหรับ Me / Y / ทั่วไป-นักเรียน; loud-red treatment for the §3.7 pair), Tier-3 room-sequence tables for both ends, ที่มาคะแนน full score receipt, audit (raw_cell + audit_note), and a **"บันทึกลง Log"** button. Empty/invalid states show the POC's exact Thai messages (§8.1–8.2).

### 6.3 บันทึกการสลับ — per §5.3.

### 6.4 ฟอร์ม พพ.1-1 (direct generation; unit = leave event)
- Inputs: absence period **from / to date** (equal = single day) + editable boxes for every non-table field of the official memo (names, reason, header date, time range, etc.).
- Table auto-fills with every อนุมัติแล้ว swap whose dateAbsent ∈ range, sorted date then period, rendered as a **pre-checked checkbox list** (untick to exclude). Columns map 1:1 to the POC's ฟอร์มขอแลกคาบ: give-up [ว/ด/ป · คาบ · ม./.. · รหัสวิชา · สถานที่], give-back [ว/ด/ป · คาบ · รหัสวิชา · สถานที่], ตัวบรรจง = partner FIRST NAME (strip titles นาย/นาง/นางสาว/ว่าที่ร้อยตรี/Mr./Ms./Miss → first word), ลายเซ็น blank. Dates BE short form "8 มิ.ย. 69".
- **Wording adapts**: single day → "ในวันที่ …"; range → "ระหว่างวันที่ … – …". ⚠️ EXACT phrasing of both variants is an **owed input**: the owner supplies a real filled memo (ideally multi-day) at the build stage; until then the layout uses clearly-marked placeholder text.
- **Table length dynamic** (2 or 12 rows), paginating cleanly across printed pages. The old 5-row limit was the Word template's accident.
- Output: print-ready page (print CSS, TH Sarabun New, A4) → browser print/PDF. Plus a **"คัดลอกตาราง"** button (HTML table → clipboard, pastes into Word cleanly) as the permanent fallback. **No phone field on the form.**

### 6.5 ตารางสอน (the per-teacher handout — F1)
Pick a teacher (quick-list defaults to everyone touched by อนุมัติแล้ว swaps). App **auto-detects every week** in which that teacher is touched (give-up OR give-back end) and pre-selects them. Output: one Mon–Fri × 9-period grid per selected week, real BE dates in column headers, base schedule with that week's date-specific swaps applied, swapped-in/out cells highlighted, footnote lines under each grid ("คาบ 6 พฤหัสฯ: สอนแทน ครู… ตามบันทึกลงวันที่ …"). Weeks without change don't print. Print CSS, one grid per page.

### 6.6 อ่านก่อนใช้งาน — in-app port of the read-me sheet: the usage flow, what each page does, the backup model, semester import steps. Must make the app self-explanatory to a colleague who never met the owner.

### 6.7 ตั้งค่า — all Config keys with Thai labels + one-line explanations, "คืนค่าเริ่มต้น" reset, stored per-browser, included in backups, behind an **"ตั้งค่าขั้นสูง" toggle** (casual users see only basics: preference default, backups, semester management).

### 6.8 Phones appear in exactly two places: candidate detail panel (next to partner name) and Log rows. Missing → muted grey "ไม่มีข้อมูลเบอร์ติดต่อ", never blocking.

---

## 7. PERSISTENCE, SEMESTERS, DISTRIBUTION

### 7.1 Semester lifecycle
Import new semester (validated, all-or-nothing, acknowledgment of the warning report required) → previous semester auto-archives as a **complete read-only bundle** (schedule + log + phones + meta), browsable via the switcher. Capacity: localStorage ≈ 5 MB ≈ **4–6 bundles**; the app warns when filling and offers "export bundle to file then purge."

### 7.2 Backup/restore
One-click backup = download the full store JSON (§5.1). Restore = pick a backup file → confirm → replace. Restore also accepts single-bundle exports.

### 7.3 Backup reminders (the locked trio)
1. **Loud prompt** as the active semester's end date approaches (and immediately after semester import or self-export).
2. **Always-visible** header line "สำรองล่าสุด: N วันที่แล้ว" — passive truth, no popup.
3. **Soft nag** only when BOTH: >30 days since last backup AND new อนุมัติแล้ว rows since that backup.

### 7.4 Self-export — "สร้างไฟล์พร้อมใช้ (.html)" (the TiddlyWiki pattern)
Downloads a copy of the app with the **current active semester embedded** (schedule + phones + settings; NOT the owner's log), so a colleague double-clicks and it works with zero import steps. Recommended implementation: the master file keeps a dedicated data island `<script type="application/json" id="embedded-data">` (empty in the master); self-export serializes the current document source with that island filled (escape `</script>` sequences as `<\/script>`!). Acceptance bar (hard): the exported file passes the full self-test (§10), can itself re-export, and renders byte-identically in print. On open, an embedded-data file loads its payload as the active semester if the browser store is empty; otherwise the browser store wins. Manual import (§4) remains available in every copy forever — it is the fallback path.

---

## 8. EDGE CASES & VALIDATION (port verbatim; Thai strings exact)

### 8.1 Source-slot validation (before searching)
- Combined group → `คาบนี้เป็นคาบรวมห้อง ไม่สามารถใช้โปรแกรมนี้สลับได้`
- Lunch (use the per-day single-lunch computation, not a naive gap test — a lunch gap must say lunch, a free gap must say not-teaching) → `คาบนี้เป็นเวลาพักกลางวัน`
- Role-bound → `คาบนี้เป็นกิจกรรมที่ปรึกษา (ชุมนุม/คุณธรรม/ฯลฯ) ไม่สามารถสลับได้`
- Not teaching → `ในวันและคาบนี้ ครูที่ระบุไม่ได้สอน — กรุณาเลือกคาบที่มีการสอน`

### 8.2 Valid-but-empty results: the POC diagnostic ("ไม่พบครูที่สามารถสลับได้ …" + group teacher-count + suggestions).

### 8.3 Known tricky cases (each gets a regression test): same-day swap (deltas combine); first/last-period walking; blank-room walking (skip); alpha-room building (self); lunch-split consecutive run; flexible-meeting both directions; past-dated give-back (soft warn, allowed); thin group (5.10A-style solo teacher → empty diagnostic); dual-level teacher lunch display (e.g. 0219); teachers genuinely teaching both p4 & p5 (1317, 1810 → no lunch tag); the give-back==absence-date clash (candidate 0507-type, now auto-skipped by D2).

---

## 9. CONVENTIONS

- **9.1 Files/versioning:** `schedule_swap_HTML_s{NN}[.rev]_{YYYY-MM-DD}.html`; a delivered file is NEVER overwritten — every intra-stage fix is its own `.rev`; latest = highest stage then rev. New cumulative `schedule_swap_HTML_CHANGELOG.txt` (the xlsx changelog is closed history).
- **9.2 Governance:** this BLUEPRINT is sacred; user decisions override it but are recorded ONLY in the changelog; the changelog is updated on every significant change and handed over at session end.
- **9.3 No AI at runtime; fully deterministic.** No network. No telemetry.
- **9.4 Dates:** internal ISO 8601; ALL display/print = Buddhist Era (CE+543), Thai month abbreviations (ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.), formats "8 มิ.ย. 2569" (UI) / "8 มิ.ย. 69" (form table).
- **9.5 Thai text safety:** never space-tokenize room strings; match พฤหัสฯ verbatim; keep teacher_id as text everywhere.
- **9.6 No silent winner (A1 law):** where the data holds an ambiguity or a contradiction, no renderer, exporter or printed artefact may quietly resolve it by picking the first match. Show the conflict loudly and let the human decide. A tidy wrong handout is worse than an ugly correct one, because the owner acts on paper.
- **9.7 Check at every gate, not the friendliest one (A1 law):** a rule enforced only where results are *generated* is not enforced. Anything that guards data integrity must be re-checked at the moment data is **written** and at the moment it is **promoted**, each time against freshly derived state — never against a snapshot taken earlier in the flow.

---

## 10. THE ORACLE HARNESS (three layers; the project's spine)

1. **Frozen fixture** `oracle_fixture.json`, extracted from the s23 workbook in Stage 0, embedded in the app forever. Contents: (a) a **self-contained mini-dataset** (every schedule row the fixture's searches touch — fixture must run with NO semester imported); (b) the golden test (§1.2) with full expected candidate tables (scores, warnings, give-back dates); (c) the s20 end-to-end scenario (0221 absent Mon 2026-06-08: p2 → 5 partners, p3 → 9 partners, block/unblock round-trip); (d) every §8.3 edge case with expected output; (e) ~10 random breadth searches across other teachers/days with expected candidate sets. Expected-difference annotations for D1/D2 baked in.
2. **Hidden in-app self-test** ("ตรวจสอบระบบ" in ตั้งค่าขั้นสูง): re-runs the entire fixture any time, any machine, any year — independent of the loaded semester — and reports pass/fail per case in plain language. This is the "still healthy in 2580" guarantee.
3. **Build-time gates:** every engine stage's pass gate is a side-by-side table, xlsx value vs JS value, matching to the integer (tied score groups compared as unordered sets per §3.5).
4. **Ledger suite** (added by A1, §5.9.10): a second frozen set, independent of the oracle fixture, covering everything the fixture structurally cannot — the occupancy ledger, the three gates, the auditor, and the handout's collision rendering. It exists because the oracle fixture carries **no log rows** and calls `search()` with no `opts`, which is precisely why the double-booking defect shipped undetected. Lesson to keep: *the oracle only proves the parts the oracle exercises* — anything the fixture cannot reach needs its own frozen suite, or it has no coverage at all.

---

## 11. SCOPE LEDGER

**IN (v1):** everything above.
**IN (A1, post-v1 correctness fix — §5.9):** occupancy ledger · soft holds for เสนอ/รออนุมัติ · gates at commit and approve · whole-log auditor · **uncovered-slot report (added by owner decision 2026-08-18, §5.9.11)** · handout collision cell · ledger test suite. Closes the s25.1 "DEFERRED #3" backlog item, which this defect proved was not optional. **Ships via the public `index.html` (s27 → s28), which GitHub Pages serves at `zenithjuno.github.io/schedule-swap-pp/` — that page IS the owner's daily tool** (established 2026-08-18: they use the web link exclusively and have never opened a local copy). Nothing reaches them until it is committed and pushed. The `private/` data-loaded file gets the same patch as the colleague-handout artefact, but it is **not** anyone's working copy.
**LATE stages (after v1 passes; same governance):** F3 Mode B (specify both slots, find who fits) · F4 full-day before/after grids for both teachers.
**OUT (cancelled or rejected):** F5 co-teaching refinement · F7 3-way chains · F8 room-availability matrix · full phone-matcher port · server/backend of any kind · IE/legacy browsers · merging logs across users.
**🔭 HORIZON (parked consciously):** **F13 off-roster substitute (ผู้สอนแทนนอกระบบ)** — owner-identified 2026-08-18 from a live need; **design and build together with F9**, they are two halves of one gap; key decisions already locked (§11.1) · **F10 per-teacher summary message** · **F11 per-class (รายห้อง) swap view** (sketches for all four in §11.1) · **F9 entry kind แลกคาบ/สอนแทน** (owner-identified 2026-08-17: giving a period away with no give-back is a real arrangement the app cannot express; an orthogonal `kind` field, NOT a fifth status — §5.9.12 keeps A1 compatible with it) · F6 department emergency-fill mode (owner interested; v2 candidate) · พพ.1-1 exact wording variants (OWED: owner supplies a real filled memo, ideally multi-day, at Stage 19) · phone-source data cleaning (separate project) · docx export of the form (post-v1 candidate).

### 11.1 Parked feature sketches (F10, F11) — recorded 2026-08-17 so the thinking is not lost

These are **not approved specs.** They are the owner's stated wants plus the design points that are not obvious, captured while they are fresh. Each still needs its own design pass before any build.

**F10 — ข้อความสรุปการแลกคาบสำหรับครูรายคน (per-teacher summary message).** A short, copyable Thai message about one teacher's swaps, for sending to that teacher (Line/SMS) — the natural completion of the tap-to-call workflow added in s25.1, and the missing lightweight sibling of the printed ตารางสอน handout (§6.5), which is a whole grid when what a colleague usually needs is two sentences.
- **Write it from the recipient's point of view, not the owner's.** The Log is Me-centric ("ครูคู่สลับคือ…"); a message to ครูเบญญาภา must read as *her* obligations — what she teaches instead, when, which room, whose class — or she has to mentally invert every line. This inversion is the whole substance of the feature; everything else is string assembly.
- **Self-contained.** BE dates, day name, period, subject, group, room, and the counterpart's name in every line. A message that says "คาบ 1 วันพุธ" and assumes shared context will be read three weeks later out of context.
- **Say what to DO,** not what the database holds: "วันพุธ 26 ส.ค. 2569 คาบ 1 อาจารย์สอน ค30227 ม.4/7 ห้อง 328 แทน ครูชัชพงษ์" beats any table rendering.
- Reuse the s25.1 clipboard machinery (`ClipboardItem` + `execCommand` fallback) — plain text flavour is enough here; no HTML table.
- Open question for the design pass (**OWED: owner's answer**): is the unit *one partner teacher* (message per colleague, the likely reading) or *one leave event* (one message covering all of that day's arrangements)? These produce different groupings and different wording.
- **Depends on A1.** A summary message leaves the app and lands in another person's phone. Generating one from a log that still permits double-booking would broadcast a wrong promise to a third party and make the error much more expensive to retract than a wrong line on the owner's own screen. Build after §5.9 ships, not before.

**F11 — รายละเอียดรายห้อง (per-class swap view).** For a chosen student group (ม.4/2, …), what actually changes for that class: which dates and periods have a different teacher/subject than the printed timetable, and what it was swapped with.
- **This is the one stakeholder the app has never modelled.** Everything today is teacher-keyed — dashboard, Log, handout, form. The class is the party that experiences every swap and has no view of its own; the homeroom teacher and หัวหน้าห้อง have no artefact to hold.
- **The data is already there and needs no new storage.** Both ends of a swap are the same group G by construction (§3.1), and `group_give` is stored on every LogEntry (§5.2), so F11 is a **pivot of the existing log by group** — a presentation feature, not a model change.
- **It is not a new integrity dimension, and must not be sold as one.** As long as A1's teacher-level invariant holds (§5.9.3), a class can never end up with two teachers in one period; that is exactly why §5.9.11 refuses to add group to the claim key. F11's value is *pedagogical visibility*, not correctness: it answers "ม.4/2 lost maths three times this month and got two of them back in one week" — a question the owner currently cannot ask at all.
- Natural surfaces: a group picker beside the teacher picker on ตารางสอน (§6.5), reusing the same dated-grid renderer with the class as subject; or a compact per-class change list. Decide in the design pass.
- **Also depends on A1**, for the same reason as the handout (§5.9.9): a per-class view built on a colliding log would show one tidy wrong class and hide the other.

**F12 — รายงานคาบที่ลาแล้วยังไม่มีคนแทน (uncovered-slot report).** Surfaced by the Stage 28a audit of the owner's real backup on 2026-08-18, which found พฤหัสฯ 20 ส.ค. คาบ 4 (ค31103 ม.4/2 ห้อง 323) with **two** cancelled attempts and no replacement — two days before the absence. Same ledger, same banner surface, near-zero cost: group log rows by `(me_id, date_absent, per_give)` and report any group whose rows are **all** `ยกเลิก`. Distinguish it from "never attempted" (no rows at all), which usually just means the owner was not absent that period — the signal that matters is *tried and dropped*. **DECIDED 2026-08-18: owner ruled this must be emphasised → promoted into A1, built at Stage 28e.** Binding spec now lives in §5.9.8; this entry is kept as the origin record.

**F13 — ผู้สอนแทนนอกระบบ (off-roster substitute).** Owner-identified 2026-08-18 from a live need: the substitute found for that uncovered period is a **นักศึกษาฝึกสอน**, who exists in no imported schedule and has no `teacher_id`. The owner's ask, verbatim in intent: leave the partner blank and let me type the name myself.

- **This is not a text-field request; it is two model gaps at once.** A student teacher has no class of their own to hand back, so the arrangement is a **สอนแทน**, not a **แลกคาบ** — that is F9. And they are not in the roster, so the partner cannot be a `teacher_id` — that is F13. Neither half works alone: F9 without F13 still demands a roster partner; F13 without F9 still demands a give-back that does not exist. **Design them in one pass, build them as one amendment.**
- **Consequence for the ledger (§5.9.2), stated plainly:** an off-roster สอนแทน entry emits exactly **one** claim — `HANDOVER (me_id | date_absent | per_give)`. The `BUSY` claim on the substitute cannot exist (no `teacher_id` to key it on) and the give-back pair does not exist. That single claim is not decoration: it is what stops a second substitute being booked for the same period. So the per-entry claim count across the three arrangement types is **4 / 2 / 1** — the second, sharper vindication of §5.9.12.
- **Be honest about what cannot be checked.** With no timetable for that person, the app **cannot** verify the substitute is free, is not double-booked, or even exists. Say so in the UI — a muted line such as `ผู้สอนแทนนอกระบบ — โปรแกรมตรวจเวลาซ้อนให้ไม่ได้` — rather than rendering an unverified arrangement identically to a verified one. Silence here would repeat the exact mistake §9.6 was written to outlaw.
- **Identity — DECIDED 2026-08-18: free text, nothing else.** Owner: *"ไม่ต้องเก็บข้อมูลละเอียด พิมพ์ชื่ออิสระเลย"*. No roster, no ids, no phone, no CRUD page. Autocomplete over previously-typed names is permitted as a **convenience only** and must never become a stored roster. The name is a label on the entry, not an identity — so no claim is ever keyed on it, and the app must not pretend it can track that person across entries.
- **There is no search to run.** The whole flow today is search → pick candidate → commit; here there is no candidate set, no score, no warnings. The entry needs a **create path that bypasses search** — the natural home is the หน้าหลัก dashboard row for the period that needs cover, beside its existing ค้นหา button (§6.1). `score` stays null; the Log already renders `—` for that.
- **ฟอร์ม พพ.1-1 — DECIDED 2026-08-18: no new document, no new variant.** Owner: *"จะใส่ชื่อใครก็ได้ จุดสำคัญคือคาบที่ว่างไปมีครูมาสอนแทน"*. The memo's purpose is to record that the vacated period is covered, so an F13 row prints with the typed name in the partner/ตัวบรรจง position and the give-back columns blank. Signature stays blank as always. *(Confirm against a real filled memo when one is supplied — the §11 OWED item — but do not design a second form on speculation.)*
- **Downstream, no decision needed:** ตารางสอน (§6.5) gains a note on the owner's own grid but can generate **no mirror handout**, because the substitute has no timetable · F10 can produce no message without a typed phone · the four canonical statuses (§5.2) apply unchanged.
- **Does not change A1's scope.** A1 ships as specified; F9+F13 land afterwards as their own amendment. The only obligation A1 already carries is §5.9.12's per-entry claim emitter — which this request now makes non-negotiable rather than merely prudent.

*Design signal recorded 2026-08-18: the owner's fallback for anything the app cannot yet express is to copy the timetable into Word and finish it by hand — that is how พฤหัสฯ 20 ส.ค. was actually handled. So every output feature (F10, F11, and the F13 form row) must be **paste-into-Word clean**, not merely print-clean; the s25.1 `ClipboardItem` HTML-table path already proved the pattern. The owner's manual Word step is not a workaround to design away — it is the escape hatch that makes the app safe to trust, and it should stay easy.*

*Shared note for F10 and F11: both are read-only derivations of the Log. Neither adds a field, changes `schemaVersion`, or touches the engine — which is why both are cheap once A1 has made the Log trustworthy, and why neither should be started until it has.*


---

## 12. DECISION LOG (anti-re-litigation; one line each)

**Foundation:** D-A paste-values workflow dropped (scar tissue) · D-B direct form generation w/ editable fields + copy-table fallback (approved on the input-box condition) · H1.1 client-side offline only, no server interest · H1.2 single self-contained .html, data imported not baked · H1.3 plain JS/CSS no framework no build step, SheetJS embedded (zero-maintenance for a non-dev) · H1.4 persistence = localStorage + backup/restore file (option c) · H1.5 shareable w/ colleagues, phones included (owner: not sensitive at school), per-browser logs accepted · H1.6 desktop-first, mobile read-only checking · H1.8 semester change archives data (data is valuable).
**Features:** F1 handout IN (dynamic, multi-week) · F2 dynamic period list IN (absorbed into dashboard ค้นหา buttons) · F3/F4 late · F5/F7/F8 out · F6 horizon/v2.
**Import:** Q2-1 strict contract (a), template shipped, contract frozen between projects · Q2-2 two-tier report + four ported cleaning audits (reconstruction equality, alpha-room vocab, 4-digit-starts-with-1, subject-code shape) · Q2-2b duplicate (teacher,day,period) = BLOCKER (cleaning pipeline catches new rules first) · Q2-3 ซ่อมเสริม re-parse in importer · Q2-4 label + start + end dates all required · Q2-5 phones = 2-column import only; full matcher CANCELLED · Q2-6 all-or-nothing import · Q2-7 full semester bundles archived, 4–6 capacity, export-then-purge · Q2-8 self-export (a) + manual import fallback (b).
**Engine:** Q3-1 three-layer oracle harness w/ self-contained fixture (valid forever) · Q3-2 D1 date-aware block-list (overblock must disappear; documented deviation) · Q3-3 D2 smart week default + warning retained · Q3-4 tie-break locked score→day→period→teacher_id · Q3-5 Config = settings page behind ตั้งค่าขั้นสูง toggle.
**UI:** Q4-1 seven tabs + semester strip · Q4-2 click-to-expand inline detail w/ บันทึกลง Log · Q4-3 dashboard per-row ค้นหา buttons · Q4-4 delete only while เสนอ, else ยกเลิก-only · Q4-5 form unit = leave event (date range), pre-checked rows absorb hand-picking, adaptive single/multi-date wording, dynamic paginated table (5-row limit was a template accident) · Q4-6 handout = one dated grid per auto-detected affected week, highlight + footnote · Q4-7 TH Sarabun New embedded · Q4-8 BE everywhere.
**Governance/ops:** Q5-1 phones in detail panel + Log only, not on the form · Q5-2 Chrome/Edge target, Firefox best-effort · Q5-3 HTML naming convention + fresh cumulative changelog · Q5-4 blueprint sacred again, slug swap-html · Q5-5 backup trio (end-of-semester loud + passive header line + 30-day-AND-new-approvals soft nag) · Q5-6 Stage 0 = fixture extraction from s23.
**Closing:** L-1 no clear/reset exists; Log append-only; new session = new absence date; date-aware mechanics prevent pollution · L-2 Log default filter (active+upcoming / show-all) + display-only เสร็จสิ้น ✓ tag; canonical 4 statuses unchanged.
**Amendment A1 (2026-08-17, §5.9):** Q6-1 every non-ยกเลิก status holds its slots; เสนอ/รออนุมัติ block searches exactly as อนุมัติแล้ว does (owner's call — one substitute per slot is already the rule, and ยกเลิก is the one-click escape) · Q6-2 occupancy is a derived ledger recomputed on every use, never stored; LogEntry shape and schemaVersion untouched so real backups stay loadable · Q6-3 correctness is order-independent: the invariant is "≤1 BUSY and ≤1 HANDOVER per (teacher, date, period)" (corrected at 28c from a single-kind model that missed double give-aways), createdAt only *describes* a conflict and never resolves one · Q6-4 checked at three gates (search / commit / approve) because each defeats a different failure — blind suggestion, stale results page, hand-edited or restored log · Q6-5 a whole-log auditor is mandatory, not optional: gates protect the future, only the auditor surfaces collisions already in the live log · Q6-6 the app never auto-resolves a collision; a human chooses which row to ยกเลิก · Q6-7 no group/room dimension in the claim key (both ends are the same group by construction) · Q6-8 the occupancy path gets its own frozen test suite; the frozen oracle stays frozen and untouched · **Q6-10** uncovered-slot report promoted INTO A1 (owner, 2026-08-18: "คาบที่ยังไม่มีครูสอนแทนก็ต้องเน้น") — the one deliberate widening of the §5.9.11 fence, signed and dated · **Q6-11** off-roster substitute identity = free text only, no roster, no ids, no phone; autocomplete is convenience, never storage; no claim is ever keyed on a typed name · **Q6-12** พพ.1-1 takes any name — no second form, no new variant; give-back columns blank on a สอนแทน row · Q6-9 แลกคาบ vs สอนแทน is a `kind` field orthogonal to status, parked as F9; A1's only duty is to emit claims per-entry rather than always-four so F9 drops in without touching the invariant, the gates or the auditor (§5.9.12).

*Hard-won POC lessons inherited as law: walking = independent two-ends sum, no same-day dedup · lunch is a property of the student group · logs store static display values · test through the user's real workflow, not simulated values · data is the source of truth over spec counts (9 ซ่อมเสริม rows).*

*Hard-won v1 lessons inherited as law (A1, 2026-08-17): "this teacher is busy" and "this class period is already promised" are different facts — a model that collapses them silently loses the second (28c) · a reservation that only exists once approved is not a reservation · a check that runs only at generation time is not enforced (§9.7) · never let a renderer resolve an ambiguity the data does not resolve (§9.6) · the oracle only proves what the oracle exercises — an untested path is an untested path however green the suite is · a deferral logged with a reason must be re-examined against that reason, not inherited as settled (the s25.1 "would break the frozen oracle" reason was never true).*
