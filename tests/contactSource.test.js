import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../contact.helios", import.meta.url), "utf8");

const normalizeSource = (value) => value.trim().replace(/\s+/g, " ");

const expectContractInvariants = (sourceText, { feature, failureMode, fragments }) => {
  const normalizedSource = normalizeSource(sourceText);

  for (const fragment of fragments) {
    assert.ok(
      normalizedSource.includes(normalizeSource(fragment)),
      `${feature}: ${failureMode}\nMissing source fragment: ${fragment}`,
    );
  }
};

const expectMutationToFail = ({ feature, failureMode, fragment, mutation }) => {
  assert.throws(
    () => expectContractInvariants(mutation(source), { feature, failureMode, fragments: [fragment] }),
    { name: "AssertionError" },
    `${feature}: negative control should fail when the guarded source is removed`,
  );
};

test("redeemer schema exposes every public datum update path with handle targets", () => {
  const invariant = {
    feature: "Public datum updates expose dApp, owner, and migration entrypoints keyed by handle",
    failureMode: "A renamed or untyped redeemer would strand callers that submit the documented update actions",
    fragments: [
      `DAPP_UPDATE {
        handle: ByteArray
    }`,
      `OWNER_UPDATE {
        handle: ByteArray
    }`,
      `MIGRATE {
        handle: ByteArray
    }`,
    ],
  };

  expectContractInvariants(source, invariant);
  expectMutationToFail({
    ...invariant,
    fragment: invariant.fragments[0],
    mutation: (text) => text.replace("DAPP_UPDATE {", "DAPP_UPDATE_REMOVED {"),
  });
});

test("load_datum requires settings, public datum output, and approved destination contract", () => {
  const invariant = {
    feature: "Every update path reloads admin settings and the returned public datum output",
    failureMode: "A missing reference, missing output, or unapproved destination contract could bypass validator controls",
    fragments: [
      `admin_settings_opt: Option[TxInput] = ctx.tx.ref_inputs.find_safe`,
      `public_datum_opt: Option[TxOutput] = ctx.tx.outputs.find_safe`,
      `assert(admin_settings_opt != Option[TxInput]::None, "AdminSettings reference input missing")`,
      `assert(public_datum_opt != Option[TxOutput]::None, "Public datum output missing")`,
      `assert(is_valid_contract(public_datum_output.address.credential.switch`,
      `"Public datum not returned to valid contract"`,
    ],
  };

  expectContractInvariants(source, invariant);
  expectMutationToFail({
    ...invariant,
    fragment: invariant.fragments[2],
    mutation: (text) => text.replace("AdminSettings reference input missing", "settings missing"),
  });
});

test("dapp updates preserve user settings and only change signer-owned datum keys", () => {
  const invariant = {
    feature: "DApp updates may write only values controlled by the signing key and cannot change user settings",
    failureMode: "A dApp update could modify user settings or another signer key's datum",
    fragments: [
      `(_, public_datum: PublicDatum, loaded: Bool) = load_datum(dapp.handle, ctx)`,
      `assert(datum.settings == public_datum.settings, "DApps can't change user settings")`,
      `assert(ctx.tx.is_signed_by(PubKeyHash::new(key)) || datum.datum.get(key) == val, "You can only change your datum")`,
    ],
  };

  expectContractInvariants(source, invariant);
  expectMutationToFail({
    ...invariant,
    fragment: invariant.fragments[1],
    mutation: (text) => text.replace("DApps can't change user settings", "settings changed"),
  });
});

test("owner updates can prune dapp datum only with the root owner signature", () => {
  const invariant = {
    feature: "Owner updates may delete dApp datum entries only after the root handle owner signs",
    failureMode: "An owner update could edit dApp values or skip owner authorization",
    fragments: [
      `(_, public_datum: PublicDatum, loaded: Bool) = load_datum(o.handle, ctx)`,
      `assert(datum.datum.get(key) == val, "You cannot change DApp datum. Only delete.")`,
      `loaded && owner_has_signed_tx(o.handle, ctx)`,
      `assert(ctx.tx.signatories.find_safe((pubkey: PubKeyHash) -> {`,
      `"Missing root handle owner signature"`,
    ],
  };

  expectContractInvariants(source, invariant);
  expectMutationToFail({
    ...invariant,
    fragment: invariant.fragments[2],
    mutation: (text) => text.replace("loaded && owner_has_signed_tx(o.handle, ctx)", "loaded"),
  });
});

test("migrations require an admin signer and optional owner signer when settings demand it", () => {
  const invariant = {
    feature: "Migrations require admin authorization and preserve the configured owner-signature requirement",
    failureMode: "A migration could run without an admin or ignore the datum's owner-signature setting",
    fragments: [
      `(admin_settings: AdminSettings, public_datum: PublicDatum, _) = load_datum(m.handle, ctx)`,
      `admin_has_signed_tx(settings, ctx) && (public_datum.settings.migrate_sig_required == 0 || owner_has_signed_tx(handle, ctx))`,
      `assert(migration_signers_are_valid(m.handle, ctx, admin_settings, public_datum), "Not a valid migration")`,
      `signer == PubKeyHash::new(#4da965a049dfd15ed1ee19fba6e2974a0b79fc416dd1796a1f97f5e1)`,
    ],
  };

  expectContractInvariants(source, invariant);
  expectMutationToFail({
    ...invariant,
    fragment: invariant.fragments[1],
    mutation: (text) => text.replace("public_datum.settings.migrate_sig_required == 0", "public_datum.settings.migrate_sig_required == 1"),
  });
});
