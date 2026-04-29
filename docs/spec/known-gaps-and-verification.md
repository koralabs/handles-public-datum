# Known Gaps and Verification

## Purpose
This document records what the repository verifies directly today, what changed during the readiness cleanup, and what still remains outside the repo's local assurance boundary. The goal is not to understate the repaired state of the codebase; the goal is to keep reviewers precise about what a green local run actually means.

## Current Verification Commands

### Commands Present in the Repo
- `npm test`
- `npm run test:contract`
- `npm run test:unit`
- `node --test tests/contractUtils.test.js`
- `./test_coverage.sh`

### What They Mean Today
- `npm run test:contract` executes transaction scenarios against `contact.helios`.
- `npm run test:unit` exercises the JavaScript helper layer in `contractUtils.js`.
- `npm test` runs both of those surfaces together and is the main local pass/fail signal.
- `./test_coverage.sh` reruns `npm test`, then captures Node built-in coverage for `contractUtils.js` and writes a normalized report to `test_coverage.report`.

## Cleanup Completed in This Readiness Pass
The rejected readiness attempt left explicit cleanup items open. The current repository state now closes those items:

- `contact.helios` declares `LBL_001`, which matches the continuation-output lookup used by `load_datum`.
- `contact.helios` compiles cleanly after the lambda and type-order issues in the checked-in source were corrected.
- `package.json` now points to tracked test entrypoints.
- `tests/tests.ts` now targets `contact.helios` instead of absent `minting.helios` and `editing.helios` files.
- `tests/fixtures.ts` now builds repo-native public-datum fixtures rather than borrowed minting/editing fixtures.
- `test_coverage.sh` and `test_coverage.report` now describe a passing harness instead of a `STATUS=partial` fallback path.

Those changes matter because they convert the local verification story from "helper coverage plus known breakage" into "real contract scenarios plus helper coverage."

## Verified Working Paths

### Contract Scenarios
The current scenario suite exercises representative success and failure cases across all three redeemer paths:

- `DAPP_UPDATE`
  - signer may update its own datum key,
  - dApp cannot change `settings`,
  - dApp cannot mutate another signer's datum entry.
- `OWNER_UPDATE`
  - owner may prune third-party entries,
  - owner cannot rewrite preserved third-party values.
- `MIGRATE`
  - admin signer may migrate when owner co-sign is not required,
  - owner co-sign is enforced when `migrate_sig_required` is enabled,
  - migration fails without an admin signer.

This is meaningful validator coverage, not just a compile check.

### Helper Utility Coverage
`tests/contractUtils.test.js` continues to provide complete measured coverage for the repo's JavaScript helper module:

- 100% line coverage for `contractUtils.js`
- 100% branch coverage for `contractUtils.js`

That coverage is narrow by design, but it is now paired with a contract harness instead of standing alone.

### Normalized Coverage Report
`test_coverage.report` is a machine-friendly snapshot of the current local verification result. It captures:

- raw `npm test` output,
- raw Node coverage output,
- the helper coverage percentages,
- the explicit statement that the validator is exercised through the scenario harness rather than Node branch measurement.

## What Still Remains Outside Local Proof

### No Branch Percentage for Helios Source
Node's built-in coverage can measure `contractUtils.js`, but it does not provide a line/branch percentage for `contact.helios`. Reviewers should read the contract scenario suite as behavioral evidence, not as a full branch-coverage metric.

### Scenario Breadth Is Finite
The local scenario harness now tests the repo's core authority model, but it is still a curated set of cases rather than an exhaustive matrix of:

- every possible datum shape,
- every malformed reference-input arrangement,
- every allowlist variation,
- every future migration destination configuration.

That is a normal limitation for a compact local suite, but it should remain visible.

### Sibling Repos Still Own Production Builders
This repository enforces on-chain rules. It does not include the full set of off-chain builders that assemble real production transactions. That means:

- a green local run proves this repo's validator and helper layer are internally consistent,
- it does not by itself prove that every sibling repo is constructing transactions correctly against the validator.

Cross-repo changes still require review in the consumers that build `DAPP_UPDATE`, `OWNER_UPDATE`, and `MIGRATE` transactions.

### Local Harness Warnings
The current scenario harness emits conservative "way too much collateral" warnings. Those warnings do not cause failure and do not invalidate the assertions being tested, but they are a useful reminder that the local harness is a verification tool, not a production fee-optimization tool.

## Recommended Interpretation for Reviewers

### Safe Conclusions
- The repo's stale test-entrypoint and stale source-reference defects from the rejected attempt are fixed.
- The checked-in validator source is now a runnable target for local transaction scenarios.
- The core signer and migration branches are covered by direct local tests.
- The helper utilities remain fully covered under Node's built-in coverage tool.

### Unsafe Conclusions
- "The validator has exhaustive coverage because `npm test` is green."
- "A passing local suite means all ecosystem integrations are correct."
- "No more technical debt remains because the stale-file cleanup is done."

## Follow-Up Hardening Candidates
The cleanup items from the rejection are complete, but sensible follow-up work still exists:

- broaden the transaction scenario matrix beyond the current representative cases,
- add CI or a shared workflow that runs `npm test` and `./test_coverage.sh` automatically,
- reduce or intentionally tune the collateral warnings in the local harness,
- add cross-repo verification where off-chain builders in sibling projects materially depend on this validator.

## Why This Document Is Part of Readiness
Documentation readiness is not only a word-count target. It is also the difference between telling reviewers "the repo was repaired and verifies locally" and misleading them into thinking "nothing else matters now." The repaired docs should let maintainers hold both truths at once:

- the repository is materially more trustworthy than the rejected snapshot,
- local verification still has clearly bounded scope.
