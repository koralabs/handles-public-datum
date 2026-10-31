# handles-public-datum canonical contract

## Purpose and authority

I am the Helios spending validator (`contact.helios`, script name `public_datum`) that guards the public datum of a Handle: a key/value map that dApps and the Handle owner may each edit, only in the ways below. The chain is the authority. My tests read the source text and run offline fixtures; they do not prove what is deployed. I grant no authority to sign, deploy, change settings or burn.

## Invariants (must never be violated)

1. **Updated datum stays at a valid contract.** Every update must send the Handle's reference token (label 001) to a validator listed in `valid_contracts` of the `pd_settings` settings handle (read as a reference input). Otherwise fail.
2. **A dApp can change only its own key.** In `DAPP_UPDATE`, each key whose value changed must be signed by that key's public key hash; user settings (`migrate_sig_required`) must not change.
3. **The owner cannot overwrite dApp data, only delete it.** In `OWNER_UPDATE`, every remaining key must keep its old value, and the owner (holder of the label 222 token, proven by a reference input) must sign.
4. **Migration needs an admin and, if the datum demands it, the owner.** `MIGRATE` requires a signer in `admin_creds` (or the hardcoded Kora admin key) and, when `migrate_sig_required` is not 0, the owner's signature too.
5. **Hardcoded identities stay exact:** the Handle policy id, the label bytes, the `pd_settings` name and the Kora admin key hash. Changing any of them moves who is trusted and needs operator approval.
6. **Any other redeemer fails.**

Tested today: `tests/contactSource.test.js` checks the source still contains the guard fragments (with negative controls); `tests/tests.ts` runs fixtures through the Helios tester. Honestly: invariants 2 to 4 are checked by source-fragment tests, not by running the validator on adversarial transactions here.

## Boundaries and known limits

- `DAPP_UPDATE` only iterates keys in the new datum; a dApp deleting another dApp's key is not caught by an assertion in the source. Do not claim it is.
- `contractUtils.js`, tests, docs and `package.json` are ordinary review; they are not the script.
- Compiler version (`@koralabs/helios` in `package.json`) changes the script hash; treat bumps as contract changes.

## Refactors needed to enforce this

- Replace source-fragment tests with transaction-level tests that run the compiled script on adversarial inputs for each invariant.
- Decide and test the intended behavior for key deletion by a dApp.
- Record the deployed script hash per network and test the build matches it.
