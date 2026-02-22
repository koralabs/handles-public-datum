import assert from "node:assert/strict";
import test from "node:test";

import {
  hasValidatorEntrypoint,
  normalizeContractDirectory,
  readContractSource,
  resolveOptimizationFlag,
} from "../contractUtils.js";

test("resolveOptimizationFlag handles false and truthy values", () => {
  assert.equal(resolveOptimizationFlag(undefined), false);
  assert.equal(resolveOptimizationFlag("1"), true);
});

test("normalizeContractDirectory trims trailing slash", () => {
  assert.equal(normalizeContractDirectory("./contract"), "./contract");
  assert.equal(normalizeContractDirectory("./contract/"), "./contract");
});

test("readContractSource loads contact.helios and finds entrypoint text", () => {
  const source = readContractSource("./contact.helios");
  assert.equal(source.length > 0, true);
  assert.equal(hasValidatorEntrypoint(source), true);
});

test("hasValidatorEntrypoint returns false when no validator text exists", () => {
  assert.equal(hasValidatorEntrypoint("const X = 1"), false);
});

