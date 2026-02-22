# Handles Public Datum PRD

## Summary
`handles-public-datum` defines the `public_datum` spending validator that controls controlled updates and migration behavior for public datum records tied to handle ownership and admin settings.

## Problem
Public datum updates need deterministic rules so that:
- dApps can only mutate their own keyed values,
- owners can prune dApp-managed keys without modifying protected dApp values,
- migrations require explicit admin and optional owner signatures,
- resulting outputs remain on approved validator contracts.

## Users
- Contract engineers maintaining public-datum validator logic.
- Operators managing migration flows and approved contract settings.
- dApp integrators writing public datum values under their signer keys.

## Goals
- Enforce strict signer- and datum-level permissions for update paths.
- Ensure output is redirected only to approved validator hashes.
- Support migration with configurable owner-signature requirement.
- Keep repository-level coverage guardrail for utility and contract tooling.

## Non-Goals
- Frontend/public profile rendering.
- Generic personalization or minting behavior outside public datum control.
- Off-chain API orchestration.

## Functional Requirements

### DApp Update
- Allow updates only for datum keys where signer matches key ownership.
- Prevent dApp path from modifying user settings block.

### Owner Update
- Require root handle owner signature.
- Allow owner to delete dApp datum entries.
- Prevent owner from mutating preserved dApp values directly.

### Migration
- Require admin signature.
- Require owner signature when `migrate_sig_required` is enabled.
- Validate output remains on approved contract list.

## Success Criteria
- Validator logic enforces signer + contract checks for all redeemer paths.
- Coverage guardrail (`test_coverage.sh`) reports >=90% lines/branches.
- Product/spec docs remain linked from README and docs index.
