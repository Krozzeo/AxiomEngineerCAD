# Compact Engineer context

Start with `npm run context`. `PROJECT_STATE.json` records the reviewed Master hash (UTF-8 with CRLF normalized to LF) and last immutable delivery. A matching hash permits targeted reading under AGENTS1; a mismatch requires full design review. The Master remains authoritative. A brief is navigation, never proof of implementation.

Platform owns generic local lifecycle, credentials and shared AI/review SDK. Engineer owns exact geometry, sketch solving, native history, assemblies, drawings and semantic CAD operations. Source mutations share revision-checked commands; GPU triangles and pixel IDs never establish native identity. Keep immutable builds/user files and human authorization boundaries intact.

E0 completed feasibility, E1 delivered exact extrusion/sketch and E2 delivered local model/drawing workflows. E2 is closed and published as 0.2.6 stable. E3.M1 and the initial E3.M2 operations were delivered experimentally through 0.3.6. The 0.3.7 candidate refines E3.M2 with shared operation construction, four boolean modes, multibody material, referenced limits and custom datums. Read [current construction scope](E3_M2_FEATURE_CONSTRUCTION.md). Owner stage acceptance remains separate from delivery.

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
