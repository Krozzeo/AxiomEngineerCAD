# Engineer implementation status

Current: **0.1.7 / E1.M5 editing recovery — validation in progress**. Branch `engineer/e1-m5-editing-recovery` stacks on delivered 0.1.6 / d6bab409a319d3fa9a65531bfb2dc74fd79e7bdc. No E2 progression, main merge, stable release or owner acceptance is claimed.

## Delivered baseline

0.1.6 / E1.M5: [PR14](https://github.com/Krozzeo/AxiomEngineerCAD/pull/14), exact Windows/Linux PR CI 41471021481, publication 41472653262. Immutable ZIP 99,876,907 bytes, SHA256 `8cf8f71986af61bc74c24f7ef3c04021e50aff45df89bfc21fedb4c23b6eedd6`. Genuine public Platform0.1.13 discovery/install/launch, NVIDIA UI and five independent vector PDFs were verified. The owner subsequently reported the current editing/receipt defects; delivery is not acceptance.

| Milestone | State |
| --- | --- |
| E0.M1–M7 | Delivered 0.0.1–0.0.7; owner Go for E1 recorded 2026-10-31 |
| E1.M1 | Workbench and UX revisions delivered 0.1.0–0.1.2 |
| E1.M2 | Editable primitives delivered 0.1.3 |
| E1.M3 | Parametric sketch editing delivered 0.1.4 |
| E1.M4 | Parameters/expressions and physical sketch UX delivered 0.1.5 |
| E1.M5 | Exact extrusion delivered 0.1.6; 0.1.7 correction review in progress |
| E2–E6 | Planned; not completed |

## Current corrections

[Scope and test flow](docs/milestones/E1_M5_UX_0_1_7.md), [ADR024](docs/architecture/ADR-024-SKETCH-EDIT-ROLLBACK-AND-RECOVERY.md).

- Separate authoritative sketch source from downstream execution during editing. Open/disjoint/intersecting intermediate profiles can be edited. Exit validates the enabled complete chain; a failed exit retains the edit and its controls. Save validates unfinished consumed profiles before writing. Cancel restores a checkpoint as a new revision.
- Disable/Enable persists explicit suppression and execution cascades through dependencies without deleting source or immutable versions. Deletion cleans owned feature bindings and preserves display preferences.
- Constrained endpoint drag relaxes an artificial opposite-endpoint preference when it blocks permitted motion. Actual midpoint-linked line rotation/length changes preserve permanent relations.
- Dimension hover, selected numeric entry, stepwise Escape/right-click Back, existing dimension edit/move, and Keep driving / Reference / Cancel overdefinition choices.
- New Sketch uses selected support or support selection, followed by normal/right orientation, including Model face context menu. Camera roll respects the chosen right direction in both projections and smooth navigation.
- Automatic parameters begin scalar, infer mm/degrees from compatible bindings and retain canonical inferred context. Unrelated parameter edits do not require unrelated conflicted sketches to solve. Completions replace one expression token.
- Bound operation inputs are read-only with Go to source. Optional exact preview never mutates source or becomes a saved reference; Apply/Cancel and reverse toggle use the common domain reducer.
- 10000 receipt capacity, preserved exact retry identities and no automatic retries for permanent capacity/worker errors. 51 typed tools.

## Evidence state

The latest full domain run passed 213 tests; the latest targeted recovery suite passed 12 tests, including the subsequently added consumed-sketch conflict guard. Previous full browser and targeted NVIDIA runs cover the original M5 slice and the new actual mouse/keyboard recovery cases. Final complete browser/domain/package/CI/public-install gates remain in progress. Local ignored artifacts are development evidence, not published acceptance archives. The exact 0.1.6 decoder accepts unchanged M5 data and safely refuses new suppression/unit/orientation fields without writes.

## Bounds and continuity

SDK pin remains accepted Platform0.1.12 commit `6d240845cd77eb1879738d32c9f2b8fcfd7297c5`; public installation acceptance uses actual Platform0.1.13 commit `2f775b1cfff1a8fd749e6e30e2c33ca519209be1`. Replicad1.2.0, replicad-opencascadejs1.1.0 and PlaneGCS1.3.0 remain pinned.

Native format0/1, old documents, original backups, recovery and immutable history remain supported. New strict optional source fields are refused by older readers. M5 extrusion still supports one connected primary part, up to eight additive operations, one outer region/up to four holes and proven cap face supports. General face lineage, multi-body/cuts/revolve/finishing and full drawing authoring remain at their later gates. Current 10000-receipt capacity is finite. No real-model AI or manufacturing-release acceptance is claimed.

Dated milestone reports and ADRs retain earlier experimental scope and evidence; this file is the current status.
