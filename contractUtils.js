import fs from "node:fs";

export const resolveOptimizationFlag = (optimizeValue) =>
  Boolean(optimizeValue || false);

export const normalizeContractDirectory = (contractDirectory = "./contract") =>
  contractDirectory.endsWith("/")
    ? contractDirectory.slice(0, -1)
    : contractDirectory;

export const readContractSource = (contractPath = "./contact.helios") =>
  fs.readFileSync(contractPath, "utf8");

export const hasValidatorEntrypoint = (source) =>
  source.includes("validator") || source.includes("spending");

