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
