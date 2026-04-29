# Risks and Operations

## Why an Operations Document Exists for a Small Repo
This repository is small, but the validator it contains mediates authority over shared on-chain state. In practice, that means operational mistakes are more likely to come from misunderstanding than from code volume. This document captures the main risks maintainers and reviewers should think about before changing the validator, updating related settings, or interpreting local verification output.

## Primary Risk Categories

### Unauthorized State Mutation
The highest-risk failure is allowing one actor to mutate state owned by another actor. The current validator counters this in two different ways:

- dApps must sign for keys they change,
- owners may only delete third-party entries, not rewrite them.

Any future change that weakens either rule should be treated as a product-level change requiring close review.

### Unsafe Migration
Migration changes the validator destination, so it carries upgrade and governance risk. The code requires:

- an allowlisted destination contract,
- an approved admin signer,
- the owner signer when `migrate_sig_required` is enabled.

Operationally, that means migration reviews must inspect both the transaction intent and the settings datum that supplies `valid_contracts` and `admin_creds`.

### Hidden Governance Paths
The presence of a hardcoded admin public key hash means there is a governance path that does not depend solely on reference data. That may be intentional, but it must never be forgotten during audits or incident review. Documentation is the easiest place to keep that fact visible.

### Verification-Scope Drift
The highest remaining maintainability risk is not broken local entrypoints anymore; it is assuming the repaired local suite covers more than it does. The repository now has aligned contract scenarios and helper coverage, but maintainers can still overestimate confidence if they ignore what remains outside scope:

- Node coverage still measures the JavaScript helper layer rather than Helios branch percentages.
- Scenario tests are representative transaction cases, not a full combinatorial matrix.
- Sibling repos still own many off-chain transaction-construction details.

Those are maintainability risks because they can turn a passing local suite into false confidence if reviewers stop asking what was actually exercised.

## Operational Review Checklist

### Before Editing Code
- Read the product and spec indexes.
- Identify which actor boundary the change touches: dApp, owner, admin, or destination allowlist.
- Confirm whether the change depends on reference datum semantics.
- Check whether the same change would require updates in sibling repos that construct transactions.

### Before Approving a Review
- Verify the docs still describe the current behavior.
- Confirm failure messages remain meaningful.
- Check whether a signer requirement changed.
- Check whether destination-contract validation changed.
- Note whether the verification story improved, stayed flat, or regressed.

### Before Declaring Readiness
- Confirm `docs/product` and `docs/spec` tell a coherent story.
- Confirm the indexes link all major docs.
- Confirm any unresolved verification-scope limits are written down plainly.
- Avoid using passing helper tests or a small scenario matrix as a proxy for full ecosystem verification.

## Failure Analysis Guide

### If a dApp Update Fails
Ask:

- Was `settings` preserved exactly?
- Did the transaction include the settings reference input?
- Was the continuation output still on an approved validator?
- Did every changed key correspond to a signer?

The most common conceptual mistake is treating public datum as if it were a free-form shared map. It is a shared map with signer ownership.

### If an Owner Update Fails
Ask:

- Was the correct owner reference token included?
- Did the root owner sign?
- Did the output preserve any key with a different value instead of removing it?

The most common conceptual mistake is assuming owner authority implies rewrite authority. In the current design it does not.

### If a Migration Fails
Ask:

- Was the destination validator hash allowlisted?
- Did an approved admin signer participate?
- Was owner co-signing required by `migrate_sig_required`?
- Did the transaction include the reference inputs needed to prove both admin and owner context?

The most common conceptual mistake is debugging migration as if it were only a signer issue. Destination allowlisting is equally important.

## Documentation Maintenance Expectations
The repo-level AGENTS guidance says PRD documents product requirements and spec documents implementation details. For this repository, maintaining that split matters because:

- product docs should explain who is allowed to do what and why,
- spec docs should explain how the source and test files implement that intent and where verification still stops.

Whenever code changes affect actor permissions, reference input assumptions, test behavior, or file layout, the docs should be updated in the same change.

## Recommended Future Hardening Work
This task finished the stale-file and stale-script cleanup, but a realistic backlog still remains:

- expand the scenario matrix to cover more datum shapes and allowlist edge cases,
- reduce or intentionally document the conservative collateral warnings emitted by the local harness,
- add CI or a shared workflow gate so the scenario harness runs automatically instead of only on demand,
- connect this repo's verification story more explicitly to sibling repos that build production transactions.

These are not blockers for documentation readiness, but documenting them helps reviewers separate "the repo is now internally consistent" from "the repo has no remaining engineering debt."
