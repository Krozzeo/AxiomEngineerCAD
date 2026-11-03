# E1.M4 — Parameters, dimensions and sketch interaction

State: in progress, owner requested the next milestone and attached UX changes on 2026-11-01. Base: delivered 0.1.4 / e0d05c2796f2bc1bb47d7af370688178246bcebc. Target: 0.1.5 experimental, compatible with the accepted Platform SDK.

## Delivery scope

- Parameter Manager with document/component scopes, bounded safe typed expressions, unit checking, dependency DAG, atomic cycle/domain/missing-symbol refusal, source navigation and semantic query/edit/binding tools. Equations drive actual sketch dimensions and survive save/reopen.
- Dark context menus, Delete selection, reference picking/hover, lavender selected edges/points (#7979ff from the supplied image), neutral gray sketches outside editing, and continuously visible sketch status.
- Model/reference/sketch feedback uses the same submitted camera frame. Enter-sketch alignment completes; F8/double-middle aligns or reverses an already aligned view. Preserve ordinary orbit/pan/cursor zoom and separated panels.
- Fast warm constrained drag previews off the UI thread, GPU rendering where appropriate, immediate visual continuity on release and authoritative revision-checked final commit. Measure actual cold/warm latency and frame/commit behavior; do not substitute a visual approximation for solved source.
- Physical selectable, movable dimensions with measured initial values, placement, quick value editing, Inspector targets, reference state and Delete. Dimension source/placement persists and uses the same shared commands as headless tools.
- A contextual Sketch Manager tree, semantic child points, hover/select/multiselect, construction/delete actions and compact Inspector with actual coordinate mobility, relation list/targets and delete/clear controls. Endpoint/midpoint markers appear only for hovered/selected participants; midpoint is square.
- Type-appropriate relation suggestions from Shift selection; implement and verify the main line/point/circle relationships in the supplied reference as an owner-requested early subset of E3. This does not claim arcs/pattern/trim or the rest of E3 complete.

## Evidence and delivery gates

Independent expression/unit/solver/residual/mobility fixtures, shared human/agent command parity, stale/invalid/cancel rollback, old-reader safe refusal and old immutable source preservation. Actual UI creation/placement/edit/drag/multiselection/tree/Inspector/navigation/Undo/Redo and separated windows; measured physical-GPU performance and reference frame agreement. Retain geometry/history/proposal/security and five independently read vector PDFs.

Only current M4 demos are advertised; preserve earlier user projects and use explicit historical regression fixtures. Exact-head Windows/Linux CI, immutable ZIP/manifest size/hash/provenance, actual public Platform discovery/install/launch and owner-visible demo verification precede delivery. Owner acceptance remains separate.
