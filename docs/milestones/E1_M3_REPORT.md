# E1.M3 — Parametric sketch editor, candidate 0.1.4

**State: review candidate; final validation and delivery gates pending. Publication, exact-head CI and fresh public install are still required.** No owner acceptance is implied. Branch: `engineer/e1-m3-sketch-constraints`, based on delivered 0.1.3 / `12e15623b3b9474cdce6a6a95f13c1de06b867bc`.

## Owner review guide

When the installation is published, activate 0.1.4 in Platform and choose **Load Demos → E1.M3 Parametric Sketches**. Earlier user projects remain intact; only the current demo is advertised.

1. In Manager, right-click **Layout sketch → Edit**, or double-click it. Alternatively select it, then **Sketch → Edit sketch**. There is no sketch dropdown. Model remains visible, the camera aligns smoothly to Front (XY), and the Sketch ribbon opens automatically.
2. The rectangle consists of four independently selectable black lines, connected by coincidence and horizontal/vertical relations. The blue circle can move; its radius is constrained to 4 mm. The construction centerline can also move. The whole sketch initially has six DOF, although the rectangle and origin point are fully defined.
3. Hover and select a line, endpoint, midpoint or circle center. Orange means preselection; selected edges/points use #0000ff. Selection wins over hover. Inspector shows exactly the current feature, component or relation. Select a relation to highlight its participants, and delete it from Inspector.
4. Drag the circle center, then a free centerline endpoint or its segment. Remaining permanent relations must still hold. A segment translates with its initial orientation when unconstrained; moving an endpoint holds the opposite endpoint as a temporary target. Fully constrained geometry remains stationary.
5. Select the circle curve, add a **Radius** dimension, or select an existing driving dimension and update its value. The **Diameter reference** is measured and cannot drive geometry. Conflicting dimensions show red diagnostics and keep last-good coordinates; deleting the conflicting relation repairs the sketch. Missing participants produce green lost-reference diagnostics rather than silent rebinding.
6. Fix both construction-line endpoints and the circle center using **Fix point** to remove their remaining DOF. The resulting geometry must become black with a fully defined status. No arbitrary point is fixed merely by creation.
7. Orbit with middle drag, pan with Shift+middle, and zoom about the cursor. **F8** or a double middle click smoothly returns to the active sketch support plane. Editing the **Top face sketch** aligns to its actual planar face; Inspector identifies the producer, role and frame.
8. Use Point, Line, Circle and Rectangle from the Sketch ribbon. A new rectangle produces four lines with preset relations. Save, close and reopen; IDs, planes, relations and coordinates must survive.
9. Right-click a sketch/reference for **Hide / Reveal**. Hidden references/sketches remain visible while selected or preselected. **Delete** checks dependent features. Canonical reference display entries can be restored with **View → Restore reference entries**; this does not remove the document's mathematical coordinate frame. Right-click or double-click a supported extrusion/probe feature for its driving-operation editor.
10. **File → Undo / Redo**, Ctrl+Z/Ctrl+Y or the topbar Undo icon restore working changes with advancing revisions. Text fields retain ordinary text editing shortcuts. Immutable saved versions and publications remain unchanged. Undo history is bounded and session-local.
11. Separate Model from the dock controls. The child keeps the Sketch ribbon and the same live document/session; select/create there, edit numeric fields in the parent Inspector, then return the window. No second project lease is created.

## Domain and compatibility

The strict `E1.M3-sketch/1` feature profile stores source relations, stable participant roles and literal dimensions. Opening an M2 sketch for editing explicitly upgrades its working profile, expanding its rectangle primitives; immutable M2 snapshots are retained. Delivered 0.1.3 refuses the new profile without writing. Native envelope 1, exact kernel/solver/dependency pins and Platform SDK 0.1.12 remain unchanged. Optional containing-tab branding still uses the separately delivered Platform 0.1.13 bridge.

Manual actions and headless tools share the same revision/dependency-checked, cancellable worker command path. PlaneGCS solves actual source relations; independent residual/rank/nullspace checks derive DOF and entity/point mobility. Reference dimensions never enter driving equations. Source and diagnostics are paged; pointer targets are temporary and never saved as permanent relations. A solved sketch whose stored coordinates violate its driving relations is refused by rendering/version verification.

## Current validation evidence

- Complete local domain regression: 150/150 passed, including 14 M3 solver/history/proposal cases and two visibility sidecar/security cases. Delivered-reader refusal, midpoint binding, point mobility, tampered coordinates, legacy Undo and human-reviewed isolated agent edits are covered.
- Focused actual NVIDIA/Turing WebGPU checks pass integrated Model editing, solver colors, real pointer drag, conflict creation/removal, F8, context visibility and Undo/Redo, with no page/device errors.
- Historical M2 UI checks pass upgrade, all primitive tools, four-line rectangles, numeric/construction edits, invalid/stale refusal, delayed-read draft preservation, immutable history and save/reopen.
- Separated-panel checks now pass on actual hardware and the bundled browser, including child creation and parent numeric edits. The relocated prepared package passes retained 57 numerical cases, M3 driving/drag/Undo/Redo/save/reopen, seven-class headless selection, native/proposal/vector/history and six corresponding-source archives. Physical GPU workbench regression also passes at 1650×1050 and 1440×960. The datum pixel fixture uses the same canonical plane’s left edge to avoid the view cube in narrow layouts. Full final browser, exact-head CI and public-install gates remain pending; earlier failed runs are not reported as passing delivery.

## Bounds and scheduled follow-up

64 entities and 128 relations per sketch, at most 16 editable sketches, existing native/worker/closure bounds. Large pointer previews may be explicitly unavailable under the compact response budget; final commits still validate the full source. Feature deletion refuses unresolved dependents and retained E0 fixed-contract feature chains.

Custom plane/axis authoring, arcs/extended sketch tools, expression parameters and arbitrary sketch-to-extrusion regeneration remain at E1.M4/M5 and E3. Editing a driving sketch dimension in this milestone does not claim that the retained E0 probe solid is generated from that arbitrary sketch. No remote model/provider quality or manufacturing acceptance is claimed.
