# Engineer implementation status

Current: **0.1.8 / E1.M5 sketch interactions — review candidate**. Branch `engineer/e1-m5-sketch-interactions` stacks on delivered 0.1.7 / e887a1338c4326603e360b435703ca6ab4d8717a (PR15). No E2 progression, main merge, stable release or owner acceptance is claimed.

## Delivered baseline

[0.1.7 / PR15](https://github.com/Krozzeo/AxiomEngineerCAD/pull/15): exact Windows/Linux PR CI 41565076456; publication 41566221173. Immutable ZIP 99,900,683 bytes, SHA256 `855a5d6bffd2ff5c22781b05a542aa297477fa644012ebf29688be3274770383`. Actual public Platform 0.1.13 discovery/install/activate/launch, Chrome 156/NVIDIA and five independent PDFs passed with zero page errors. Delivery is not owner acceptance. Earlier immutable releases and user files remain intact.

| Milestone | State |
| --- | --- |
| E0.M1–M7 | Delivered 0.0.1–0.0.7; owner Go for E1 recorded 2026-10-31 |
| E1.M1 | Workbench/UX delivered 0.1.0–0.1.2 |
| E1.M2 | Editable primitives delivered 0.1.3 |
| E1.M3 | Parametric sketch editing delivered 0.1.4 |
| E1.M4 | Parameters/expressions delivered 0.1.5 |
| E1.M5 | Exact extrusion 0.1.6 and editing recovery 0.1.7 delivered;0.1.8 interaction review in progress |
| E2–E6 | Planned; not completed |

## Current changes and evidence

See the [requirement/test map](docs/milestones/E1_M5_UX_0_1_8.md), [plan](docs/milestones/E1_M5_UX_0_1_8_PLAN.md) and [ADR025](docs/architecture/ADR-025-SKETCH-INTERACTION-AND-PLANAR-SUPPORT.md).

Implemented: live previews; default persistent Snap including origin and circle perimeter; Ctrl bypass; deletion cleanup; geometric relation table and lost/conflict repair; signed intent and redundant driver diagnostics; footer/row/search UX; dimension literal/parameter selector and source labels; exact planar support selection/context/orientation; contextual New/Edit/Exit; opaque disabled features and distinct icons. All source mutations remain revision checked, atomically persisted and Undoable. 51 tools; SDK/kernel/solver pins unchanged.

Focused actual Chrome/NVIDIA tests passed primitive creation/preview/Snap/drag/Ctrl/Undo, table CRUD/binding/search/selection/footer, Inspector binding/literal/source/UndoRedo, missing-reference repair, equal-value overdefinition and frozen modal placement, actual planar side picking, orientation/context/ribbon. Domain checks include exact angled/additive supports and source-preserving failures. The complete retained Chrome/NVIDIA browser suite also passed, including real Save/Close/Reopen, hosted/separate windows, camera, native/review/security and current/historical drawing flows. All five vector PDFs passed independent pypdf/pdfplumber/PDFium checks. The relocated development installation passed its lifecycle and numerical corpora. Final exact-head Windows/Linux CI and public installation evidence are maintained on [PR16](https://github.com/Krozzeo/AxiomEngineerCAD/pull/16); verify the matching immutable build provenance. These are delivery gates, separate from owner acceptance.

Boundaries: one supported native solid/primary definition, current line/circle/point/rectangle primitives; no arcs/general feature breadth, curved sketch supports or edit-proof side-face lineage. A changed face witness requires explicit repair; no guessed retargeting. Old strict readers reject new direction/planar-frame/point-on-circle source extensions. Previous dimensions retain their original sign convention.

Preview recovery: an actual Windows CI failure at candidate 257751d was reproduced by holding genuine old status/result responses across re-enable. The corrected frontend guards the tracked job, desired build and source epoch; the deterministic regression asserts only the new revision is presented and is included in actual installed acceptance. CI and publication must target the subsequent corrected head.
