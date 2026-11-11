# BUILD LOG — ui-preview P01

## PRG-001 — S01 started (2026-11-11)
- Approval: user “โอเค เริ่มได้ครับ” after the S01–S07 roadmap.
- Baseline: 7134bfb1b32b5c143589976ecfc50eb00df3f5f3; original root protected.
- Decision fidelity: D01–D05 5/5 migrated; active build constraints indexed 5/5; planning-only status superseded by S01 approval.
- Existing untracked audit and bug-plan documents are outside deployment scope.
- Result: S01 work authorized; no later stage authorized yet.

## PRG-002 — S01 local verification (2026-11-11)
- Built isolated standalone preview, explicit source summary/copy, source-change/overwrite/quota guards, experimental export names and source timestamp.
- Browser: 40 checks passed with real local backup (contents never committed); engine 21/21, ledger 22/22. Standalone ledger suite 43/43.
- A failing browser check caught inherited `.btn` overriding the HTML hidden attribute; fixed with scoped `[hidden]` rule and re-tested.
- Published-file scan: eight managed files checked against all local backup rosters (211 names/150 phone values), no matches. Real author-name examples inherited from the original template were replaced only in preview.
- Original index.html has no changes. Copy does not auto-run or overwrite populated preview.
- Truth receipt: build-only approval supersedes planning-only state; S01 moved ACTIVE → VERIFY; S02–S07 unchanged.
- Checkpoint planned: build/ui-preview/S01. Live URL verification remains before user review.

## PRG-003 — S01 delivered for user review (2026-11-11)
- Product commit: a2b1168, pushed to main; stable checkpoint `build/ui-preview/S01` includes this delivery record.
- Live preview HTTP 200, byte-identical to tested preview/index.html. Root HTTP 200, byte-identical to original index.html; SHA-256 02d2c5d59f376906f867d5320f468e8f1315fbcdefb0452e04934909cc69067f.
- Browser opened deployed preview and visibly confirmed experimental banner, data-copy controls, old-site link, and scope note (S01 only). No real data submitted to website.
- Current-truth review: root/legacy spec unchanged; S01 remains VERIFY until user trial; only active gate is “ผ่าน S01”; S02 not started.
- Known limitations: direct copy requires same browser/profile and exact website origin; use backup restore if source was opened as file or on another device. S01 deliberately retains old layout and known calculation bugs for later stages.
- Validation: control validate/doctor and stale-claim sweep passed with no blocking drift; managed files checked for personal data; unrelated audit documents remain untracked.

## PRG-004 — S01 quota correction (2026-11-11)
- User evidence: copy summary loads, but copy fails with QuotaExceededError. Shared origin means separate keys still share quota. No user data was cleared.
- Missing coverage: original tests simulated a failed write but not successful copying under a realistic byte-counted quota with unrelated origin data. Added 5 MiB quota + 400 KiB unrelated data; pre-fix test failed waiting for copy navigation (red).
- Probe: local full backup compact JSON occupies 3,835,388 UTF16 bytes; lossless table/dictionary backing representation occupies 813,340 bytes before normal lean-save stripping. Probe discarded; no new library/backend.
- Correction: preview-only encoder/decoder preserves schedule fields including missing/null/numeric/object values. Reads old JSON, writes compact envelope. Normal JSON backups and exported HTML stay compatible. Root HTML/storage unchanged.
- Durable safeguard: byte-quota regression, every original row-value assertion, codec mixed-type round trip, standard backup shape and exported-app boot. This restores S01 acceptance rather than advancing S02.
- Verification: 49 S01 browser checks passed using the real local full backup under a simulated byte-counted 5 MiB quota with unrelated data; old plain JSON preview reopened and converted, regular backup restored, exported app booted. Engine 21/21; embedded ledger 22/22; standalone ledger 43/43.
- Normal anonymous-fixture regression also passed before the additional legacy/restore checks (42 checks). Root remains byte-identical. Managed files scanned against all local rosters/phones with no matches.
- Delivery checkpoint: `build/ui-preview/S01-quota`; S01 review remains open, no advance to S02.

## PRG-005 — S01 passed; S02 started (2026-11-11)
- User accepted compact preview storage and said “ต่อไปได้ครับ”; closes S01 and authorizes S02, not later stages.
- Previous quota fix b6b159b was published and HTTP-verified byte-for-byte; root unchanged.
- Current truth: S01 PASS, S02 ACTIVE, DEC-006 indexed; no new public-data format, backend or calculation changes.

## PRG-006 — S02 verification (2026-11-11)
- Built: task-first home, explicit import shortcut, optional planning controls, candidate cards with actual dates and accessible detail buttons, direct save action, four folded evidence sections, Thai names instead of Me/Y, screen-only typography and 390px layout. No fake preview action before S04.
- Verification: S02 38/38 browser checks with real local data; engine region byte-identical to root; all candidate ids/ranks/scores/return dates/offsets match stable root for the test case. Keyboard expand, date/warning updates, single-open candidate, UI save, paper font and mobile expanded-score fit verified.
- Regression: S01 49 checks with quota 5 MiB and real local backup passed after S02 code changes; engine oracle 21/21 and embedded ledger 22/22; standalone ledger 43/43. Root index.html unchanged from 7134bfb.
- Visual inspection: home desktop and results mobile inspected; screenshots kept under private/ux-preview, not published.
- Truth receipt: S01 PASS and S02 VERIFY; DEC-006 indexed; no changes to stable root, compression contract, score/eligibility/date logic. Daily-count bug, leave policy, broader document semantics and timetable simulation remain future stages.
- Checkpoint: build/ui-preview/S02. Stop at user review after live publication.

