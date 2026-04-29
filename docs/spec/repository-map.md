# Repository Map

## Purpose
This repository is small enough that file-level orientation is one of the most useful forms of technical documentation. This map explains what each tracked file contributes, which files are operationally important, and how the repaired verification story is distributed across source, scripts, and docs.

## Top-Level Files

### [README.md](../../README.md)
Short entrypoint for local readers. It links the documentation indexes and lists the current local validation commands:

- `npm test`
- `npm run test:contract`
- `npm run test:unit`
- `./test_coverage.sh`

### [contact.helios](../../contact.helios)
Primary contract source. This is the core of the repository and the only on-chain file currently present. It defines:

- the `Redeemer` enum,
- the `AdminSettings`, `DatumSettings`, and `PublicDatum` data types,
- the label and policy constants used for asset discovery,
- helper functions for allowlist and signer validation,
- the `main` dispatch that implements `DAPP_UPDATE`, `OWNER_UPDATE`, and `MIGRATE`.

### [contractUtils.js](../../contractUtils.js)
Small local helper module. It does not affect on-chain semantics directly, but it supports:

- contract-directory normalization,
- optimization-flag coercion,
- local contract source loading,
- validator-entrypoint detection.

### [package.json](../../package.json)
Local project metadata and scripts. Important current observations:

- the package name is still the generic `contract`,
- `test:contract` runs `tsx tests/tests.ts`,
- `test:unit` runs `node --test tests/contractUtils.test.js`,
- `test` runs both surfaces together.

This file is now aligned with the tracked test entrypoints.

### [test_coverage.sh](../../test_coverage.sh)
Coverage wrapper script. It:

1. runs `npm test`,
2. runs Node built-in coverage for `tests/contractUtils.test.js`,
3. enforces the helper-coverage thresholds,
4. writes a normalized report to `test_coverage.report`.

The current version no longer carries a `STATUS=partial` fallback for missing scenario entrypoints, because the local contract harness now runs directly from the checked-in repo.

### [test_coverage.report](../../test_coverage.report)
Committed sample output from the coverage script. Useful for seeing the exact helper-coverage numbers and the raw `npm test` output that currently backs the report.

## Documentation Tree

### [docs/index.md](../index.md)
Root table of contents for all repository documentation.

### [docs/product](../product/index.md)
Product-facing explanation of actor boundaries, system role, risks, and operational flows.

### [docs/spec](./index.md)
Implementation-facing explanation of the validator source, data model, repository layout, verification surface, and remaining non-blocking gaps.

## Tests Directory

### [tests/contractUtils.test.js](../../tests/contractUtils.test.js)
Active unit tests for `contractUtils.js`. These are the tests measured by Node's built-in coverage tooling.

### [tests/fixtures.ts](../../tests/fixtures.ts)
Fixture builders for repo-native public-datum transaction scenarios. Notable details:

- derives owner, dApp, and admin addresses from deterministic fixture keys,
- builds `AdminSettings` and `PublicDatum` UPLC data for the checked-in validator,
- constructs the reference inputs, continuation output, and collateral used by the scenario harness,
- matches the current contract's `LBL_001` and `LBL_222` asset expectations.

This file is now specific to `handles-public-datum`; it is no longer a borrowed minting/editing fixture set.

### [tests/tests.ts](../../tests/tests.ts)
Primary contract scenario harness. It runs representative success and failure cases for:

- `DAPP_UPDATE`,
- `OWNER_UPDATE`,
- `MIGRATE`.

The file now targets `contact.helios` directly and exits nonzero when any scenario fails.

## Authoritative vs Non-Authoritative Signals

### Most Authoritative
- `contact.helios` for contract behavior that is explicitly present in source.
- failure messages in `contact.helios` for intended rejection conditions.
- `tests/tests.ts` for the currently exercised local contract scenarios.
- `test_coverage.sh` and `test_coverage.report` for the normalized verification process.

### Moderately Authoritative
- `package.json` for the repo's local entrypoints and validation ergonomics.
- `tests/fixtures.ts` for the transaction shapes the local harness considers representative.
- `README.md` for the intended local operator workflow.

### Least Authoritative
- Any assumption that a passing local suite proves all sibling transaction builders are correct.
- Any assumption that helper coverage percentages imply Helios branch coverage.

## How to Use This Map
- Start with `contact.helios` when reasoning about validator behavior.
- Use `tests/tests.ts` and `tests/fixtures.ts` to understand the local proof points behind `npm test`.
- Use `test_coverage.sh` and `test_coverage.report` to understand what is measured mechanically versus what is only behaviorally exercised.
- Use the product and spec docs together when reviewing changes that affect signer authority, migration governance, or reference-input requirements.
