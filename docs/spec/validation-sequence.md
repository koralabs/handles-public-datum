# Validation Sequence

## Why a Sequence Document Helps
The validator source is short, but it branches across different authority models. Reading it linearly can obscure the fact that all three redeemer paths share the same loading and destination checks before they diverge. This document rewrites the validator as a validation sequence so maintainers can audit behavior step by step.

## Shared Entry Sequence
No matter which redeemer is supplied, the validator ultimately needs a successor public datum output on an approved contract. The shared sequence is:

1. Identify the redeemer constructor and extract `handle`.
2. Call `load_datum(handle, ctx)` for every path that needs a successor output.
3. Inside `load_datum`, locate the settings reference input by matching the `pd_settings` asset.
4. Locate the continuation output by matching the target handle asset.
5. Fail if either item is missing.
6. Parse `AdminSettings` from the reference input inline datum.
7. Parse `PublicDatum` from the continuation output inline datum.
8. Extract the continuation output validator hash.
9. Require that hash to appear in `AdminSettings.valid_contracts`.

Only after those steps does the script evaluate path-specific permissions.

## Sequence for `DAPP_UPDATE`

### Step-by-Step
1. Load the continuation datum and admin settings through `load_datum`.
2. Compare the spent datum's `settings` with the continuation datum's `settings`.
3. Fail if they differ.
4. Iterate each key/value pair in the continuation datum map.
5. For each pair, check whether the transaction is signed by `PubKeyHash::new(key)`.
6. If signed, the value may differ from the prior datum.
7. If not signed, the value must equal the prior datum's value for that key.
8. Return the `loaded` Boolean from `load_datum`, which is always `true` if all assertions passed.

### What This Means
The continuation datum is the object under inspection. That matters because unauthorized change is detected by looking at what the transaction is trying to keep or introduce in the output, not by scanning the input for ownership metadata.

### Review Implication
If future code changes ever invert the comparison direction or stop checking `settings`, they would materially weaken dApp isolation and should be reviewed as security-sensitive changes.

## Sequence for `OWNER_UPDATE`

### Step-by-Step
1. Load the continuation datum and admin settings through `load_datum`.
2. Iterate each key/value pair in the continuation datum map.
3. Require that every surviving value equals the corresponding value in the spent datum.
4. Call `owner_has_signed_tx(handle, ctx)`.
5. Inside `owner_has_signed_tx`, locate the owner reference token in `ctx.tx.ref_inputs`.
6. Extract the owner public-key credential from the reference input address.
7. Require that one transaction signatory matches that credential.
8. Return `loaded && owner_has_signed_tx(...)`.

### What This Means
Owner update does not authorize mutation of surviving third-party values. Its power is subtraction, not substitution.

### Review Implication
Any future desire for "owner can edit specific values" is not a refactor of this sequence. It would require a new rule set and a new product decision.

## Sequence for `MIGRATE`

### Step-by-Step
1. Load the continuation datum and admin settings through `load_datum`.
2. Call `migration_signers_are_valid(handle, ctx, admin_settings, public_datum)`.
3. Inside that helper, call `admin_has_signed_tx(settings, ctx)`.
4. Require at least one signatory.
5. Accept the signer set only if one signer matches the hardcoded admin key or a configured `admin_creds` value.
6. If `public_datum.settings.migrate_sig_required == 0`, return success once admin approval is satisfied.
7. Otherwise call `owner_has_signed_tx(handle, ctx)` and require owner approval too.
8. Return `true` if all assertions passed.

### What This Means
Migration combines two independent controls:

- destination control through `valid_contracts`,
- signer control through admin and optional owner approval.

### Review Implication
An audit that checks only signers and ignores destination allowlisting is incomplete. The destination hash check is part of the migration security model.

## Failure Ordering
Because Helios assertions stop execution, the ordering of checks affects debugging:

- missing reference inputs fail before signer logic matters,
- invalid destination contracts fail before path-specific mutation checks complete,
- path-specific failures then explain which authority rule was violated.

This ordering is useful because it narrows debugging quickly:

- context missing,
- destination wrong,
- permissions wrong.

## Edge Conditions Worth Calling Out

### Validator-Only Destination Assumption
`load_datum` extracts a validator hash from the continuation output credential and errors if the credential is not a validator credential. That means the validator assumes the public datum always continues under a script, never under a simple pubkey address.

### Signer Key Interpretation
The dApp path converts datum keys directly into `PubKeyHash` values. Invalidly encoded keys would therefore fail at runtime or make the transaction impossible to authorize correctly. Off-chain builders must maintain the same encoding convention as the validator expects.

### Owner Reference Input Dependency
Owner-sensitive paths do not attempt to infer ownership from the spent output itself. They require the separate reference input. This keeps the proof of ownership explicit and consistent across owner update and owner-required migration.

## Sequence Summary
The validator can be summarized as:

1. Load governance and successor-state context.
2. Prove the successor stays on an approved contract.
3. Apply the authority model for the chosen redeemer.

That summary is simple, but it captures the design intent accurately: shared loading rules first, actor-specific permissions second.
