# E0.M1 evidence report

Date: 2026-10-30. State: **review candidate; owner acceptance pending**.
Requirements: CAD-R001; initial lifecycle validation for CAD-R008/CAD-R022. Full requirements remain unaccepted.

## Source and environment

- Base design: `9b3c972872c224be164811954116dea1a5d3138f`.
- Implementation source: `7095daca0d861dccb6f7c5055b985ca9b50eec8b`, branch `engineer/e0-m1-foundation`. Documentation-only evidence updates identify this tested source separately.
- Platform 0.1.12: `6d240845cd77eb1879738d32c9f2b8fcfd7297c5`.
- Archive integrity: `sha512-SCmqHYjj2NpLnm5coiua6bPY2xEIp3Si9ol2mqxI0YE3zvOFvyKKRZ07BBVviFHAbNdgwJ8Bh5Vom3aoFyynvg==`.
- Local environment: Windows x64; Node v24.21.0; npm 11.19.0; Chromium 141.0.7390.37 / Playwright 1.56.1.

## Results

`npm run check`: **18 passed, 0 failed, 0 skipped**. Tests exercise native create/detect/edit/save/close/reopen, stable identity, receipts, stale writes, pending buffers, external edits, injected persistence failure, unknown/corrupt format, link/path escapes, busy lease, failed startup, authorization, unsupported capabilities, actual host/IPC lifecycle and failed product process.

`npm run test:browser`: direct CLI browser flow and actual Hub create/edit/Cancel/Save/Close/Open passed; **zero page errors**. Assertions compare real persisted JSON and identity. Host saved-state synchronization is exercised. Screenshots and browser-report.json are generated in test-results/ and uploaded by CI. No screenshot token or private filesystem path is shown.

Retained local evidence: [browser report](evidence/E0.M1/browser-report.json), [direct editor](evidence/E0.M1/direct.png), [hosted editor](evidence/E0.M1/hosted.png), [Hub](evidence/E0.M1/hub.png). Public push was rejected by automatic permission review because explicit authorization to publish this new implementation to the public repository was missing. No remote CI/PR/release has run; CI workflow is prepared locally.

No GPU, numerical geometry, model/provider, AI inference, final schema, historical CAD version, power-loss or upgrade/migration acceptance is claimed. The browser is testing a metadata lifecycle UI. Both test routes use isolated temporary roots and controlled local services, without provider accounts or remote project data.

## Review and continuation

Follow README and E0_M1_PLAN.md to inspect the editable shell. Owner signoff is pending. E0.M2 is not started. Retain the version-0 envelope without freezing schema v1. Record final PR/CI links and exact source commit before merging; do not merge from stale green evidence.
