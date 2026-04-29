# Feature Matrix

## Capability Matrix

| Area | Capability | Primary Actor | Trigger | Core Constraint | Observable Outcome |
| --- | --- | --- | --- | --- | --- |
| Shared datum protection | Namespace-style datum updates | dApp signer | `DAPP_UPDATE` redeemer | Only signer-owned keys may change; settings must remain identical | Updated output datum preserves unrelated values |
| Owner governance | Prune obsolete dApp data | Root handle owner | `OWNER_UPDATE` redeemer | Owner signature required; preserved values cannot be rewritten | Entries may be removed, but surviving dApp values must match prior state |
| Migration governance | Move datum to another approved contract | Protocol admin, optionally root owner | `MIGRATE` redeemer | Destination hash must be allowlisted; admin signature always required | Output datum continues on an approved validator |
| Contract allowlist | Restrict valid destinations | Admin settings maintainer | Settings reference datum update outside this repo | Output credential hash must match `valid_contracts` | Continuation or migration to unapproved contracts is rejected |
| Admin authorization | Allow emergency or configured admin approval | Protocol admin | Migration transaction | Signer must match hardcoded admin key or an entry in `admin_creds` | Migration fails fast when admin signer set is wrong |
| Owner authentication | Bind owner-only actions to root handle control | Root handle owner | Owner update or migration with owner-signature requirement | Owner reference token must exist in reference inputs and signer must match owner credential | Unauthorized cleanup or migration is rejected |
| Local utility support | Normalize paths and detect validator source for tooling | Maintainer | Local scripts/tests | Utility output must match the file layout and source contents | Repo tooling can load source and measure helper coverage |
| Documentation readiness | Keep product/spec docs aligned with code truth | Maintainer/reviewer | Any repo change or readiness audit | Docs must include current behavior and known gaps | Reviewers can assess readiness without reverse engineering the repo |

## Authority Boundaries by Actor

### dApp Integrator
- Can mutate only datum values keyed to its signer.
- Cannot edit `settings`.
- Cannot reroute the datum to an arbitrary script.
- Cannot remove the requirement for approved contract destinations.

### Root Handle Owner
- Can authorize the owner update path.
- Can remove entries from the datum map by producing a new map that omits them.
- Cannot alter the value of a surviving third-party datum entry.
- May be required to co-sign migration depending on `migrate_sig_required`.

### Protocol Administrator
- Can authorize migration.
- Can manage which contract hashes are valid destinations through the reference settings datum.
- Shares migration authority with the root owner when configured.
- Does not gain a blanket exemption from output-contract validation.

## Inputs and Dependencies

| Input | Source | Used By | Why It Matters |
| --- | --- | --- | --- |
| Spending datum | Current UTxO under validation | All redeemer paths | Represents the pre-state used for mutation checks |
| Redeemer handle bytes | Transaction redeemer | All redeemer paths | Identifies the target handle and the expected associated assets |
| Settings handle reference input | Reference input containing `pd_settings` asset | `load_datum`, `MIGRATE` | Supplies valid contract hashes and admin credentials |
| Owner handle reference input | Reference input containing the owner's handle asset | `OWNER_UPDATE`, conditional `MIGRATE` | Anchors owner signature validation to the root handle |
| Transaction signatories | Script context | All authority checks | Proves actor identity for dApp, owner, and admin operations |
| Continuation output | Transaction outputs | All paths through `load_datum` | Supplies the candidate next-state datum and destination address |

## Failure Modes the Product Intentionally Surfaces

| Failure Message | Typical Cause | Product Interpretation |
| --- | --- | --- |
| `AdminSettings reference input missing` | Transaction builder omitted the settings reference UTxO | Governance context is unavailable, so the transaction must fail |
| `Public datum output missing` | No valid continuation output located for the target handle | The spend would destroy or misroute state instead of updating it |
| `Contract not found in valid contracts list` | Output validator hash is not approved | The transaction tries to continue or migrate outside the allowlist |
| `Required admin signer(s) not present` | Migration lacks the hardcoded admin signer and all configured admin creds | Admin-only action attempted without governance approval |
| `Missing root handle owner signature` | Owner path or owner-required migration not signed by the root owner | Owner authority could not be proven from reference-token ownership |
| `DApps can't change user settings` | `settings` changed in a dApp update | dApp attempted to reach beyond its namespace |
| `You can only change your datum` | Unsigned key mutation detected during `DAPP_UPDATE` | dApp attempted to modify another signer's record |
| `You cannot change DApp datum. Only delete.` | Owner path preserved a key but altered its value | Owner cleanup attempted to become value forgery |
| `Not a valid migration` | Combined admin/owner migration signer requirements not met | Migration policy was violated |

## Operational Characteristics

### Deterministic Policy Surface
The validator is intentionally compact. The product favors explicit assertion failures and narrow authority checks over broad flexibility. This reduces ambiguity in audits and in transaction-builder troubleshooting.

### Shared-State Model
The product assumes a shared map keyed by signer identity. That is a deliberate compromise between composability and isolation:

- composability, because many dApps can publish data under one handle;
- isolation, because each signer controls only its own keys.

### Governance Through Reference Data
The allowlist of valid continuation contracts and the set of accepted admin credentials live in a reference datum instead of being fully hardcoded. That means migration governance can evolve without rewriting every rule in the validator, but it also means transaction builders must supply the correct reference input every time.

## What This Repo Does Not Provide
- No off-chain SDK for assembling valid transactions.
- No eventing, webhook, or API documentation for public datum consumers.
- No full ecosystem end-to-end verification across sibling repos from this repo alone.
- No Node-native branch coverage metric for the Helios validator itself.

## Documentation Readiness Checklist
- Product docs describe actor rights and restrictions.
- Product docs identify the high-risk failure modes.
- Product docs explain operational dependencies like settings reference inputs.
- Spec docs cover actual source files and current verification scope.
- Index files link every product and spec document.
