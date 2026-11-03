# E1.M5 sketch interaction and planar support — 0.1.8 plan

Owner request 2026-11-03, based on delivered 0.1.7 / e887a1338c4326603e360b435703ca6ab4d8717a (PR15). This is an explicitly requested extension/correction of the workbench, not acceptance or E2 progression. Preserve all user documents and immutable installations. English source/UI; Spanish owner delivery guide.

## Work and acceptance map

1. Rubber-band previews for every existing two-point primitive; actual pointer motion before the second click, no source mutation until commit.
2. Default Snap for creation and point drag, Ctrl temporarily bypasses; semantic endpoints/midpoints/centers/origin; atomic geometry + coincidence source and one Undo step. Solver, stale and fully constrained failures preserve the document.
3. Explicit entity deletion removes its owned relations and relation bindings atomically. Pre-existing orphan relations remain inspectable/repairable rather than disappearing from lists.
4. Parameter Manager adds all geometric relations, source navigation, selectable/editable/removable targets, diagnostic colors/text. Inspector and tables expose missing references in green, conflicts in red.
5. New signed dimension intent uses positive value in the initially selected direction, negative reverses it. Retain old source semantics; redundant driving dimensions visibly conflict even when numerically consistent. The overdefinition dialog freezes the pre-dialog placement.
6. Distinct Enable/Disable icons and opaque gray disabled features.
7. Parameter Manager footer carries error/success text and red X / green check. Search inputs have clear borders. Binding selectors are empty when unset and searchable by label while retaining stable IDs.
8. One selected row; focus selects the row, leaving commits and deselects only on success, blank click commits/deselects, Escape rolls back/deselects. Navigation selects a row, including under active filters and concurrent refresh.
9. Sketch dimension Inspector Value accepts a numeric literal or searched parameter binding, shows existing driver, and has an icon-only Go to source. Model labels prefix bound parameter names.
10. New Sketch is a selected operation with Escape cancellation, selectable support field, clearing icon, Model/Manager selection, planar-face context menu first. Normal/right arrows originate at the actual face/plane center; normal reverse and four angle icon buttons update the preview.
11. All planar faces of supported exact native solids are eligible, including angled extrusion sides and boolean descendants. Preserve semantic cap lineage and use conservative exact producer-owned planar geometry witnesses for other faces; no persisted face-array index or guessed retargeting. Curve surfaces reject, Changed/split/merged/lost witnesses diagnose and require explicit repair. Preserve existing cap semantics and old-reader refusal for new source fields.
12. Ribbon shows New Sketch or Edit Sketch according to selection; active edit says Exit Sketch, stays pressed, and selects its sketch on exit.

## Implementation order

- Shared domain/schema and negative tests: deletion, redundant-driver diagnostics, signed dimensions, atomic Snap, relation queries, planar support and lineage.
- Shared UI controls, sketch preview/Snap, dimensions/Inspector, Parameter Manager selection/search/footer, support operation and feature context/ribbon.
- Editable current-only demo, headless parity, actual mouse/keyboard/physical GPU/save/reopen, old-reader/immutable history and retained browser/PDF/security tests.
- Exact-head Windows/Linux CI, immutable experimental ZIP/manifest publication and actual public Platform discovery/install/activate/launch. Owner review remains pending.

## Scope and technical decisions

No change to accepted SDK/kernel/solver pins or full MVP scope. Keep mathematical RedundantConsistent distinct from inconsistent equations, while treating ambiguous redundant driving dimensions as an owner-visible overdefinition conflict. General feature breadth, multi-body, curved supports and manufacturing drawing authoring stay outside this correction. ADR025 will record semantic planar references, source extensions and repair behavior before those changes ship.

Status: in progress. No completed capability or delivery is claimed by this plan.
