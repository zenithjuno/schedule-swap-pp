# BLUEPRINT — UI Preview
Version 4 / full-flow library brief accepted; set A (S02A) authorized 2026-11-11. Control: `BUILD-CONTROL-ui-preview.md`.

## Original problem
ทำรุ่นทดลองที่อ่านง่ายและทำข้อเสนอแลกคาบพร้อมตารางจำลองก่อนอนุมัติได้ เปิดด้วยอีกลิงก์เพื่อเปรียบเทียบกับเว็บเดิม โดยรักษาเว็บเดิมไว้ใช้งานต่อและใช้ข้อมูลจริงชุดเดียวกันเป็นฐาน

## Task contract
| Field | Locked value |
|---|---|
| Goal | รุ่นทดลอง `/preview/` ที่พัฒนาทีละขั้นและเว็บเดิมยังใช้ได้ |
| User value | ลอง UI และข้อเสนอด้วยสำเนาข้อมูลจริงโดยไม่กระทบงานจริง |
| Scope | S01 delivered; CHG-001 full-flow brief accepted; set A (S02A) authorized. Existing S02 card design superseded; B–F gated |
| Source of truth | `docs/UX-UI-AUDIT-2026-11-11.md`; stable behavior `docs/BLUEPRINT-swap-html.md`; stage sequence `CONSTRUCTION_PLAN-ui-preview.md` |
| Constraints | Root `index.html` and existing storage are read-only; no real data embedded/published |
| Acceptance criteria | S01 isolation retained; round rail, all candidate rows, actual dates and selected proposals are usable; all legacy routes accessible; explicit saves only; unchanged engine/ledger pass |
| Verification | Browser isolation, backup/export, failure tests; root hash; publication and old-page checks |
| Out of scope | Sets B–F until their gates; no score, eligibility, leave-rule or stored-status changes in A |

## 1. รุ่นทดลองและสำเนาข้อมูล
Root page stays at `/schedule-swap-pp/`. New page `/schedule-swap-pp/preview/` starts as a standalone copy of the current app. Always show experimental badge, current stage scope and old-page link. Preserve offline/self-export behavior.

Storage: root `swapApp.v1` is read-only from preview. Preview backing storage uses a lossless `SWAP-PREVIEW-TABLES-1:` envelope: schedule property names are stored once as columns, repeated string values once in a dictionary, and row arrays reference those strings. Decode restores every original field and value before the app reads it. Existing plain JSON preview stores remain readable and convert on the next save. Runtime objects, JSON backups and ready-file embedded data remain the ordinary schema below; only the isolated preview backing representation changes. This S01 conformance fix reduces shared-origin quota usage without deleting history or using another backend. Preview writes `swapApp.preview.v1`, `swap_preview_adv_view`, `swap_preview_last_open` and its existing scratch check key only. Read root only when reviewing/copying. No auto-copy or sync; show source semester, semester/row/teacher/log/leave/phone counts, and require explicit Copy. If source changes after review, refuse and refresh summary. Reject absent/corrupt/unsupported source without altering either store. If preview already contains semesters, refuse overwrite and direct to backup/restore workflow. Persist copied-at metadata inside preview store; reset preview backup reminder because a root backup is not a backup of subsequent preview work. Copy commits storage before reload and handles quota failure without replacing existing stored data. Do not put user data in URLs, logs or repository.

Data schema stays version 1: use real backup shape already inspected: `schemaVersion`, `activeSemester`, `semesters`, `settings`, `phonebook`, `lastBackupAt`, `approvedSinceBackup`, `noEmbed`; semester `meta`, `schedule`, `log`, `leaves`, `phones`. Preserve schema compatibility and archived semesters. Public data schema remains unchanged; compact backing storage is specified above.

Same-origin and same browser profile are required for direct read. For file:// or different browser/device show backup-restore alternative; never auto-detect another origin or fetch private data. Preview backup filenames and ready-file exports identify the experimental edition. Exported HTML retains preview storage keys and shell.

## 2. หน้าแรกและผลค้นหา (S02)
S02 implementation below is incumbent evidence only. User did not accept its visual direction; do not treat stacked cards or one-open detail as binding future design. CHG-001 below governs the new discovery.

User accepted S01 and authorized S02 with “ต่อไปได้ครับ” on 2026-11-11. Only homepage/results presentation changes: remove decorative grid; teacher/date first, planning-date and preference in optional settings; concise task steps and real data summary. Existing default selection and eligibility stay unchanged until S03.

Incumbent results use candidate cards, preserving every candidate, idx, rank, score and available offset. Show name/date/period first, week selector with explicit label, plain-Thai warnings and a keyboard-operable detail button. Opening one candidate closes the other. Changing return week updates date, warning summary and open detail without losing candidate order. No fake or disabled preview action before S04.

