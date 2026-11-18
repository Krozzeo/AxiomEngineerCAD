# Compact Engineer context

Current work: **0.4.2 / E4.M1 workspace interaction refinements**, branch `engineer/workspace-interactions`, based on delivered 0.4.1 (PR23, `91fe145548511ae03c1edf1f7dcd2980da2012fc`). Scope and verification are in [workspace interaction notes](WORKSPACE_INTERACTIONS_0_4_2.md). Focused domain and actual Chrome/NVIDIA workspace checks passed. The candidate is frozen for complete exact-head Windows/Linux CI and actual public installation; neither gate is claimed complete here. This is an owner-requested M1 refinement, not E4.M2 or a stable merge. Main/stable remains0.3.13.
Previous batch: **0.3.11 / E3.M5 STEP interoperability**, plus the standalone Bottom Dependencies panel driven by Parameter Manager selection. E3.M4/0.3.10 was delivered publicly and accepted by the owner. Read [M5 scope and demo checks](E3_M5_INTEROPERABILITY.md). Complete exact-head acceptance/public installation are required; owner M5 acceptance is pending. At that historical delivery, main/stable were 0.2.6.


Start with `npm run context`. `PROJECT_STATE.json` records the reviewed Master hash (UTF-8 with CRLF normalized to LF) and last immutable delivery. A matching hash permits targeted reading under AGENTS1; a mismatch requires full design review. The Master remains authoritative. A brief is navigation, never proof of implementation.

Platform owns generic local lifecycle, credentials and shared AI/review SDK. Engineer owns exact geometry, sketch solving, native history, assemblies, drawings and semantic CAD operations. Source mutations share revision-checked commands; GPU triangles and pixel IDs never establish native identity. Keep immutable builds/user files and human authorization boundaries intact.

E0/E1 established the exact native foundation; E2 is closed as 0.2.6 stable. E3.M1–M4 are delivered and owner-accepted through 0.3.10. E3.M5 adds bounded exact STEP import/export, original source and translation reports, independent native CAD round trips, imported-face native additions and a standalone selection-driven Dependencies panel. Historical tests use explicit fixtures outside the production demo catalog.

Current implemented bounds include part-local extrusion/revolution histories, exact boolean operations and feature transforms, typed sketch constraints/equations, referenced planes/axes/coordinate systems, inline Parameter Manager, docking and separate windows. Conservative geometry witnesses require explicit repair when their source disappears. Existing documents retain their sign and face-refinement semantics. Older strict readers reject new source extensions. General assemblies, broad drawing generation and a general nonlinear 3D datum constraint solver remain outside this batch.

Select a narrow entry point:

| Change | Read first | Focused evidence |
| --- | --- | --- |
| Sketch interaction/Inspector | `app/sketch-workbench.mjs`, sketch references and intent | `scripts/check-sketch-interactions-ui.mjs` |
| Constraints/drag/signs | `src/sketch/`, command reducer/session | Relevant sketch tests; `tests/sketch-interactions.test.mjs` |
| Supports/extrusion | `src/extrusion/`, `src/sketch/support.mjs`, ADR025 | Extrusion/support tests plus actual Model picking |
| Parameters/tables | `src/parameters/`, `app/parameter-manager.mjs` | Parameter tests and browser table/value cases |
| Viewport/panels | `app/proof.mjs`, GPU view, camera, panel channel | Actual camera/picking/separate-window checks; delayed-response ordering regression |
| Native/AI authority | `src/native/`, `src/commands/`, relevant contracts | Native/version/permission/atomicity tests |
| Delivery | `docs/MILESTONE_DELIVERY.md`, pinned SDK publication context | Exact PR acceptance, immutable package and actual Platform installation |

The complete acceptance entry points remain `npm run check` and `npm run test:browser`, on Windows/Linux, with independent PDF verification. Focused checks support diagnosis; they never replace publication acceptance. Use real hardware for hardware claims and label unsupported/software/fault-injection paths separately.

The compact context and workflow are developer infrastructure. Read the current task separately, use `DEVELOPMENT_WORKFLOW.md`, and preserve delivered evidence while reviewing process and CAD changes independently.
