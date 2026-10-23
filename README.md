# handles-public-datum

## Contributor test policy

Tests and coverage run locally only, never in GitHub Actions, directly or through lifecycle scripts, composites, workflow templates, or shared helpers. Preserve local test commands. Build, lint, publication, deployment, and production guards remain permitted. Remove obsolete required test checks when retiring them.

## Documentation
- [Docs Index](./docs/index.md)
- [Product Docs](./docs/product/index.md)
- [Spec Docs](./docs/spec/index.md)

## Local Validation
- `npm test` (scenario harness; may require missing local dependencies/entrypoint fix)
- `node --test tests/contractUtils.test.js`
- `./test_coverage.sh`
