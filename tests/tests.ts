import fs from "node:fs";

import * as helios from "@koralabs/helios";
import { ContractTester, Test } from "@koralabs/kora-labs-contract-testing/contractTester.js";
import { getAddressAtDerivation } from "@koralabs/kora-labs-contract-testing/fixtures.js";

import {
  PublicDatumFixture,
  adminSigner,
  baseEntries,
  dappSigner,
  handleName,
  otherDappSigner,
  ownerSigner,
} from "./fixtures";

helios.config.set({ IS_TESTNET: false, AUTO_SET_VALIDITY_RANGE: true });

const contractFile = fs.readFileSync("./contact.helios", "utf8");
const program = helios.Program.new(contractFile);
const { Redeemer } = program.types;
const handleBytes = [...Buffer.from(handleName, "utf8")];

const dappUpdatedEntries = [
  { keyHex: dappSigner.hex, value: 2n },
  { keyHex: otherDappSigner.hex, value: 7n },
];

const unauthorizedDappEntries = [
  { keyHex: dappSigner.hex, value: 2n },
  { keyHex: otherDappSigner.hex, value: 9n },
];

const ownerPrunedEntries = [{ keyHex: dappSigner.hex, value: 1n }];

const ownerMutatedEntries = [{ keyHex: dappSigner.hex, value: 5n }];

const makeRedeemer = (
  Variant: typeof Redeemer.DAPP_UPDATE | typeof Redeemer.MIGRATE | typeof Redeemer.OWNER_UPDATE,
) => new Variant(handleBytes)._toUplcData();

const fixtureFor =
  (options: ConstructorParameters<PublicDatumFixture["initialize"]>[0]) =>
  async (validatorHash: helios.ValidatorHash) =>
    new PublicDatumFixture(validatorHash).initialize(options);

const runTests = async () => {
  const tester = new ContractTester(await getAddressAtDerivation(0));
  await tester.init();

  const cases: Array<() => Promise<void>> = [
    () =>
      tester.test(
        "DAPP_UPDATE",
        "signer may update its own datum key",
        new Test(
          program,
          fixtureFor({
            newEntries: dappUpdatedEntries,
            oldEntries: baseEntries,
            redeemer: makeRedeemer(Redeemer.DAPP_UPDATE),
            signatories: [dappSigner],
          }),
        ),
      ),
    () =>
      tester.test(
        "DAPP_UPDATE",
        "settings block is immutable for dapps",
        new Test(
          program,
          fixtureFor({
            oldEntries: baseEntries,
            newEntries: dappUpdatedEntries,
            oldMigrateSigRequired: 0,
            newMigrateSigRequired: 1,
            redeemer: makeRedeemer(Redeemer.DAPP_UPDATE),
            signatories: [dappSigner],
          }),
        ),
        false,
        "DApps can't change user settings",
      ),
    () =>
      tester.test(
        "DAPP_UPDATE",
        "signer cannot mutate another dapp key",
        new Test(
          program,
          fixtureFor({
            newEntries: unauthorizedDappEntries,
            oldEntries: baseEntries,
            redeemer: makeRedeemer(Redeemer.DAPP_UPDATE),
            signatories: [dappSigner],
          }),
        ),
        false,
        "You can only change your datum",
      ),
    () =>
      tester.test(
        "OWNER_UPDATE",
        "owner may prune third-party datum entries",
        new Test(
          program,
          fixtureFor({
            newEntries: ownerPrunedEntries,
            oldEntries: baseEntries,
            redeemer: makeRedeemer(Redeemer.OWNER_UPDATE),
            signatories: [ownerSigner],
          }),
        ),
      ),
    () =>
      tester.test(
        "OWNER_UPDATE",
        "owner cannot rewrite preserved datum values",
        new Test(
          program,
          fixtureFor({
            newEntries: ownerMutatedEntries,
            oldEntries: baseEntries,
            redeemer: makeRedeemer(Redeemer.OWNER_UPDATE),
            signatories: [ownerSigner],
          }),
        ),
        false,
        "You cannot change DApp datum. Only delete.",
      ),
    () =>
      tester.test(
        "MIGRATE",
        "admin signer may migrate without owner when policy flag is off",
        new Test(
          program,
          fixtureFor({
            oldEntries: baseEntries,
            newEntries: baseEntries,
            oldMigrateSigRequired: 0,
            newMigrateSigRequired: 0,
            redeemer: makeRedeemer(Redeemer.MIGRATE),
            signatories: [adminSigner],
          }),
        ),
      ),
    () =>
      tester.test(
        "MIGRATE",
        "owner co-sign is required when migrate_sig_required is enabled",
        new Test(
          program,
          fixtureFor({
            oldEntries: baseEntries,
            newEntries: baseEntries,
            oldMigrateSigRequired: 0,
            newMigrateSigRequired: 1,
            redeemer: makeRedeemer(Redeemer.MIGRATE),
            signatories: [adminSigner],
          }),
        ),
        false,
        "Missing root handle owner signature",
      ),
    () =>
      tester.test(
        "MIGRATE",
        "migration fails without an admin signer",
        new Test(
          program,
          fixtureFor({
            oldEntries: baseEntries,
            newEntries: baseEntries,
            redeemer: makeRedeemer(Redeemer.MIGRATE),
            signatories: [ownerSigner],
          }),
        ),
        false,
        "Required admin signer(s) not present",
      ),
  ];

  for (const runCase of cases) {
    await runCase();
  }

  tester.displayStats();

  const totals = tester.getTotals();
  if (totals.failCount > 0 || totals.successCount !== totals.testCount) {
    process.exitCode = 1;
  }
};

await runTests();