Detail first shows both dates, contact, weekly load, warnings and the save action. Daily workload, student walking, score receipt and raw audit are separate collapsed details. Preserve all existing data; explain ranking score is not a percentage. Replace Me/Y only in UI strings, never mutate engine warnings/data. Keep known S03 calculation issues deferred. Screen-only sans-serif font and higher contrast; paper/print retain embedded TH Sarabun New and existing print semantics. Narrow-screen home/results must not overflow at 390px.

## 3. Accepted full-flow overhaul (CHG-001)
Product truth and confirmed user workflow: `../PRODUCT.md`. User explicitly confirmed two dimensions: chooser compares people/dates/constraints and decides; communicator shows the selected proposal through both teachers' before/after timetables. Both must coexist in one complete flow, not compete as alternative designs.

Whole-site UI brief is accepted; implementation is authorized for set A only. Preserve stable root and independent real-data copy. Do not advance to B without its gate or use the rejected S02 look. Confirmed: desktop selection, mobile viewing/communication; full-week communication tables; one leave-round plan with per-partner packets. User selected the library concept (“พื้นที่ทำงานคุ้นมือ”) from question 87b42c3a. Full-flow brief and proposed A–F roadmap: `SHAPE-ui-overhaul.md`, accepted by user, set A authorized. DEC-008 and S02A now govern implementation. No new storage statuses or data migration is implied by planning a peer-agreement step.

### Accepted end-to-end topology (delivery split by SHAPE A–F)
- Global destinations: plans, actual timetable, records/documents, data/settings. Selected library shell uses these groups; all seven legacy routes remain reachable before any future feature replacement.
- Plan overview: absent periods in one leave round, selected/unresolved periods, saved work and a route back to each decision. No auto-selection.
- Selection workspace on desktop: absent-period list, a dense candidate comparison table scoped to the chosen period, and persistent chosen-proposal context. Compare eligible dates/return periods and explicit caveats before optional scoring evidence. Do not suppress candidates or treat rank as approval.
- Plan review: show cross-selection conflicts and uncovered periods. Alternatives remain editable. Revalidation is needed after an upstream choice changes; design does not imply a new engine rule.
- Partner packet: collect the selected swaps for one teacher, plain-language responsibilities, full-week before/after tables for both teachers, real week dates and changed periods. If two weeks differ, identify/show each affected week; never combine different weeks into a fictional timetable. Clearly label draft simulation. Print/export design remains subject to existing capabilities and privacy constraints.
- Agreement/approval: record the outcome through a reviewed mapping to existing statuses; opening/exporting simulation never approves. Unsuccessful negotiations return to candidate selection. Changed proposals must regenerate communication content and be checked again.
- Actual timetable/history: distinguish actual approved lessons from proposals, preserve withdrawal/cancellation/history and documents. No new stored status is approved here.
- Supporting flows included in overhaul inventory: substitution, import/backup/ready-file export, contacts, archived semesters, first-run/empty/error states, forms, navigation, printing and return-to-plan paths. S03 known bugs remain tracked separately.

## Active Contract Index
| Scope | Active contract | Current source | Enforcement |
|---|---|---|---|
| `preview/**` | `DEC-001`, `DEC-002`, `DEC-003`, `DEC-004`, `DEC-005`, `DEC-008` | `BLUEPRINT-ui-preview.md` | `tests/preview-s01.cjs`, `tests/preview-a.cjs` |
| `tests/**` | `DEC-001`, `DEC-002`, `DEC-005`, `DEC-008` | `BLUEPRINT-ui-preview.md` | browser isolation, UI interaction and original digest assertions |


## Decision Log
| ID | Scope | Decision and rationale | Status |
|---|---|---|---|
| DEC-001 | preview | Keep root and its storage unchanged; use a new route | ACTIVE |
| DEC-002 | preview | Real same-source snapshot, independent writes; user clarified that shared-data answer meant real rather than fictional data | ACTIVE |
| DEC-003 | preview | New copy action is opt-in, reviewed and non-overwriting; same-origin local read only | ACTIVE |
| DEC-004 | preview | Stage gate at each review; S01 approved by “โอเค เริ่มได้ครับ”; not an instruction to do all stages | ACTIVE |
| DEC-005 | preview/tests | No embedded personal data; preserve regression baseline and test failure paths | ACTIVE |

| DEC-006 | preview/tests | S02 presentation as §2, now evidence of rejected direction | SUPERSEDED BY DEC-007 |
| DEC-007 | preview/product context | Whole-flow discovery, completed by accepted SHAPE brief and set A authorization | SUPERSEDED BY DEC-008 |
| DEC-008 | preview/tests | Accepted library direction and SHAPE flow; S02A implements only set A, candidate generation unchanged; explicit select/save uses existing proposed log entries, no new storage model | ACTIVE |

Ledger fidelity: original D01–D05 migrated 5/5; current active constraints indexed 6/6. D05 planning-only state superseded by explicit S01 approval. Existing draft ledger remains historical routing only.

## Assumptions
Pages branch publishing: verify via actual deployment in S01. Shared localStorage between root/preview only on same origin/profile: verify browser in S01. Future partial-day return policy remains deferred to S03; S01 leaves behavior unchanged.
