# Datum and Redeemer Model

## Types

### `AdminSettings`
- `valid_contracts: []ByteArray`
- `admin_creds: []ByteArray`

### `DatumSettings`
- `migrate_sig_required: Int`

### `PublicDatum`
- `datum: Map[ByteArray]Data`
- `settings: DatumSettings`

### `Redeemer`
- `DAPP_UPDATE { handle: ByteArray }`
- `OWNER_UPDATE { handle: ByteArray }`
- `MIGRATE { handle: ByteArray }`

## Reference Assets and Constants
- Handle policy ID is fixed in validator constants.
- Settings handle asset class:
  - `LBL_222 + "pd_settings"`.
- Validator checks owner token in reference inputs using:
  - `LBL_222 + handle`.

## Validation Invariants
- Admin settings reference input must be present.
- Public datum output must be present.
- Output credential must map to approved contract hash list.
- Owner update and migration must satisfy signature requirements based on redeemer path and datum settings.
