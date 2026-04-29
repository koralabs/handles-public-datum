# Handles Public Datum PRD

## Summary
`handles-public-datum` is the repository for the on-chain validator that governs updates to a handle's public datum. Its job is narrow and high impact: it decides who may mutate public datum fields, when an owner may prune third-party data, and how a public datum may be migrated to another approved validator. In the Handles ecosystem, this validator acts as a permissions boundary between three parties that do not have identical rights:

- dApps that write application-specific records under their own signer identity,
- the root handle owner who retains control over the handle as an asset,
- protocol administrators who govern migration policy and the allowlist of valid destination contracts.

The product is therefore not an end-user application. It is a policy engine expressed as Helios source, supported by a minimal JavaScript utility layer and a thin local test harness. Documentation for this repository must explain the business intent behind the rules, because the code alone is concise enough that important governance assumptions can be easy to miss.

## Problem Statement
Public datum is shared state. Multiple actors need to interact with it, but unrestricted shared state is unsafe in the Handles protocol:

- A dApp must not be able to overwrite another dApp's data.
- A dApp must not be able to alter the owner's settings block.
- A handle owner must not be able to forge another dApp's current value while pretending to perform cleanup.
- A migration must not let the datum escape to an arbitrary validator hash.
- Administrative controls must be explicit enough that operators can rotate approved contracts without silently changing transaction semantics.

Without those guardrails, public datum becomes a source of counterfeit state, silent data loss, or unauthorized migration. The validator exists to make those failure modes impossible at the spending-script boundary rather than relying on off-chain convention.

## Product Scope
This repository covers the following product surface:

- The Helios spending validator in [contact.helios](../../contact.helios).
- Local helper utilities in [contractUtils.js](../../contractUtils.js) that normalize contract paths and identify validator entrypoints for tooling.
- Local verification harness files in [tests/contractUtils.test.js](../../tests/contractUtils.test.js), [tests/fixtures.ts](../../tests/fixtures.ts), and [tests/tests.ts](../../tests/tests.ts).
- Documentation that describes intended behavior, known gaps, and operational expectations for maintainers.

The repository does not include consumer-facing UI, the public API, or generalized minting logic. It is a protocol enforcement component.

## Stakeholders and Primary Users

### Protocol Maintainers
They own the validator source, review migration policy, and decide when approved destination contracts or admin credentials change. Their main need is confidence that any change preserves the Handles ownership model.

### dApp Integrators
They use public datum as a shared storage surface, but only under a signer-bound namespace. Their main need is a stable rule set for what they can write and what they must leave untouched.

### Handle Owners
They are the ultimate controller of the root handle asset and need the ability to authorize owner-only operations such as pruning obsolete dApp records or signing a migration when policy requires it.

### Release and Support Operators
They need enough repository context to answer questions like "what transaction shape is expected?", "why would this redeemer fail?", and "which current repo gaps are documentation issues versus code issues?"

## Product Model
The validator operates on a `PublicDatum` object with two logical regions:

- `datum`: a map of application-controlled key/value pairs.
- `settings`: a small policy block that currently contains `migrate_sig_required`.

It also consumes an admin-controlled reference datum:

- `AdminSettings.valid_contracts`: validator hashes that are legal migration or continuation destinations.
- `AdminSettings.admin_creds`: additional admin public key hashes that satisfy migration authorization.

The validator is driven by a three-path redeemer model:

- `DAPP_UPDATE`
- `OWNER_UPDATE`
- `MIGRATE`

The product promise is that each path preserves a different authority boundary without weakening the others.

## Goals

### Goal 1: Signer-Bound dApp Mutation
The validator must let a dApp update only the datum entries keyed to its signer. This lets multiple dApps coexist in one public datum map without requiring trust between them.

### Goal 2: Owner-Controlled Cleanup Without Rewriting dApp State
The handle owner must be able to remove obsolete third-party entries, but not impersonate a dApp by rewriting the value the dApp previously stored.

### Goal 3: Controlled Migration
Migration must require explicit administrative approval and, when configured, explicit root-owner approval. Destination validator hashes must come from the admin reference settings rather than from transaction builder discretion.

### Goal 4: Documentation Truthfulness
Because this repo is used as infrastructure, the docs must describe the current code truthfully, including known verification gaps. Readiness is not satisfied by aspirational prose that hides stale scripts or unresolved source drift.

## Non-Goals

- Rendering public profiles or any UI driven by public datum.
- Defining off-chain transaction builders for every consuming service.
- Handling minting, pricing, or discount rules for unrelated handle assets.
- Serving as a complete ecosystem overview for all Handles contracts.
- Hiding repository drift behind ambiguous language.

## Functional Requirements

### DApp Update Requirements
- The redeemer must identify the target handle.
- The validator must load the current output datum and compare it against the spending datum.
- The user settings block must remain unchanged.
- For each datum key present in the new output, the key owner must have signed the transaction or the value must match the prior value exactly.
- The resulting output must remain on an approved contract hash.

### Owner Update Requirements
- The redeemer must identify the target handle.
- The validator must verify the owner handle reference token in reference inputs.
- The validator must require the root handle owner's signature.
- The validator must permit removal of dApp keys.
- The validator must reject mutation of any preserved dApp value.
- The resulting output must remain on an approved contract hash.

### Migration Requirements
- The redeemer must identify the target handle.
- The validator must load admin settings from the special settings handle reference input.
- The validator must require an admin signature from either the hardcoded emergency key or a credential in `admin_creds`.
- The validator must additionally require the root handle owner signature when `migrate_sig_required != 0`.
- The destination output must be sent to a validator whose hash appears in `valid_contracts`.

## Security and Integrity Requirements
- The validator must never treat unsigned third-party mutation as valid.
- The validator must never allow a missing settings reference input to degrade into a permissive path.
- The validator must never allow owner cleanup to become owner impersonation of a dApp.
- Migration authorization must be explicit and data driven.
- Documentation must call out any hardcoded or exceptional signer behavior so reviews do not miss it.

## Operator Expectations
Maintainers and operators should assume the following when working with this repository:

- A change here is protocol behavior, not presentation behavior.
- Failure messages in the validator are product-facing diagnostics for transaction builders and auditors.
- The repository's JavaScript test coverage represents tooling support, not full validator execution coverage.
- Some test and source references are currently stale; those gaps must be tracked, not papered over.

## Success Criteria
The repository is product-ready when all of the following are true:

- Product docs explain the authority model, actor boundaries, and intended transaction flows.
- Spec docs explain exactly how the validator enforces those flows.
- `docs/index.md`, `docs/product/index.md`, and `docs/spec/index.md` link the full doc set.
- Documentation across `docs/product` and `docs/spec` exceeds the readiness threshold with code-grounded content.
- Known gaps are documented explicitly enough that a reviewer can distinguish documentation completeness from implementation completeness.

## Current-State Caveats
At the time of this documentation update, the repo shows signs of drift that matter to anyone assessing readiness:

- `contact.helios` references `LBL_001` while the file only declares `LBL_002` and `LBL_222`.
- `package.json` points `test:old` at `tests/tests.js`, but the tracked file is `tests/tests.ts`.
- `package.json` points `test:new` at `tests/txTests.ts`, which is not present in the repository.
- `tests/tests.ts` references `minting.helios` and `editing.helios`, which are also not present in this repo snapshot.

Those facts do not change the product intent, but they do affect the current verification story. The spec docs include them so engineers can reason about readiness accurately.
