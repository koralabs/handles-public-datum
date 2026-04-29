# Operational Flows

## Overview
This document explains how the validator is expected to be used in practice. The emphasis is not on user-interface steps, but on transaction assembly, required witnesses, and the exact shape of each authority path. Every flow assumes the transaction is spending a UTxO protected by the `public_datum` validator and producing a valid successor output for the same logical handle state.

## Common Preconditions
All three redeemer paths share a common baseline:

1. A transaction spends the existing public datum UTxO.
2. The transaction includes a continuation output that still carries the target handle's identifying asset.
3. The transaction includes the admin settings reference input containing the `pd_settings` handle.
4. The continuation output targets a validator hash listed in `AdminSettings.valid_contracts`.
5. The output datum is inline and decodes into `PublicDatum`.

If any of those assumptions fail, validation stops before the actor-specific rules can matter.

## Flow 1: dApp Update

### Intent
This path exists so a third-party application can maintain its own portion of the shared datum without receiving authority over the rest of the handle's public state.

### Actor
A signer whose public key hash is used as a datum-map key.

### Transaction Steps
1. Build a transaction that spends the current public datum UTxO.
2. Include the `DAPP_UPDATE` redeemer with the target handle bytes.
3. Include the admin settings reference input.
4. Produce a continuation output for the same handle.
5. Copy `settings` exactly from the spent datum to the output datum.
6. Update only those datum entries whose map key matches a transaction signer.

### Validator Interpretation
After `load_datum` resolves the settings reference input and continuation output, the validator compares the old datum and the new datum:

- `settings` must match exactly.
- For each key/value pair present in the output datum map, one of two conditions must hold:
  - the transaction is signed by the public key hash represented by that key, or
  - the value matches the prior datum's value for that key.

This effectively means a dApp can change only its own namespace and cannot mutate anyone else's state by omission or substitution.

### Typical Reasons for Failure
- The dApp tried to change `settings`.
- The continuation output was sent to an unapproved script.
- A key was modified without the corresponding signer.
- The settings reference input was omitted.

### Operational Notes
- The code treats keys as signer-derived bytes. Integrators must keep that convention stable.
- Because the validator iterates over the output datum map, a dApp must preserve all unrelated entries exactly.
- The repo docs should be updated if the meaning of datum keys changes, because that is core product behavior rather than an implementation detail.

## Flow 2: Owner Update

### Intent
This path gives the root handle owner a cleanup capability. It does not give the owner blanket rewrite powers over third-party data; it gives the owner the power to remove data while leaving any preserved values untouched.

### Actor
The signer whose public key hash matches the credential behind the root handle reference token.

### Transaction Steps
1. Spend the public datum UTxO.
2. Include the `OWNER_UPDATE` redeemer with the target handle bytes.
3. Include the admin settings reference input.
4. Include the owner handle reference input for the same root handle.
5. Sign the transaction with the root handle owner's key.
6. Produce a continuation output whose datum may omit selected entries from the original datum map.

### Validator Interpretation
The validator loads the continuation output and then checks every key/value pair present in the output datum map. For each surviving entry:

- the output value must equal the input value exactly.

This is an unusual but deliberate pattern. Instead of testing what was removed, the validator tests what remains. That lets the owner delete keys by omission, while rejecting any attempt to preserve a key with a modified value.

### Typical Reasons for Failure
- The owner reference token is missing from reference inputs.
- The transaction signer does not match the owner credential tied to that token.
- A surviving dApp entry has been modified instead of removed.
- The continuation output points at an unapproved validator hash.

### Operational Notes
- Owner update is best understood as "delete-only for third-party datum values."
- If maintainers ever intend the owner to edit some subset of values directly, that would be a product change and must be documented as such before code review.
- The validator does not use a separate tombstone or delete-list structure; deletion is implicit in the absence of a key from the successor datum map.

## Flow 3: Migration

### Intent
This path moves the public datum to another approved contract while preserving explicit governance controls. Migration is the highest-risk path because it changes the contract boundary itself.

### Actors
- An authorized admin signer.
- Optionally the root handle owner, depending on `migrate_sig_required`.

### Transaction Steps
1. Spend the current public datum UTxO.
2. Include the `MIGRATE` redeemer with the target handle bytes.
3. Include the admin settings reference input.
4. Include the owner handle reference input when the migration policy or builder requires owner participation.
5. Produce a continuation output on the destination validator.
6. Ensure the destination validator hash appears in `AdminSettings.valid_contracts`.
7. Sign the transaction with an approved admin signer and, when configured, with the root handle owner.

### Validator Interpretation
Migration shares the `load_datum` path with other flows, so contract-allowlist enforcement still happens before signer checks complete. The validator then applies `migration_signers_are_valid`, which requires:

- an admin signer that matches either the hardcoded emergency key or one of the configured `admin_creds`, and
- if `public_datum.settings.migrate_sig_required != 0`, a valid owner signature proven through the owner reference token.

### Typical Reasons for Failure
- No configured or hardcoded admin signer is present.
- The destination contract is not allowlisted.
- `migrate_sig_required` is enabled but the owner did not sign.
- The owner reference token is missing when owner signature validation is attempted.

### Operational Notes
- Migration is governed by both code and reference data; operators must treat both as part of the release surface.
- If a production incident ever involves unexpected migration behavior, the first question is whether the transaction was built against the expected settings datum and contract allowlist.
- Because the validator has a hardcoded admin fallback signer, audits and change reviews must explicitly check whether that key is still intended.

## Flow 4: Local Maintenance and Readiness Review

### Intent
This repo also supports a maintenance flow: engineers reviewing whether the repository is understandable, testable, and ready for change.

### Typical Steps
1. Read `README.md` and the docs indexes.
2. Inspect `contact.helios`, `contractUtils.js`, and the test files.
3. Confirm that docs match the current code, scripts, and verification commands.
4. Run `npm test` and `./test_coverage.sh`.
5. Record any remaining scope limits or sibling-repo dependencies instead of overstating what the local suite proves.

### Why This Matters
The repository is small enough that documentation quality is part of operational safety. If the docs do not explain the exact mutation and migration rules, reviewers can easily approve changes without understanding the governance model. If the docs do not explain the difference between local scenario coverage and broader ecosystem verification, reviewers can still misread a green local suite as a complete assurance signal.

## Release-Time Questions Operators Should Ask
- Which redeemer path is changing, if any?
- Does the change alter who can sign or what reference inputs are required?
- Does the change modify the meaning of datum keys or `settings`?
- Does the change rely on a new validator hash that must appear in `valid_contracts`?
- Do the docs still describe the current reality of tests and file layout?

## Incident-Triage Questions
- Was the settings reference input present and correct?
- Did the continuation output stay on an approved contract?
- Which actor path was intended: dApp, owner, or migration?
- Did the transaction include the necessary signer set for that path?
- Is the issue an on-chain rule failure or a repo/tooling drift problem?

Those questions are intentionally simple. This repository should make authority boundaries easy to audit even when the surrounding ecosystem is much larger.
