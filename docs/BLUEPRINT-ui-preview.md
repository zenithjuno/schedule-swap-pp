# BLUEPRINT — UI Preview
Version 1 / approved S01 2026-11-11. Control: `BUILD-CONTROL-ui-preview.md`.

## Original problem
ทำรุ่นทดลองที่อ่านง่ายและทำข้อเสนอแลกคาบพร้อมตารางจำลองก่อนอนุมัติได้ เปิดด้วยอีกลิงก์เพื่อเปรียบเทียบกับเว็บเดิม โดยรักษาเว็บเดิมไว้ใช้งานต่อและใช้ข้อมูลจริงชุดเดียวกันเป็นฐาน

## Task contract
| Field | Locked value |
|---|---|
| Goal | รุ่นทดลอง `/preview/` ที่พัฒนาทีละขั้นและเว็บเดิมยังใช้ได้ |
| User value | ลอง UI และข้อเสนอด้วยสำเนาข้อมูลจริงโดยไม่กระทบงานจริง |
| Scope | S01: preview shell, isolated storage, copy from old app, focused tests and deployment |
| Source of truth | `docs/UX-UI-AUDIT-2026-11-11.md`; stable behavior `docs/BLUEPRINT-swap-html.md`; stage sequence `CONSTRUCTION_PLAN-ui-preview.md` |
| Constraints | Root `index.html` and existing storage are read-only; no real data embedded/published |
| Acceptance criteria | Copy real snapshot with counts; changing preview does not change original; existing engine/ledger tests pass |
| Verification | Browser isolation, backup/export, failure tests; root hash; publication and old-page checks |
| Out of scope | S02–S07 until their gates; no score or leave-rule changes in S01 |

## 1. รุ่นทดลองและสำเนาข้อมูล
Root page stays at `/schedule-swap-pp/`. New page `/schedule-swap-pp/preview/` starts as a standalone copy of the current app. Always show experimental badge, current S01 scope and old-page link. Preserve offline/self-export behavior.

Storage: root `swapApp.v1` is read-only from preview. Preview writes `swapApp.preview.v1`, `swap_preview_adv_view`, `swap_preview_last_open` and its existing scratch check key only. Read root only when reviewing/copying. No auto-copy or sync; show source semester, semester/row/teacher/log/leave/phone counts, and require explicit Copy. If source changes after review, refuse and refresh summary. Reject absent/corrupt/unsupported source without altering either store. If preview already contains semesters, refuse overwrite and direct to backup/restore workflow. Persist copied-at metadata inside preview store; reset preview backup reminder because a root backup is not a backup of subsequent preview work. Copy commits storage before reload and handles quota failure without replacing existing stored data. Do not put user data in URLs, logs or repository.

Data schema stays version 1: use real backup shape already inspected: `schemaVersion`, `activeSemester`, `semesters`, `settings`, `phonebook`, `lastBackupAt`, `approvedSinceBackup`, `noEmbed`; semester `meta`, `schedule`, `log`, `leaves`, `phones`. Preserve schema compatibility and archived semesters. No serialization redesign.

Same-origin and same browser profile are required for direct read. For file:// or different browser/device show backup-restore alternative; never auto-detect another origin or fetch private data. Preview backup filenames and ready-file exports identify the experimental edition. Exported HTML retains preview storage keys and shell.

## Active Contract Index
| Scope | Active contract | Current source | Enforcement |
|---|---|---|---|
| `preview/**` | `DEC-001`, `DEC-002`, `DEC-003`, `DEC-004`, `DEC-005` | `BLUEPRINT-ui-preview.md §1. รุ่นทดลองและสำเนาข้อมูล` | `tests/preview-s01.cjs` |
| `tests/**` | `DEC-001`, `DEC-002`, `DEC-005` | `BLUEPRINT-ui-preview.md §1. รุ่นทดลองและสำเนาข้อมูล` | browser isolation and original digest assertions |

## Decision Log
| ID | Scope | Decision and rationale | Status |
|---|---|---|---|
| DEC-001 | preview | Keep root and its storage unchanged; use a new route | ACTIVE |
| DEC-002 | preview | Real same-source snapshot, independent writes; user clarified that shared-data answer meant real rather than fictional data | ACTIVE |
| DEC-003 | preview | New copy action is opt-in, reviewed and non-overwriting; same-origin local read only | ACTIVE |
| DEC-004 | preview | Stage gate at each review; S01 approved by “โอเค เริ่มได้ครับ”; not an instruction to do all stages | ACTIVE |
| DEC-005 | preview/tests | No embedded personal data; preserve regression baseline and test failure paths | ACTIVE |

Ledger fidelity: original D01–D05 migrated 5/5; current active constraints indexed 5/5. D05 planning-only state superseded by explicit S01 approval. Existing draft ledger remains historical routing only.

## Assumptions
Pages branch publishing: verify via actual deployment in S01. Shared localStorage between root/preview only on same origin/profile: verify browser in S01. Future partial-day return policy remains deferred to S03; S01 leaves behavior unchanged.