## PRG-007 — S02 delivered (2026-11-11)
- Product commit ed38de6 pushed to main. Live preview HTTP 200 matches tested preview/index.html byte-for-byte. Original HTTP 200 matches untouched root (SHA-256 02d2c5d59f376906f867d5320f468e8f1315fbcdefb0452e04934909cc69067f).
- Only active user gate: ผ่าน S02. S03 policy/calculation work has not started. Current checkpoint build/ui-preview/S02-review includes the delivery receipt; build/ui-preview/S02 retains the product release.
- Stage map, contract/index and routing reviewed; no personal data in changed public files. Untracked pre-existing audit/bug-plan documents remain outside this checkpoint.

## CHG-001 — Full-flow overhaul discovery (2026-11-11)
- User clarified: timetable A is for communicating with the partner, list B is private decision support; there are two dimensions, selection and communication. User chose overhaul of the complete website flow.
- Approved scope now: full-flow design discovery; not a pass of S02 and not implementation approval for an unspecified replacement.
- Product context captured in PRODUCT.md after the real answer round; no aesthetic choices invented. Material discovery questions issued for device emphasis, communication range and multi-period grouping.
- Truth receipt: S02 visual recipe loses authority (DEC-006 superseded by DEC-007), original product problem and root/data isolation remain. Active gate is shape discovery, not ผ่าน S02. Future stage order must be reconciled after concept approval. No UI files changed.

### CHG-001 discovery answer round — 2026-11-11
- Confirmed desktop-first selection; mobile viewing/communication; full-week default; one leave-round plan split into partner packets.
- Updated PRODUCT and blueprint proposed topology, including explicit handling of distinct affected weeks. No new statuses, engine rules or app edits.
- Next: visual concept selection, then confirmed full-flow brief and revised construction stages.

### CHG-001 concept selected and brief proposed — 2026-11-11
- Read question 87b42c3a answer: library, code-led, buildPathFlipped=false. User confirmed selection in chat. Preserve the selected HTML sketch as composition evidence; no direction contract in shape.
- Added SHAPE-ui-overhaul.md: full-flow screen topology, real-week simulation, desktop/mobile priorities, existing-feature routing, pending status/policy mapping, proposed A–F delivery and acceptance roadmap. Await brief confirmation before implementation contracts and UI work.
- The decision page heartbeat timeout was reproduced from its log; restarted the same question key, reopened and verified HTTP 200, then successfully collected the choice. Screenshots in chat provide a non-expiring-by-heartbeat review fallback. No user choice inferred from a dead server.
- No edits to root or preview application. No private data published, committed, or added to design sketches.

### CHG-001 approved — set A authorized
- User: accepted full brief and authorized set A. Added: library direction, round rail, table and selected-proposal summary. Replaced: rejected stacked-card composition with wide comparison workspace. Removed: discovery-only prohibition after brief acceptance. Superseded: DEC-007 by DEC-008; S02 by S02A.
- Existing root/data isolation, engine, ledger schema unchanged. No new statuses or partial-day rule assumed. B partial-day policy and D agreement mapping retained as bounded pending decisions.
- Exact scope and verification declared in S02A. Select/save uses existing proposed records; navigation never commits.

### PRG-005 — S02A / set A verified
- Built selected library shell: four primary destinations, seven reachable legacy pages, round period rail across actual dates, semantic comparison with complete candidates/offsets/evidence, explicit proposed selection, per-partner selected summary from existing records. Teacher pick refreshes its round picker. No new store schema or engine/ranking changes.
- Focused browser tests: 51/51 with anonymous 2569/1 fixture and 51/51 with full local 2569/2 backup. Includes cross-date rail, return-week/detail sync, explicit one-record save, reload, all routes, archive guard, empty recovery, responsive width and keyboard focus.
- Storage regression: 49/49 with full backup, 5 MiB quota and unrelated origin data; browser engine21/21 + ledger22/22. Standalone preview ledger43/43. Protected root SHA256 remains 02d2c5d59f376906f867d5320f468e8f1315fbcdefb0452e04934909cc69067f; engine/frozen region identical.
- Rendered/inspected six desktop/mobile captures kept ignored and private. Hookless detector ran once: one inherited contrast warning; reviewer resolved it from final backup-stale override. Independent full review requested two fixes; both (SVG warning consistency and active mobile rail/focus) scored resolved in verdict pass with disposition ship. Verdict pass covers those two fixes, not a second whole-surface audit.
- Source privacy check found no private teacher names in added UI code; embedded-data remains empty. No shipping raster assets. Accepted shape/context and direction contract recorded; DESIGN documentation follows final source.
- Checkpoint planned: build/ui-preview/S02A. User review remains open; B partial-day policy and D agreement/status mapping remain gated. Historical S02 test asserts rejected composition and is not current UI acceptance.

- Documentation: shipped documenter extracted final preview-only DESIGN.md and design.json; parent checked frontmatter/content and JSON. Checkpoint records only declared files, excluding private captures, source backups and prior untracked audits.
