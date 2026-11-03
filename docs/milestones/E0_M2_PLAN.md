# E0.M2 — Exact kernel, 2D solver and reference feasibility

State: experimenting; no foundational ADR or CAD schema is frozen. Owner authorized continuation after E0.M1 on 2026-10-30. This is an executable feasibility milestone, not the E1 interactive sketch/model editor.

Requirements: initial CAD-R002/R003/R004/R019 and resource/cancellation portions of CAD-R022/R023. Prerequisite: installed/public E0.M1, source a1958f378c524b65cf50212e92c53937bbc9f998, Platform 0.1.12 pin unchanged.

## Bounded experiment

- Evaluate unmodified replicad 1.2.0 (MIT), replicad-opencascadejs 1.1.0 (OCCT V8_0_1 candidate, LGPL-2.1 plus OCCT exception) and @salusoft89/planegcs 1.3.0 (package LGPL-2.0-or-later metadata; source headers/LICENSE LGPL-2.1-or-later). Record exact tarball integrity/source commits and retain corresponding sources, licenses and replacement/rebuild instructions.
- Isolated cancellable Node worker evaluates fixed typed recipes, never arbitrary scripts or project-provided executable paths. Compare exact B-Rep validity, dimension/area/volume and STEP against independently calculated analytic oracles. Mesh is supplemental Canvas CPU preview, explicitly not WebGPU acceptance.
- Named rectangular sketch/extrusion and analytic revolution; subtractive holes, fuse/common booleans, nonmanifold/degenerate rejection. OCCT Modified/IsDeleted history maps references; split is ambiguous, deleted/imported/unverified-kernel lineage is lost. Stable selectors are limited to explicit producing-feature roles; no face index is saved.
- PlaneGCS fixtures distinguish DOF, consistent redundancy, inconsistency and singularity; independent residual/Jacobian rank checks bound the supported 2D relation subset. Pointer-like drag uses temporary constraints and cannot alter a committed sketch on failed solve.
- Inspectable lab lets owner change bounded dimensions/scenarios, run actual kernels, inspect selection/diagnostics and execute the corpus. Save/reopen stores only an opt-in provisional E0.M2 recipe; older E0.M1 documents remain readable and unchanged unless explicitly applying an experiment. Full schema is deferred until E0.M4.

## Evidence gates

GEO-EXTRUDE / CUT / REVOLVE / FUSE / COMMON / STEP; TOPO-DIMENSION / REORDER / SUPPRESS / SPLIT / MERGE / PATTERN / DELETE / IMPORT / KERNEL-COMPAT; SOLVER2D-FULL / FREE / REDUNDANT / CONFLICT / SINGULAR / DRAG / MISSING; RESOURCE-CANCEL / DEADLINE / INVALID; browser/direct/Platform and persistence regression. Each result reports expected, actual, tolerance, pass/fail/unsupported, versions and time/memory. Worker isolation and post-operation memory telemetry are not an OS-level hard RSS guarantee.

Initial probe tolerances are experimental, not manufacturing or final acceptance profiles. Freeze E0 quantitative bounds only at E0.M6/M7 with owner review. Kernel/version migration tests may safely refuse unverified lineage; do not claim a second runtime was actually executed if it was not.

Deliver 0.0.2 experimental with a visible lab, full report/ADR proposals, exact CI, prepared ZIP/manifest and real public Platform installation verification. Review is required before marking the milestone accepted or selecting final native schema. No E0.M3 spatial solver, full E1 sketch editor or E0.M6 WebGPU/drawing claim.
