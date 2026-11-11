# BLUEPRINT — UI Preview
Version 2 / approved through S02 2026-11-11. Control: `BUILD-CONTROL-ui-preview.md`.

## Original problem
ทำรุ่นทดลองที่อ่านง่ายและทำข้อเสนอแลกคาบพร้อมตารางจำลองก่อนอนุมัติได้ เปิดด้วยอีกลิงก์เพื่อเปรียบเทียบกับเว็บเดิม โดยรักษาเว็บเดิมไว้ใช้งานต่อและใช้ข้อมูลจริงชุดเดียวกันเป็นฐาน

## Task contract
| Field | Locked value |
|---|---|
| Goal | รุ่นทดลอง `/preview/` ที่พัฒนาทีละขั้นและเว็บเดิมยังใช้ได้ |
| User value | ลอง UI และข้อเสนอด้วยสำเนาข้อมูลจริงโดยไม่กระทบงานจริง |
| Scope | S01 delivered; S02 homepage/results UI only, preserving storage and calculation semantics |
| Source of truth | `docs/UX-UI-AUDIT-2026-11-11.md`; stable behavior `docs/BLUEPRINT-swap-html.md`; stage sequence `CONSTRUCTION_PLAN-ui-preview.md` |
| Constraints | Root `index.html` and existing storage are read-only; no real data embedded/published |
| Acceptance criteria | Copy real snapshot with counts; changing preview does not change original; existing engine/ledger tests pass |
| Verification | Browser isolation, backup/export, failure tests; root hash; publication and old-page checks |
| Out of scope | S03–S07 until their gates; no score, eligibility or leave-rule changes in S02 |

## 1. รุ่นทดลองและสำเนาข้อมูล
Root page stays at `/schedule-swap-pp/`. New page `/schedule-swap-pp/preview/` starts as a standalone copy of the current app. Always show experimental badge, current stage scope and old-page link. Preserve offline/self-export behavior.

Storage: root `swapApp.v1` is read-only from preview. Preview backing storage uses a lossless `SWAP-PREVIEW-TABLES-1:` envelope: schedule property names are stored once as columns, repeated string values once in a dictionary, and row arrays reference those strings. Decode restores every original field and value before the app reads it. Existing plain JSON preview stores remain readable and convert on the next save. Runtime objects, JSON backups and ready-file embedded data remain the ordinary schema below; only the isolated preview backing representation changes. This S01 conformance fix reduces shared-origin quota usage without deleting history or using another backend. Preview writes `swapApp.preview.v1`, `swap_preview_adv_view`, `swap_preview_last_open` and its existing scratch check key only. Read root only when reviewing/copying. No auto-copy or sync; show source semester, semester/row/teacher/log/leave/phone counts, and require explicit Copy. If source changes after review, refuse and refresh summary. Reject absent/corrupt/unsupported source without altering either store. If preview already contains semesters, refuse overwrite and direct to backup/restore workflow. Persist copied-at metadata inside preview store; reset preview backup reminder because a root backup is not a backup of subsequent preview work. Copy commits storage before reload and handles quota failure without replacing existing stored data. Do not put user data in URLs, logs or repository.

Data schema stays version 1: use real backup shape already inspected: `schemaVersion`, `activeSemester`, `semesters`, `settings`, `phonebook`, `lastBackupAt`, `approvedSinceBackup`, `noEmbed`; semester `meta`, `schedule`, `log`, `leaves`, `phones`. Preserve schema compatibility and archived semesters. Public data schema remains unchanged; compact backing storage is specified above.

Same-origin and same browser profile are required for direct read. For file:// or different browser/device show backup-restore alternative; never auto-detect another origin or fetch private data. Preview backup filenames and ready-file exports identify the experimental edition. Exported HTML retains preview storage keys and shell.

## 2. หน้าแรกและผลค้นหา (S02)
User accepted S01 and authorized S02 with “ต่อไปได้ครับ” on 2026-11-11. Only homepage/results presentation changes: remove decorative grid; teacher/date first, planning-date and preference in optional settings; concise task steps and real data summary. Existing default selection and eligibility stay unchanged until S03.

Results become readable candidate cards, preserving every candidate, idx, rank, score and available offset. Show name/date/period first, week selector with explicit label, plain-Thai warnings and a keyboard-operable detail button. Opening one candidate closes the other. Changing return week updates date, warning summary and open detail without losing candidate order. No fake or disabled preview action before S04.

Detail first shows both dates, contact, weekly load, warnings and the save action. Daily workload, student walking, score receipt and raw audit are separate collapsed details. Preserve all existing data; explain ranking score is not a percentage. Replace Me/Y only in UI strings, never mutate engine warnings/data. Keep known S03 calculation issues deferred. Screen-only sans-serif font and higher contrast; paper/print retain embedded TH Sarabun New and existing print semantics. Narrow-screen home/results must not overflow at 390px.

## Active Contract Index
| Scope | Active contract | Current source | Enforcement |
|---|---|---|---|
| `preview/**` | `DEC-001`, `DEC-002`, `DEC-003`, `DEC-004`, `DEC-005`, `DEC-006` | `BLUEPRINT-ui-preview.md` | `tests/preview-s01.cjs`, `tests/preview-s02.cjs` |
| `tests/**` | `DEC-001`, `DEC-002`, `DEC-005`, `DEC-006` | `BLUEPRINT-ui-preview.md` | browser isolation, UI interaction and original digest assertions |


## Decision Log
| ID | Scope | Decision and rationale | Status |
|---|---|---|---|
| DEC-001 | preview | Keep root and its storage unchanged; use a new route | ACTIVE |
| DEC-002 | preview | Real same-source snapshot, independent writes; user clarified that shared-data answer meant real rather than fictional data | ACTIVE |
| DEC-003 | preview | New copy action is opt-in, reviewed and non-overwriting; same-origin local read only | ACTIVE |
| DEC-004 | preview | Stage gate at each review; S01 approved by “โอเค เริ่มได้ครับ”; not an instruction to do all stages | ACTIVE |
| DEC-005 | preview/tests | No embedded personal data; preserve regression baseline and test failure paths | ACTIVE |

| DEC-006 | preview/tests | S02 presentation as §2; preserve every engine result and keep detailed evidence accessible | ACTIVE |

Ledger fidelity: original D01–D05 migrated 5/5; current active constraints indexed 5/5. D05 planning-only state superseded by explicit S01 approval. Existing draft ledger remains historical routing only.

## Assumptions
Pages branch publishing: verify via actual deployment in S01. Shared localStorage between root/preview only on same origin/profile: verify browser in S01. Future partial-day return policy remains deferred to S03; S01 leaves behavior unchanged.
