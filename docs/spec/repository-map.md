# Repository Map

## Purpose
This repository is small enough that file-level orientation is one of the most useful forms of technical documentation. This map explains what each tracked file contributes, what is likely authoritative, and what currently appears stale.

## Top-Level Files

### [README.md](../../README.md)
Short entrypoint for local readers. It links the doc indexes and lists the lightweight local validation commands.

### [contact.helios](../../contact.helios)
Primary contract source. This is the core of the repo and the only on-chain file currently present. It defines:

- the redeemer enum,
- the admin and public datum structures,
- asset and policy constants,
- helper functions for contract validation and signer checks,
- main validation dispatch.

### [contractUtils.js](../../contractUtils.js)
Small local helper module. It does not affect on-chain semantics directly, but it supports source loading, path normalization, and validator-entrypoint discovery for local tooling.

### [package.json](../../package.json)
Local project metadata and scripts. Important current observations:

- the package name is a generic `contract`,
- `test:old` points to `tests/tests.js`,
- `test:new` points to `tests/txTests.ts`.

Those script targets do not all exist in the current repo snapshot.

### [test_coverage.sh](../../test_coverage.sh)
Coverage wrapper script. It treats helper utility coverage as the measurable threshold and records scenario-harness issues as `STATUS=partial` when missing dependencies or entrypoints explain `npm test` failure.

### [test_coverage.report](../../test_coverage.report)
Committed sample output from the coverage script. Useful for understanding the current local verification story and the exact failure mode of `npm test`.

## Documentation Tree

### [docs/index.md](../index.md)
Root table of contents for all documentation.

### [docs/product](../product/index.md)
Product-facing explanation of actor boundaries, system role, risks, and operational flows.

### [docs/spec](./index.md)
Implementation-facing explanation of the validator source, data model, repository layout, and known technical gaps.

## Tests Directory

### [tests/contractUtils.test.js](../../tests/contractUtils.test.js)
Active unit tests for `contractUtils.js`. These are the tests that currently provide reliable measurable coverage in this snapshot.

### [tests/fixtures.ts](../../tests/fixtures.ts)
Fixture builders for a richer contract-testing environment. Notable details:

- depends on Helios and Kora Labs contract-testing libraries,
- performs remote datum conversion calls against `preview.api.handle.me`,
- appears to support minting and editing scenario tests that extend beyond the files present in this repo.

### [tests/tests.ts](../../tests/tests.ts)
Legacy scenario harness entrypoint. It references `minting.helios` and `editing.helios`, which are absent from the current repository tree, so this file is best read as evidence of historical or partial extraction rather than as a presently runnable test suite.

## Files Not Present but Referenced
The following names are referenced by scripts or tests but are not tracked in the current repo snapshot:

- `tests/tests.js`
- `tests/txTests.ts`
- `minting.helios`
- `editing.helios`

That absence is one of the clearest indicators that the local verification path is incomplete.

## Authoritative vs Non-Authoritative Signals

### Most Authoritative
- `contact.helios` for contract behavior that is explicitly present in source.
- failure messages in `contact.helios` for intended rejection conditions.
- `test_coverage.sh` and `test_coverage.report` for the current measurable local verification process.

### Moderately Authoritative
- `package.json` for intended script entrypoints, with the caveat that some targets are stale.
- `tests/fixtures.ts` and `tests/tests.ts` for hints about broader intended workflows.

### Least Authoritative
- Any assumption that absent files still exist elsewhere in this repo.
- Any conclusion that full validator behavior is covered simply because helper tests pass.

## How to Use This Map
- Start with `contact.helios` when reasoning about validator behavior.
- Use `package.json`, `test_coverage.sh`, and the tests directory to assess local verification fidelity.
- Use the product and spec docs to reconcile intended behavior with current repo drift.
- Treat missing-file references as technical debt to clean up rather than invisible background noise.
