import * as helios from "@koralabs/helios";
import { AssetNameLabel } from "@koralabs/kora-labs-common/types/index.js";
import {
  Fixture,
  getAddressAtDerivation,
  getNewFakeUtxoId,
} from "@koralabs/kora-labs-contract-testing/fixtures.js";

helios.config.set({ IS_TESTNET: false, AUTO_SET_VALIDITY_RANGE: true });

export const HANDLE_POLICY_HEX =
  "f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a";
export const handleName = "root_handle";
export const handleHex = Buffer.from(handleName, "utf8").toString("hex");
export const publicDatumAssetName = `${AssetNameLabel.LBL_001}${handleHex}`;
export const ownerHandleAssetName = `${AssetNameLabel.LBL_222}${handleHex}`;
export const settingsAssetName = `${AssetNameLabel.LBL_222}${Buffer.from(
  "pd_settings",
  "utf8",
).toString("hex")}`;

const MAIN_INPUT_LOVELACE = 200_000_000n;
const TOKEN_OUTPUT_LOVELACE = 5_000_000n;
const COLLATERAL_LOVELACE = 10_000_000n;

export const ownerAddress = await getAddressAtDerivation(0);
export const dappAddress = await getAddressAtDerivation(1);
export const otherDappAddress = await getAddressAtDerivation(2);
export const adminAddress = await getAddressAtDerivation(10);

export const ownerSigner = helios.PubKeyHash.fromHex(
  ownerAddress.pubKeyHash?.hex ?? "",
);
export const dappSigner = helios.PubKeyHash.fromHex(
  dappAddress.pubKeyHash?.hex ?? "",
);
export const otherDappSigner = helios.PubKeyHash.fromHex(
  otherDappAddress.pubKeyHash?.hex ?? "",
);
export const adminSigner = helios.PubKeyHash.fromHex(
  adminAddress.pubKeyHash?.hex ?? "",
);

export interface DatumEntry {
  keyHex: string;
  value: bigint | helios.UplcData | number;
}

export interface PublicDatumFixtureOptions {
  adminCredHexes?: string[];
  newEntries?: DatumEntry[];
  newMigrateSigRequired?: number;
  oldEntries?: DatumEntry[];
  oldMigrateSigRequired?: number;
  redeemer?: helios.UplcData;
  signatories?: helios.PubKeyHash[];
  validContractHexes?: string[];
}

export const baseEntries: DatumEntry[] = [
  { keyHex: dappSigner.hex, value: 1n },
  { keyHex: otherDappSigner.hex, value: 7n },
];

const toByteArrayData = (hex: string) =>
  new helios.ByteArrayData([...Buffer.from(hex, "hex")]);

const toDataValue = (value: DatumEntry["value"]) =>
  value instanceof helios.UplcData ? value : new helios.IntData(BigInt(value));

const sortMapPairs = (
  pairs: [helios.ByteArrayData, helios.UplcData][],
): [helios.ByteArrayData, helios.UplcData][] =>
  [...pairs].sort((a, b) =>
    Buffer.compare(Buffer.from(a[0].bytes), Buffer.from(b[0].bytes)),
  );

export const buildPublicDatumData = (
  entries: DatumEntry[],
  migrateSigRequired = 0,
): helios.ListData =>
  new helios.ListData([
    new helios.MapData(
      sortMapPairs(
        entries.map(({ keyHex, value }) => [toByteArrayData(keyHex), toDataValue(value)]),
      ),
    ),
    new helios.IntData(BigInt(migrateSigRequired)),
  ]);

export const buildAdminSettingsData = (
  validContractHexes: string[],
  adminCredHexes: string[],
): helios.ListData =>
  new helios.ListData([
    new helios.ListData(validContractHexes.map((hex) => toByteArrayData(hex))),
    new helios.ListData(adminCredHexes.map((hex) => toByteArrayData(hex))),
  ]);

const buildHandleValue = (assetName: string) =>
  new helios.Value(
    TOKEN_OUTPUT_LOVELACE,
    new helios.Assets([[HANDLE_POLICY_HEX, [[assetName, 1n]]]]),
  );

export class PublicDatumFixture extends Fixture {
  async initialize(
    options: PublicDatumFixtureOptions = {},
  ): Promise<PublicDatumFixture> {
    const {
      adminCredHexes = [adminSigner.hex],
      newEntries = options.oldEntries ?? baseEntries,
      newMigrateSigRequired = options.oldMigrateSigRequired ?? 0,
      oldEntries = baseEntries,
      oldMigrateSigRequired = 0,
      redeemer,
      signatories = [],
      validContractHexes = [this.validatorHash.hex],
    } = options;

    const oldDatum = buildPublicDatumData(oldEntries, oldMigrateSigRequired);
    const newDatum = buildPublicDatumData(newEntries, newMigrateSigRequired);
    const adminSettings = buildAdminSettingsData(
      validContractHexes,
      adminCredHexes,
    );

    this.inputs = [
      new helios.TxInput(
        new helios.TxOutputId(getNewFakeUtxoId()),
        new helios.TxOutput(ownerAddress, new helios.Value(MAIN_INPUT_LOVELACE)),
      ),
      new helios.TxInput(
        new helios.TxOutputId(getNewFakeUtxoId()),
        new helios.TxOutput(
          this.scriptAddress,
          buildHandleValue(publicDatumAssetName),
          helios.Datum.inline(oldDatum),
        ),
      ),
    ];

    this.refInputs = [
      new helios.TxInput(
        new helios.TxOutputId(getNewFakeUtxoId()),
        new helios.TxOutput(
          ownerAddress,
          buildHandleValue(settingsAssetName),
          helios.Datum.inline(adminSettings),
        ),
      ),
      new helios.TxInput(
        new helios.TxOutputId(getNewFakeUtxoId()),
        new helios.TxOutput(ownerAddress, buildHandleValue(ownerHandleAssetName)),
      ),
    ];

    this.outputs = [
      new helios.TxOutput(
        this.scriptAddress,
        buildHandleValue(publicDatumAssetName),
        helios.Datum.inline(newDatum),
      ),
    ];

    this.signatories = signatories;
    this.redeemer = redeemer;
    this.collateral = new helios.TxInput(
      new helios.TxOutputId(getNewFakeUtxoId()),
      new helios.TxOutput(ownerAddress, new helios.Value(COLLATERAL_LOVELACE)),
    );

    return this;
  }
}
