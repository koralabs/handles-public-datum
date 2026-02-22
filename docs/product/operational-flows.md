# Operational Flows

## DApp Update Flow
1. Provide `DAPP_UPDATE` redeemer with target handle bytes.
2. Load admin settings and destination public datum output.
3. Enforce unchanged user settings.
4. For each stored datum key/value:
  - signer may change its own key,
  - otherwise value must remain unchanged.

## Owner Update Flow
1. Provide `OWNER_UPDATE` redeemer with target handle.
2. Validate owner handle reference token and owner signature.
3. Enforce that remaining dApp values are unchanged.
4. Allow deletions/removals under owner-controlled update behavior.

## Migration Flow
1. Provide `MIGRATE` redeemer with target handle.
2. Validate destination output contract against admin settings.
3. Require admin signer.
4. Require owner signer when `migrate_sig_required != 0`.
