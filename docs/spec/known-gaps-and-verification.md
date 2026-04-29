# Known Gaps and Verification

## Purpose
This document records the difference between what the repository appears intended to verify and what can currently be verified directly from the checked-in files. For a readiness pass, this distinction matters as much as the intended validator behavior because reviewers need to know whether passing local checks represent full contract confidence or only partial confidence.

## Current Verification Commands

### Lightweight Commands Present in the Repo
- `npm test`
- `node --test tests/contractUtils.test.js`
- `./test_coverage.sh`

### What They Mean Today
- `node --test tests/contractUtils.test.js` exercises only `contractUtils.js`.
- `./test_coverage.sh` treats helper utility coverage as the measurable threshold and records some scenario-harness failures as `STATUS=partial`.
- `npm test` is not currently a dependable full-suite signal in this snapshot because its configured entrypoints do not align with tracked files.

## Verified Working Path
The currently reliable verification path is the Node built-in test run for `tests/contractUtils.test.js`. The committed `test_coverage.report` shows:

- 100% line coverage for `contractUtils.js`
- 100% branch coverage for `contractUtils.js`

That is useful for the helper layer, but it does not demonstrate end-to-end validation of the Helios contract logic.

## Gaps Identified in the Current Snapshot

### Script Entry Mismatch
`package.json` defines:

- `test:old = node --es-module-specifier-resolution=node tests/tests.js`
- `test:new = tsx -r dotenv/config tests/txTests.ts`

However:

- `tests/tests.js` is not present,
- `tests/txTests.ts` is not present,
- the tracked scenario file is `tests/tests.ts`.

Result:

- `npm test` does not cleanly represent runnable scenario coverage.

### Missing Contract Files Referenced by Tests
`tests/tests.ts` reads:

- `./minting.helios`
- `./editing.helios`

Neither file exists in the current repo tree. That implies at least one of the following:

- the test suite was copied from another contract repo,
- this repo was partially extracted from a larger working set,
- files were removed without corresponding test cleanup.

Result:

- even if the script entrypoint were corrected, the scenario suite would still not run as-is from this snapshot.

### Source Drift in the Validator
`contact.helios` references `LBL_001` when locating the continuation output, but the file declares only `LBL_002` and `LBL_222`.

Result:

- the checked-in source may not compile as shown,
- or the file depends on context not present in this repo.

This is a technical gap, not just a docs gap, and it should remain visible to future maintainers.

### Coverage Scope Limitation
The committed coverage story focuses on JavaScript helper utilities rather than the validator itself.

Result:

- passing coverage thresholds do not imply validator-path completeness,
- reviewers must not treat `STATUS=partial` in `test_coverage.sh` as full behavioral confidence.

## What `test_coverage.sh` Actually Guarantees
The shell script:

1. runs `npm test`,
2. tolerates certain known `npm test` failures by marking them `na`,
3. runs Node test coverage for `tests/contractUtils.test.js`,
4. enforces 90% thresholds for measured helper scope,
5. emits `STATUS=partial` when helper coverage passes but scenario tests are unavailable for known reasons.

This is a pragmatic maintenance script, not a full contract-verification gate.

## Recommended Interpretation for Reviewers

### Safe Conclusions
- The helper utilities are covered and behave as expected for the tested cases.
- The repo maintainers were aware that scenario verification had environmental or structural issues when `test_coverage.sh` was authored.
- The validator's intended authority model can still be documented from source.

### Unsafe Conclusions
- "All tests pass, so the validator is fully verified."
- "Scenario harness failures are only dependency problems."
- "The current checked-in Helios file is definitely compile-ready."

## Follow-Up Cleanup Candidates
These are the most defensible technical follow-ups suggested by the current state:

- add or restore the missing scenario-harness entrypoints, or remove stale script references,
- reconcile `tests/tests.ts` with the actual files present in this repo,
- confirm whether `LBL_001` should be declared, imported, or replaced,
- add validator-focused automated checks that run against the checked-in contract,
- update package metadata and script naming to reflect the actual repo purpose.

## Why This Document Is Part of Readiness
Documentation readiness is not just a word-count exercise. A repo can have many pages of prose and still mislead reviewers if it glosses over verification gaps. This document exists so that:

- maintainers know what local checks truly cover,
- reviewers do not over-trust partial signals,
- future cleanup work starts from a concrete description instead of rediscovery.

That honesty is part of operational quality for a contract repository.
