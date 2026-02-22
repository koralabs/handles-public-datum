# Feature Matrix

| Area | Capability | Module |
| --- | --- | --- |
| Validator core | Enforce public datum update permissions | `contact.helios` |
| DApp update rules | Signer-bound datum key updates | `Redeemer::DAPP_UPDATE` path |
| Owner update rules | Owner-signed pruning path | `Redeemer::OWNER_UPDATE` path |
| Migration rules | Admin + optional owner signature validation | `Redeemer::MIGRATE` path |
| Approved contract control | Restrict output credential hashes | `is_valid_contract` / `load_datum` |
| Utility guardrail | Coverage utility tests/report | `contractUtils.js`, `test_coverage.sh` |
