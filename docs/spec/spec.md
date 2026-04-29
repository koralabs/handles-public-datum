# Technical Spec

## Repository Purpose
The repository contains the Helios spending validator that controls updates to a handle's public datum plus a small amount of JavaScript support code for local tooling and coverage measurement. The validator is implemented in [contact.helios](../../contact.helios) and exposes three redeemer paths:

- `DAPP_UPDATE`
- `OWNER_UPDATE`
- `MIGRATE`

The technical design is intentionally compact. Most of the spec value is therefore in making the compact source legible: what each helper loads, what each assertion protects, and which current repo gaps limit confidence in automated verification.

## File-Level Architecture

### On-Chain Source
- [contact.helios](../../contact.helios): the spending validator, its data types, constants, and all authority checks.

### Local Tooling
- [contractUtils.js](../../contractUtils.js): small helper functions used by local tests and coverage measurement.
- [test_coverage.sh](../../test_coverage.sh): wraps `npm test` and Node's built-in test coverage for helper utilities.
- [test_coverage.report](../../test_coverage.report): a generated sample report showing current measurable coverage status.

### Tests
- [tests/contractUtils.test.js](../../tests/contractUtils.test.js): unit coverage for the local utility helpers.
- [tests/fixtures.ts](../../tests/fixtures.ts): scenario fixtures that appear to belong to a broader contract-testing workflow.
- [tests/tests.ts](../../tests/tests.ts): legacy scenario harness entrypoint that currently references missing files.

## Data Types

### `Redeemer`
Defined as an enum with three constructors:

- `DAPP_UPDATE { handle: ByteArray }`
- `OWNER_UPDATE { handle: ByteArray }`
- `MIGRATE { handle: ByteArray }`

Each path carries the handle bytes needed to locate related assets in transaction context.

### `AdminSettings`
Contains:

- `valid_contracts: []ByteArray`
- `admin_creds: []ByteArray`

This datum supplies the approved destination validator hashes and configured admin signer hashes.

### `PublicDatum`
Contains:

- `datum: Map[ByteArray]Data`
- `settings: DatumSettings`

The `datum` map is the shared application data surface. `settings` contains policy toggles that dApps must not change.

### `DatumSettings`
Currently contains:

- `migrate_sig_required: Int`

The field acts as a Boolean-like switch in the validator: zero disables the owner co-signing requirement for migration; any non-zero value enables it.

## Constants and Asset Discovery

### `HANDLE_POLICY`
The validator hardcodes a `MintingPolicyHash` used to derive related asset classes. That links this contract to the broader Handles asset namespace.

### Label Constants
The file declares:

- `LBL_002`
- `LBL_222`

and defines:

- `SETTINGS_HANDLE = AssetClass::new(HANDLE_POLICY, LBL_222 + ("pd_settings".encode_utf8()))`

The settings reference input is located by checking for exactly one unit of that asset class.

### Current Source Gap: `LBL_001`
In `load_datum`, the validator tries to find the public datum continuation output using `AssetClass::new(HANDLE_POLICY, LBL_001 + handle)`. This file does not declare `LBL_001`. As the repository is currently checked in, that is either:

- an unresolved source defect,
- or evidence that the file was extracted from a larger codebase where the constant was provided elsewhere.

The docs record this explicitly because it affects technical confidence in the snapshot.

## Helper Functions

### `is_valid_contract`
Input:

- `hash: ValidatorHash`
- `settings: AdminSettings`

Behavior:

- Iterates `settings.valid_contracts`.
- Rebuilds each entry as a validator credential.
- Asserts that one entry matches the output validator credential.

Purpose:

- Prevents continuation or migration to an unapproved script.

### `load_datum`
Input:

- `handle: ByteArray`
- `ctx: ScriptContext`

Behavior:

1. Finds the settings reference input by locating the `pd_settings` asset.
2. Finds the continuation output by locating the target handle asset.
3. Asserts both are present.
4. Parses `AdminSettings` from the reference input's inline datum.
5. Parses `PublicDatum` from the continuation output's inline datum.
6. Verifies that the continuation output address is a validator address and that the hash is allowlisted.
7. Returns `(admin_settings, public_datum, true)`.

