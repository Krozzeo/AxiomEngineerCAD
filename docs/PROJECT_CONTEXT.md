# Compact Engineer context

Start with `npm run context`. `PROJECT_STATE.json` records the reviewed Master hash (UTF-8 with CRLF normalized to LF) and last immutable delivery. A matching hash permits targeted reading under AGENTS1; a mismatch requires full design review. The Master remains authoritative. A brief is navigation, never proof of implementation.

Platform owns generic local lifecycle, credentials and shared AI/review SDK. Engineer owns exact geometry, sketch solving, native history, assemblies, drawings and semantic CAD operations. Source mutations share revision-checked commands; GPU triangles and pixel IDs never establish native identity. Keep immutable builds/user files and human authorization boundaries intact.

E0 completed its feasibility foundation and the owner authorized E1 progression. E1.M1–M4 delivered workbench, primitives, parametric sketches and equations. E1.M5 delivered exact extrusion plus UX/recovery through 0.1.8. Delivered 0.1.11 adds isolated previews, circular references and overlap selection. Candidate 0.1.12 consolidates exact face refinement, external Snap, radial drag, source navigation and depth bindings; consult PROJECT_STATE and the current scope report for validation/delivery status. Owner acceptance of the latest CAD work remains pending. Delivery does not authorize E2, stable publication or merging PR18.

Current implemented bounds: supported primary-part extrusion chain, point/line/circle/four-line rectangles, typed constraints/equations, inline Parameter Manager, docking and separate windows. General planar supports use conservative geometry witnesses: changed faces require explicit repair. Existing dimensions preserve old sign semantics; newer strict source extensions are refused by older readers. Full feature breadth, arcs and general edit-proof topology remain later work.

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
