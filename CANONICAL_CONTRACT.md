# handles-public-datum canonical contract

I am the Helios spending validator (`contact.helios`, script name `public_datum`) that guards a Handle's public datum: a key/value map that dApps and the Handle owner may each edit only in the ways below.

1. **The updated datum stays at a valid contract.** Every update sends the Handle's reference token (label 001) to a validator in `valid_contracts` of the `pd_settings` handle (a reference input).
2. **A dApp can change only its own key.** In `DAPP_UPDATE`, each changed key must be signed by that key's public key hash, and user settings (`migrate_sig_required`) must not change.
3. **The owner cannot overwrite dApp data, only delete it.** In `OWNER_UPDATE`, every remaining key keeps its old value and the owner (holder of the label 222 token, proven by a reference input) signs.
4. **Migration needs an admin and, if the datum demands it, the owner.** `MIGRATE` requires a signer in `admin_creds` (or the hardcoded Kora admin key), and the owner too when `migrate_sig_required` is not 0.
5. **Hardcoded identities stay exact:** the Handle policy id, the label bytes, the `pd_settings` name and the Kora admin key hash.
6. **Any other redeemer fails.**
7. `DAPP_UPDATE` only iterates keys in the new datum; a dApp deleting another dApp's key is not asserted against.