Purpose:

- Centralizes shared loading and destination validation logic for all redeemer paths.

### `get_owner_token`
Finds the root-handle reference input by looking for the `LBL_222 + handle` asset class. It fails if the owner's handle asset is not present in reference inputs.

### `admin_has_signed_tx`
Checks that at least one signatory is present and that one signatory matches either:

- the hardcoded admin public key hash embedded in source,
- or one of the `AdminSettings.admin_creds` entries.

This function means migration governance is partly data driven and partly hardcoded.

### `owner_has_signed_tx`
Loads the owner token reference input and compares the transaction signatories with the payment credential derived from the owner's address. It fails when the owner reference input is missing or the matching signer is absent.

### `migration_signers_are_valid`
Requires:

- `admin_has_signed_tx(settings, ctx)`
- and, when `public_datum.settings.migrate_sig_required != 0`, `owner_has_signed_tx(handle, ctx)`

## Main Validation Dispatch

### `DAPP_UPDATE`
The validator:

1. Calls `load_datum`.
2. Asserts that the spending datum's `settings` equals the continuation datum's `settings`.
3. Iterates over the continuation datum map.
4. For each key/value pair, asserts either:
   - the transaction is signed by the key's public key hash, or
   - the prior datum already contained that exact value for the key.

Implication:

- a signer may update its own key,
- all other keys must be unchanged,
- `settings` is immutable from the dApp path.

### `OWNER_UPDATE`
The validator:

1. Calls `load_datum`.
2. Iterates over the continuation datum map.
3. For every surviving key/value pair, asserts equality with the spending datum.
4. Requires `owner_has_signed_tx`.

Implication:

- owner path is delete-only for third-party values,
- omission of keys is allowed,
- mutation of any preserved value is forbidden.

### `MIGRATE`
The validator:

1. Calls `load_datum`.
2. Requires `migration_signers_are_valid`.
3. Returns `true`.

Implication:

- all destination allowlist checks are still enforced through `load_datum`,
- migration authority depends on both signer policy and reference-data policy.

## Local Utility Layer
`contractUtils.js` is intentionally minimal:

- `resolveOptimizationFlag` converts a truthy input into a Boolean.
- `normalizeContractDirectory` removes a trailing slash from a contract directory path.
- `readContractSource` loads the Helios file.
- `hasValidatorEntrypoint` checks whether a source file contains `validator` or `spending`.

These helpers are not protocol logic, but they support local tooling and the measurable coverage path used in this repo today.

## Verification Story

### What Currently Verifies Cleanly
`tests/contractUtils.test.js` covers the helper utility module, and `test_coverage.report` shows 100% measured line and branch coverage for `contractUtils.js`.

### What Is Only Partially Verified
`test_coverage.sh` treats `npm test` as informative but not fully required when failure is caused by missing runtime dependencies or missing entrypoints. In that situation it emits `STATUS=partial` rather than a hard failure if helper coverage still meets threshold.

### What Does Not Currently Line Up
The current repo snapshot contains several mismatches:

- `package.json` references `tests/tests.js`, but only `tests/tests.ts` exists.
- `package.json` references `tests/txTests.ts`, which is absent.
- `tests/tests.ts` references `minting.helios` and `editing.helios`, which are absent from this repo.
- the validator source references `LBL_001`, which is not declared in this file.

Those points do not invalidate the documented intended behavior, but they do limit how far local verification can be trusted without follow-up cleanup.

## Implementation Consequences

### For Maintainers
Any change to signer checks, datum key semantics, or destination hashing is a product change. Do not treat those edits as routine refactors.

### For Off-Chain Builders
The continuation output is not just a container for new data. Its address, datum shape, and token set are part of validation.

### For Reviewers
Read validation changes together with documentation changes. In a repo this small, un-updated docs are a meaningful review risk because they hide the authority model.
