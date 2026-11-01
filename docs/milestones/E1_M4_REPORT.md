# E1.M4 — Equations and sketch workbench, 0.1.5

State: implementation complete, final exact-head CI/public-install delivery gates pending. Owner acceptance remains separate. Base: delivered 0.1.4, e0d05c2796f2bc1bb47d7af370688178246bcebc. Only the current milestone demo is advertised; earlier user projects are preserved.

## What to test

1. Install/activate 0.1.5 experimental from Axiom Platform, then Load Demos → **E1.M4 Equations & Sketch Workbench**. The model opens automatically. Use this new demo so its equation bindings are present; a fresh empty project is also usable but has no example parameters.
2. Double-click **Layout sketch** in Manager / Features. The camera finishes aligning, Sketch ribbon and contextual Manager / Sketch open, and the bottom of Model shows solver status/DOF. F8 or double middle-click reverses an already aligned view; orbit then F8 aligns normally. Orbit/pan remain available.
3. Inspect the rectangle: black fully defined geometry; free circle center/construction line blue. Hover/select geometry to reveal endpoints and square midpoint. Selected points/segments use lavender #7979ff; orange is only preselection. Exit sketch: ordinary sketch geometry is neutral gray.
4. Drag the circle center or construction line. The radius remains constrained. Preview should follow smoothly and remain in place while final validation completes. Undo/Redo (Ctrl+Z/Ctrl+Y or File) restore the actual operation, including its constraints.
5. Select the construction line in Manager / Sketch, click **Dimension**, enter 50 and move/click or Enter to place. Double-click its displayed number to edit to 55. Drag the annotation to reposition it. Select it to inspect value and participants; remove a target, select a replacement, then Apply targets. Delete removes the selected dimension. Reference dimensions show measured values and cannot drive geometry.
6. Expand a line/circle in the Sketch tree and select endpoint/midpoint/center. Inspector shows compact coordinates, construction state, related constraints and targets. Locked coordinates are gray. Delete/clear constraint controls operate on the shown source; lost references require explicit repair.
7. Edit **Relations practice** for two free lines/circles/point. Shift-click two components and choose an offered compatible relation in Inspector. Try parallel/perpendicular/equal lines, point-on-line/midpoint, circle concentric/equal/tangent. Relations can restrict drag; conflicting relations are diagnosed and can be deleted. Arcs/trim/patterns are not part of this release.
8. Tools → **Parameter Manager**. Change document **SketchWidth** from `40 mm` to `60 mm`. Dependent width, centered rectangle, circle radius and bounded sample solid update: rectangle X −30…30 mm, circle radius 6 mm, solid depth 15 mm. `CircleRadius = doc.SketchWidth / 10`, `Depth = doc.SketchWidth / 4`; inspect scopes/dependencies/targets and Go to source. Bound dimensions link to the equation instead of allowing a contradictory literal edit.
9. Try `SketchWidth` as its own expression (cycle), `30 deg` for a length, or an unknown symbol. Each must report the problem and preserve the previous model. Try a component parameter with `local.Name` and document `doc.Name`. Expressions are unit checked, bounded and local.
10. Separate Parameter Manager or Model using the panel title control, edit in the child, return to the editor, close/reopen via Panels. Both windows use one project/session; camera ownership prevents stale snapshots interrupting alignment. Save, close and reopen the project: expressions, targets, placements, stable IDs and edits persist; older immutable versions remain unchanged.
11. Outside sketch, Reveal Origin/planes/axes through their dark context menu. Hover/select them directly in Model; rotate and verify references stay attached to the solid. Delete on a canonical reference removes its displayed item; View restore can restore it. Source-dependent features refuse unsafe deletion with a diagnostic.

## Validation and evidence

Domain tests include actual pinned planeGCS solves, independently computed residuals/DOF, typed expression/units/bounds, reviewed proposal parity, stale/cancel rollback, old 0.1.4 reader safe refusal and reusable worker restart. UI tests use actual clicks/keys/drag, current-only demos plus explicit historical fixtures, physical dimensions, target replacement, parameter bindings and separated panels. Prepared/public installation tests verify native persistence/Undo/Redo and immutable versions. Exact kernel, spatial mates, review protections, hardware rendering and five independently parsed vector PDFs remain regression gates.

Local GTX1650/Chrome156 measurement on the simple demo: warm preview p95 approximately 3.9 ms; release to document revision approximately 299 ms. These are observations, not a large-sketch performance promise; cold Wasm setup is separate. Final hardware/public-install reports contain raw measurements for the delivered commit.

## Boundaries

New profiles remain inside native format 1; older applications safely refuse them. No migration of old immutable versions, no remote geometry upload, no new provider integration. Equations drive existing sketch dimensions and the bounded probe through explicit independent bindings; E1.M5 provides general sketch extrusion. Full E3 sketch tools remain later. Publication does not merge main or imply owner acceptance.

[ADR022](../architecture/ADR-022-PARAMETERS-AND-SKETCH-WORKBENCH.md), [parameter grammar](../contracts/PARAMETERS_E1_M4.md), [plan](E1_M4_PLAN.md).

Local candidate evidence: 172/172 domain cases; relocated ZIP passed six corresponding-source archives, retained 29+28 numerical corpus, 44 semantic tools, native/review/drawing/history and M4 expression/geometry/rollback/Undo/Redo/save/reopen. [Measured hardware profile](../quality/E1_M4_PROFILE_V1.json). Final exact-commit CI/public-install evidence remains a separate delivery gate.

The complete local browser regression passed, including the actual Platform iframe with a separate authenticated Parameter Manager frontend. Hosted Model also passed F8 and double-middle reverse synchronization, child creation, parent numeric edits, save and return on the same project lease. Native detached windows include sketch/parameter styles. Final exact-head CI and fresh public-install identity remain external delivery gates.
