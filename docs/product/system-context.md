# System Context

## Role in the Handles Ecosystem
`handles-public-datum` sits in the middle of a broader Handles protocol landscape. It is not the canonical owner record for a handle, and it is not the consumer-facing API. Instead, it acts as a controlled storage governor for public datum associated with a handle. The handle asset itself, the admin settings datum, off-chain transaction builders, and downstream consumers all depend on this validator to preserve an important invariant: shared public state may evolve, but only within clearly defined authority boundaries.

The system context is easiest to understand as a set of adjoining trust domains:

- root ownership of the handle asset,
- protocol governance of which contracts and admin signers are valid,
- application-specific publication of datum under signer-owned keys,
- downstream readers that interpret public datum but do not enforce its mutation rules themselves.

This repository occupies the enforcement point where those domains meet.

## Upstream Dependencies

### Handle Policy and Asset Labels
The validator uses a fixed `HANDLE_POLICY` constant and specific asset-name label conventions to discover both the settings handle and the owner handle in transaction context. The exact bytes matter, because they determine which reference inputs are considered authoritative.

### Admin Settings Datum
The validator depends on a reference input containing `pd_settings`. That datum is the source of truth for:

- which validator hashes are valid destinations,
- which admin public key hashes may authorize migration.

Without that reference datum, the validator refuses to continue. This is a governance dependency, not an optional optimization.

### Root Handle Reference Input
Owner-based operations depend on a separate reference input that proves ownership of the root handle associated with the redeemer's `handle` bytes. The validator derives the owner credential from that input and compares it to transaction signatories.

### Transaction Builder Discipline
The validator code assumes off-chain builders know how to:

- preserve data they are not authorized to modify,
- build a valid continuation output,
- attach all required reference inputs,
- provide inline datums in the expected shape.

If a builder fails any of those responsibilities, the validator fails closed.

## Downstream Consumers

### dApps
dApps are the most obvious downstream consumers because they both read and write public datum. Their contract with this validator is strict:

- they can publish within their own keyspace,
- they cannot unilaterally alter shared settings,
- they cannot rewrite another signer's value.

### Public API and Read Models
API services and indexers may read the resulting datum and expose it externally, but they do not get to soften validator semantics. If a value exists on chain because this validator allowed it, read services can trust that the relevant authority checks were satisfied.

### Governance and Migration Tooling
Administrative tools that handle migration or contract upgrades rely on this validator to prevent accidental or unauthorized movement to unknown scripts. The allowlist in `AdminSettings.valid_contracts` is therefore part of release governance.

## Data Lifecycle

### Creation and Continuation
This repo snapshot mostly exposes continuation logic rather than creation logic. The validator cares about a spend of an existing public datum UTxO and the shape of the successor output. That means most state transitions are understood as "read prior datum, build new datum, prove authority, continue on approved script."

### Mutation
Mutation is actor-scoped:

- dApps may update only values they own,
- owners may delete but not rewrite surviving third-party values,
- admins may approve migration but do not bypass contract destination checks.

### Migration
Migration is the only path where the product explicitly expects a change in validator destination. Because it changes trust boundaries, the code evaluates both destination allowlisting and signer requirements.

### Deletion
There is no standalone "delete datum" action in the current validator source. Owner-driven cleanup is represented by omission of keys from the successor datum map.

## Trust Model

### What the Validator Trusts
- The on-chain script context supplied by the ledger.
- The data contained in the reference inputs it explicitly locates.
- The public key hashes in transaction signatories.

### What the Validator Does Not Trust
- Off-chain builders to behave correctly without enforcement.
- dApps to leave other applications' values unchanged by convention.
- owners to preserve third-party data correctly without validation.
- migration builders to choose safe destinations on their own.

### Hardcoded Governance Exception
The code includes a hardcoded admin public key hash in addition to configurable `admin_creds`. That creates a layered trust model:

- normal admin authority may be data driven,
- one emergency or legacy admin path remains embedded in source.

That is an important system fact because it influences how governance changes are reviewed.

## System Boundaries

### Inside This Repo
- The validator source and its invariants.
- Minimal local helper utilities.
- Minimal local test and coverage scaffolding.
- Repo-specific product/spec docs.

### Outside This Repo
- The process that authors the admin settings datum.
- The process that builds and submits transactions on behalf of dApps or owners.
- The public API and any indexing pipeline.
- Wallet UX and user-facing error presentation.
- Deployment packaging or publication of artifacts to other environments.

## Operational Risks in Context

### Reference Input Drift
If the wrong settings datum is supplied, migration semantics change immediately. That is why the docs treat reference-data correctness as part of runtime safety rather than a background concern.

### Contract Allowlist Drift
An incorrect or stale `valid_contracts` list can block intended migrations or, worse, approve an unintended destination. The validator enforces the list strictly but does not decide whether the list itself is correct.

### File and Test Drift
The repository now has aligned local scripts and repo-native validator scenarios, but its confidence still depends on how reviewers interpret that local suite. The system-context risk is no longer broken filenames; it is forgetting that production transaction builders live elsewhere in the ecosystem.

### Shared-State Semantics
Any shared map invites ambiguity unless documentation is explicit about ownership rules. Here the key insight is that "shared" does not mean "collectively editable." The map is shared storage with signer-scoped mutation.

## Why Documentation Matters for This Repo
In a large service, docs can lag behind because runtime inspection and logging fill some of the gap. In a small on-chain repo, there is much less redundancy:

- the source is compact, so a missing sentence can hide a major governance assumption,
- local tests may not cover all real transaction paths,
- reviewers may only see the validator during occasional maintenance work.

That makes documentation a real part of the control surface. Good docs here reduce protocol risk by making actor boundaries legible before anyone edits code.
