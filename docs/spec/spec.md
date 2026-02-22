# Technical Spec

## Architecture

### Validator
- File: `contact.helios`
- Contract type: `spending public_datum`
- Redeemers:
  - `DAPP_UPDATE { handle }`
  - `OWNER_UPDATE { handle }`
  - `MIGRATE { handle }`

### Core Validation Functions
- `is_valid_contract`
  - validates destination validator hash against `AdminSettings.valid_contracts`.
- `load_datum`
  - loads settings reference input and public datum output,
  - asserts both are present and output contract is approved.
- `owner_has_signed_tx`
  - validates owner signature from root handle reference token.
- `migration_signers_are_valid`
  - enforces admin and optional owner signature rules.

## Redeemer Logic

### `DAPP_UPDATE`
- Settings must remain unchanged.
- dApp may only change datum entries for keys signed by corresponding pubkey hash.

### `OWNER_UPDATE`
- Owner signature required.
- Owner cannot mutate existing dApp values; only allowed to remove entries.

### `MIGRATE`
- Admin signature required.
- Owner signature additionally required when `migrate_sig_required` is set.

## Utility and Coverage Harness
- `contractUtils.js` contains local utility helpers for:
  - optimize-flag resolution,
  - contract directory normalization,
  - contract source loading and entrypoint checks.
- `test_coverage.sh` executes Node coverage for `tests/contractUtils.test.js` and enforces >=90% lines/branches.
- `test_coverage.report` stores the generated coverage output.

## Known Test Runtime Constraint
- Repository `npm test` currently fails because `test:old` points to `tests/tests.js`, but the repo contains `tests/tests.ts`.
