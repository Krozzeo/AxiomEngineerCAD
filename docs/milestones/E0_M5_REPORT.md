# E0.M5 — Semantic commands and human proposal review

Date: 2026-10-30. Software **0.0.5 experimental**. Master v0.2 unchanged. Review candidate; owner acceptance pending. Based on delivered E0.M4 `bbedf5d9c8d47d250769914752f5e770a74078ba`; Platform 0.1.12 remains pinned to `6d240845cd77eb1879738d32c9f2b8fcfd7297c5`.

## Delivered slice

17 versioned semantic tools share Engineer's manual reducer, native validation and isolated exact kernel/solver workers. [Catalog/schema](../contracts/SEMANTIC_TOOLS_V1.json), [ADR-008](../architecture/ADR-008-SEMANTIC-REVIEW.md), `src/commands/` and `tests/commands.test.mjs` are the executable contract. Supported mutations are the primary geometry-probe driving dimensions, first rectangular extrusion in an empty native geometry slot and literal metadata. Queries page stable identities, typed feature context, actual kernel measurements and bounded solver diagnostics.

Proposal copies, command traces, validation, SDK diff/review hash and local journal remain isolated until explicit human Apply & Save. The server binds authority independently of submitted actor fields. Separate revocable agent grants cannot edit MAIN, impersonate humans or Apply. MAIN revision/hash, proposal revision/hash, effective dependencies, source bytes and complete human review must still match at Apply. Manual MAIN controls share the same handler and use ordinary Save.

**E0.M5 Review Lab** is a native, version-owned Load Demos document. Run local scripted proposal, validate it, inspect before/after exact numerical evidence and every diff row, confirm and Apply & Save. Source/consumer, spatial and geometry demos remain available. The scripted agent uses the actual agent HTTP endpoint and grant; no model, account or provider is required or evaluated.

## Local evidence

Windows x64, Node v24.21.0, Chromium 141.0.7390.37:

- `npm run check`: **71/71**, zero failures/skips; 17 new command tests plus the retained 54 tests. Actual native/kernel/solver execution, no domain mock.
- `npm run test:browser`: passed direct and actual Platform Hub flows, zero page errors. Agent width40→60 remains isolated until human review/Apply; shared manual width70 saves/reopens. MAIN edit invalidates an already reviewed proposal, revoked agent receives denial, reopen restores no grant. Immutable version count stays unchanged by working edits. Linux CI exposed a queued status poll overwriting the direct closed-session label; queued callbacks now recheck closed state, with a delayed close-response browser regression.
- Retained numerical corpora: **29/29 geometry/2D**, **28/28 spatial**, plus actual native source update/adoption/history/recovery and original-byte preservation.
- Deterministic semantic replay and unit conversion agree with manual commands. Bad tool/version/schema/unit/nonfinite/reference/scope, idempotence mismatch, bad geometry and response limits fail safely. Partial review cannot Apply; changed review hash, MAIN or actual source bytes invalidate proposals. Cancellation, grant revocation and shutdown preserve MAIN.
- Persistence tests inject pre-write review history failure and external primary changes. Post-commit journal failure returns `persisted:true`; reopen reconciles the native durable operation receipt without another revision. Pending reopened proposals are suspended and have no restored human approval.

Captured local output and browser report/screenshots are in `docs/milestones/evidence/E0_M5/`. These prove the local source tree; exact remote head CI and immutable release provenance are published on the PR/release, independently of this pre-publication report.

## Installation gate and boundaries

The release pipeline runs exact-head Windows/Linux acceptance, production packaging with verified corresponding sources, relocated actual Platform lifecycle, all 57 retained numerical cases and installed semantic HTTP command/agent/review/Apply/save/reopen proof. Experimental publication must then pass actual public Platform catalog/download/hash/install/activation/demo verification before reporting delivery. See [delivery requirement](../MILESTONE_DELIVERY.md); passing local tests alone does not satisfy it.

No provider/model quality evaluation, remote engineering-data transmission, arbitrary sketch/history editor, general assembly editor, WebGPU, drawing/PDF/vector export or final native schema acceptance is claimed. Local exposure denies remote dispatch. Bounded experimental journals and retained proposal limits are described in ADR-008. E0.M6 drawing/GPU/security evidence remains next after owner review/progression; E0.M7 remains the integrated Go/Redesign/Stop gate. No main merge or stable release is authorized by this report.
