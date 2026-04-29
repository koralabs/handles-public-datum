# Datum and Redeemer Model

## Purpose of the Model
The validator's behavior is compact because almost everything is expressed through the shapes of a few datums and the redeemer. This document expands those shapes into their operational meaning so reviewers do not have to infer protocol semantics directly from the source.

## Core Types

### `AdminSettings`
Fields:

- `valid_contracts: []ByteArray`
- `admin_creds: []ByteArray`

Interpretation:

- `valid_contracts` is an allowlist of validator hashes encoded as byte arrays.
- `admin_creds` is a list of public key hashes encoded as byte arrays.

Operational meaning:

- if the continuation output points to a validator whose hash is absent from `valid_contracts`, the transaction fails;
- if a migration transaction has no signatory matching either the hardcoded admin hash or a value in `admin_creds`, the transaction fails.

### `DatumSettings`
Fields:

- `migrate_sig_required: Int`

Interpretation:

- `0` means owner co-signing is not required for migration;
- any non-zero value means owner co-signing is required.

The field is deliberately simple, but it changes the authority model of the migration path and should therefore be treated as governance data, not user-editable dApp state.

### `PublicDatum`
Fields:

- `datum: Map[ByteArray]Data`
- `settings: DatumSettings`

Interpretation:

- `datum` is the extensible map that dApps and owners interact with.
- `settings` is the governance-sensitive block that affects how migration is authorized.

The validator explicitly prevents dApps from changing `settings`, which is an important clue that the `datum` map and the `settings` block serve different audiences.

### `Redeemer`
Constructors:

- `DAPP_UPDATE { handle: ByteArray }`
- `OWNER_UPDATE { handle: ByteArray }`
- `MIGRATE { handle: ByteArray }`

Interpretation:

- the handle bytes act as a lookup key for associated assets in the transaction context;
- the constructor chooses which authority model applies.

## Transaction Context Objects the Model Assumes

### Settings Reference Input
The validator expects a reference input that carries one unit of the `pd_settings` asset. Its inline datum must decode into `AdminSettings`.

### Owner Reference Input
Owner-sensitive flows expect a reference input that carries one unit of the owner handle asset `LBL_222 + handle`. The output address on that input is used to derive the owner credential that must have signed the transaction.

### Continuation Output
The validator expects a continuation output that holds the target public datum asset and an inline datum that decodes into `PublicDatum`. The current source searches for that output using `LBL_001 + handle`, which is notable because `LBL_001` is not declared in the file.

## Datum Map Semantics

### Key Ownership Convention
In the dApp update path, the validator interprets each datum-map key as a public key hash and calls `ctx.tx.is_signed_by(PubKeyHash::new(key))`. That implies a strong convention:

- keys are not arbitrary labels,
- keys are signer identities expressed as bytes.

If a future design ever wanted human-readable namespaces or compound keys, that would require a code change and a documentation update because the current validator treats keys as signature subjects.

### Value Semantics
Values are typed as generic `Data`, so the validator does not interpret their internal structure. It only enforces whether a value may change. This keeps the contract flexible:

- the validator enforces who may mutate a value,
- consuming applications decide what the value means.

### Deletion Semantics
Deletion is implicit. In `OWNER_UPDATE`, the validator checks only the keys present in the output datum map. If a key from the input datum is absent from the output datum, that is treated as a deletion and is allowed. If a key remains present, its value must match exactly.

## Redeemer Path Semantics

### `DAPP_UPDATE`
Expected use:

- a dApp modifies only its own entry or entries.

Model invariants:

- output `settings` must match input `settings`,
- every changed key must be signed by the corresponding public key hash,
- unchanged third-party values may remain in place without their signatures.

Model consequence:

- the datum map behaves like a collection of signer-owned cells.

### `OWNER_UPDATE`
Expected use:

- a root handle owner removes stale or unwanted third-party entries.

Model invariants:

- a valid owner reference input must be present,
- the root owner must sign,
- every key that survives into the output must preserve its prior value.

Model consequence:

- the owner can clean, but not forge.

### `MIGRATE`
Expected use:

- a governance-approved move of the public datum to another approved validator.

Model invariants:

- the continuation output must target an allowlisted validator,
- an admin must sign,
- the owner must also sign when `migrate_sig_required` is enabled.

Model consequence:

- migration changes location, not trustlessness.

## Encoded Authority Relationships
The model encodes a layered authority system:

- dApp authority is per key,
- owner authority is over presence or absence of third-party entries,
- admin authority is over migration approval,
- settings authority comes indirectly from whoever controls the settings reference datum outside this repo.

These are distinct by design. Any future attempt to merge them should be treated as a major protocol change.

## Edge Cases Reviewers Should Think About

### Empty Signatory Set
`admin_has_signed_tx` asserts that at least one signatory exists. That makes migration with no signers impossible even before admin-credential comparison.

### Output Contract Credential Type
`load_datum` expects the continuation output credential to be a validator credential and errors otherwise. That means a migration or continuation to a pubkey address is invalid even if the hash bytes somehow appear in `valid_contracts`.

### Missing Reference Inputs
The validator fails early and explicitly when required reference inputs are absent. There is no fallback path that weakens governance in the absence of context.

### Missing Constant / File Drift
The current repo state leaves open questions about compilation and scenario-harness completeness. Those are implementation concerns rather than datum-model concerns, but they matter when evaluating whether the model is fully verified in practice.

## Practical Example
Conceptually, a public datum might look like this:

- `datum`
  - `<dapp signer A pkh>` => some application payload
  - `<dapp signer B pkh>` => another payload
- `settings`
  - `migrate_sig_required = 1`

In that state:

- signer A can update signer A's payload but not signer B's payload;
- the owner can remove signer B's payload entirely but cannot replace it with a new value;
- migration requires both an approved admin and the owner.

That example is more useful than the raw type definitions because it shows how the model turns generic bytes and `Data` values into protocol behavior.
