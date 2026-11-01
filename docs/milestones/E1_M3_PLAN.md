# E1.M3 — Parametric sketches and integrated editing

State: in progress; owner authorized this milestone and the accompanying interaction changes. Target experimental version: 0.1.4. Base: delivered 0.1.3, 12e15623b3b9474cdce6a6a95f13c1de06b867bc. Platform SDK remains accepted 0.1.12; optional tab presentation remains Platform 0.1.13.

## Scope and acceptance

- Persist stable, typed coincidence, horizontal, vertical, fixed, length, radius, diameter and coordinate dimensions; reference dimensions measure without driving. Solve through the pinned PlaneGCS worker, independently verify residuals/rank and report conflicts/redundancy/DOF. Fully defined rectangle at origin, freely dragged circle, constrained endpoint/segment drag, conflict and missing-reference repair are required fixtures.
- Rectangles expand into four lines with corner coincidence and horizontal/vertical relations. Existing primitive profiles remain readable; upgrade working sketches explicitly without rewriting immutable versions. Endpoint, midpoint and circle center references use semantic identities.
- Edit on the real support plane in the existing Model viewport with the solid visible; smooth entry/F8/double-middle alignment, orbit/pan/zoom retained. Ribbon owns sketch tools, automatically opens during editing, and selects sketches from Manager instead of a dropdown.
- Single selection across Manager, model, sketch components and constraints. Inspector shows support plane, related constraints and delete actions; selecting a constraint highlights its participants. Underdefined/selected edges and points #0000ff, defined black, conflict red, lost reference green; orange hover never overrides selection.
- Manager context menus and double-click Edit where supported, Hide/Reveal for references/sketches and dependency-safe Delete. Canonical coordinate-frame recreation and custom plane/axis authoring may remain at their scheduled milestone, as explicitly permitted by the owner.
- Revision-aware shared Undo/Redo with Ctrl+Z/Ctrl+Y, final File entries and topbar Undo icon. Restoring working content must advance revision and retain all immutable versions, publications and recovery receipts.

## Gates

Domain/typed tool parity, bounded queries, stale/cancel/invalid rollback, old profile read and upgrade/undo/reopen, numeric solver oracles, visible actual UI workflows, separated panels and actual hardware WebGPU regression. Keep existing exact geometry, immutable closure, proposal review and independent vector PDF tests. Current-only M3 demo; historical demos remain explicit acceptance fixtures. Update contracts, status, handoff and report with actual results. Exact-head Windows/Linux CI, immutable prepared ZIP/manifest publication, actual public Platform discovery/install/launch and new demo verification precede delivery. No merge, stable release or owner acceptance implied.
