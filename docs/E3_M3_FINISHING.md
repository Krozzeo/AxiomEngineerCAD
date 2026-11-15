# E3.M3 — Finishing, multibody and reference construction / 0.3.9

The owner requested M3 together with the reference/pattern changes in this batch. Main/stable remain 0.2.6. Experimental delivery, owner milestone acceptance and manufacturing release are different states.

## Current demo

Load **E3.M3 Finishing Bracket** from Platform. Only this release's demo is advertised; previous user projects are preserved. E3.M1/M2 demonstrations are generated explicitly as historical acceptance fixtures.

The native part contains an L-shaped plate, three through-holes, a convex corner fillet, a chamfer, a separate cylindrical pin and a separate revolved cone. The unused **Reference practice** sketch contains a line and a semicircular arc. The initial exact material volume is **16266 + 291π = 17180.20346219463 mm³**, in **three bodies**. No drawing/manufacturing completeness is claimed for this multibody practice part.

Useful manual checks:

1. Open the bracket; orbit to see the bores, rounded corner, chamfer, cylinder and cone. Change Model's selection filter to Body to inspect individual bodies.
2. Enter **Reference practice** from a Features/View ribbon tab. Sketch opens automatically; exit and verify the original tab returns. Ordinary visible sketches are purple (#9859c8), independently of hover/selection colors.
3. Start Reference Plane. **Name** is first, followed by definition modes and Selection. Pick a cylindrical face; choose Center or Tangent and inspect the temporary plane before Apply. General regular curved surfaces offer their native representative tangent, not an invented center.
4. Start Reference Axis and pick the cone or a circular edge/sketch arc. Center is the default for analytic circular/cylindrical/conical geometry; Tangent is available where meaningful.
5. Create an Offset plane 10 mm from Front. In a second plane select Front and that offset plane: both rows switch to Midplane. Clicking either Midplane toggles the shared pair. A second nonparallel face infers Perpendicular/Angle instead of two incompatible coincidences.
6. Select the raised plane with Parallel, then the practice line with Coincident. The result passes through the line at Z=0 while retaining the face orientation. Angle/Perpendicular follow the same position-solving path. Angle has a local U/V rotation-axis toggle; the redundant Distance / angle caption is hidden.
7. Start Coordinate System and select the practice line. Try A, B and Midpoint. Select two/three model vertices and choose shared Midpoint. A circle/arc provides Center/Tangent. The direction buttons choose which coordinate axis follows the reference direction, reverse it and rotate the frame by quarter turns. Apply, save and reopen to check the retained frame.
8. Start Mirror Feature, Linear Feature Pattern or Circular Feature Pattern. Each has the same None/Unite/Subtract/Intersect selector as Extrude/Revolve. Linear/circular spacing buttons are the same shared widget used by sketch patterns. Toggle between Step and Total, use parameters, reverse direction and inspect the exact preview.
9. Edit **corner-fillet**. Later features temporarily roll back. Replace the Radius field's parameter with literal 3 and Enter; preview does not commit. Apply and check the regenerated material is **17167.327351998476 mm³**, still three bodies.
10. Start Fillet/Chamfer without a preselection, activate Edges and click a visible unique model edge. Enter a safe amount and Apply. An excessive radius must fail without changing the saved source. Escape/right click cancels the draft. Undo restores the previous valid model.
11. Disable **corner-fillet**. Its dependents become visibly disabled and are excluded from execution. Implicitly suppressed descendants have no independent Enable action; re-enable the source. A direct disable of a reference family retains its source rows and children.
12. Use a feature's context menu to Move earlier/later. Moving a consumer before its source is rejected without changing geometry or history. The independent practice sketch can move across the final solid feature. Save/reopen retains valid ordering and edits.

## Source and authority

Fillet/chamfer are `sketch-extrusion` history nodes with `form: finish`, a versioned `E3-finishing/1` payload and explicit unique edge references to the immediate preceding model. The inherited sketch identity supports the existing part-history contract; the human Inspector exposes Edges and Amount, not a fake second sketch. Amount may be a typed length parameter. Exact OCCT operations must produce valid closed solids, change material and preserve body count. Preview layers contain the actual added/removed difference, rather than recoloring the whole model. Manual and LocalProposal calls share the reducer, exact worker verification, revision checks and atomic persistence.

Finishing is bounded to the stable analytic edge witnesses already supported by the part model (lines and circular boundaries/arcs). General variable-radius blends, shell/draft and patterning a finishing modifier are not claimed. Earlier material-producing feature tools remain valid pattern sources. An unsupported/lost/ambiguous edge fails; transient mesh IDs never become source identities.

Repeat payloads with distribution/reverse/explicit Boolean use `E3-pattern/2`. Linear Total divides by count−1. Circular Total divides by count for a full ±360° turn, otherwise count−1. New explicit Booleans apply once to the aggregate copied tool; None retains separate bodies. Legacy source without explicit Boolean retains its original per-tool policy. Preview applicability and remembered automatic None fallback share the Extrude/Revolve implementation. Invalid/empty/no-op operations remain rejected.

`feature.reorder` swaps adjacent history nodes only when all consumers still follow their dependencies. Suppression changes execution, not the retained source graph; blocked dependents remain visible with their cause IDs. Editing a suppressed reference does not enable it. Referenced deletion and invalid reordering preserve the original document. Source/dependency diagnostics beyond these bounded checks continue in E3.M4.

## Typed reference geometry

`E3-reference/3` carries extended relations, plane angle-axis and coordinate orientation. Earlier source profiles remain readable; older readers reject new profile semantics rather than silently ignoring them. The explicit definition method, child deletion flags and dependent identities retain their 0.3.8 behavior.

Plane construction separates normal/orientation constraints from position constraints. A second coincident line/point locates the plane; the first face no longer fixes its origin when its relation is only Parallel/Angle/Perpendicular. All selected constraints are verified against the resulting frame. Shared midplane requires two parallel planes; impossible combinations fail. Coordinate frames use the first anchor, point midpoints where selected, and subsequent supported directions to establish a right-handed basis; explicit conflicting directions are rejected. This is a bounded geometric constructor, not a general nonlinear 3D datum solver.

Model faces expose conservative exact witnesses. Cylinders use native OCCT analytic data. The pinned Wasm build does not bind gp_Cone; cone axis/apex/angle are therefore derived from verified native iso-V circles on a kernel-classified CONE, with coaxiality and radius-linearity checks. Spherical centers/radii use native surface evaluations and independent additional checks. These evaluations are of the exact surface, never display triangles. If an analytic center cannot be verified, the face remains available as a general tangent reference rather than acquiring a fabricated center; singular representative points use another regular sample or remain unreferencable. Circular edges/arcs use the existing kernel-proven circular witnesses. Planar geometry retains the established planar support policy.

Center means a circle's center, a cylinder's finite axial midpoint, or a cone's apex/axis reference. Axis direction is independent of the arbitrary origin of its infinite line. Tangency to a general surface uses a regular representative native parameter point; it does not solve every possible free tangency branch. Picked contact-point editing and a general spatial constraint solver are outside this batch. Plane and coordinate orientation defaults are reviewable, with explicit controls. Curved faces are selectable for datum construction; a sketch still requires a planar support, including a constructed tangent plane.

Model references retain exact geometry witnesses and require repair if those witnesses change or disappear. This batch does not claim universal topological lineage across arbitrary B-Rep edits. Missing source geometry, degenerate normals/points, incompatible units and wrong part/occurrence are rejected. The API panel provides separate Finishing, Reference Geometry and Feature Patterns chapters plus live command schemas.

## Evidence and delivery

`tests/m3-references.test.mjs` covers combined orientation/location, shared inference, rotation-axis toggle, line endpoints/midpoints, coordinate directions, native cylinder/cone/sphere/trimmed-cylinder references and forged witness rejection. `tests/m3-finishing.test.mjs` covers independent single-edge prism volume oracles, invalid radii, suppression/reordering, all explicit pattern Booleans, full/partial circular ranges, current bracket volume/body oracle and suppressed reference recovery.

`tests/browser-m3.mjs` exercises actual Model picking, curved faces and sketch arcs, relation buttons, midplane inference, coordinate persistence, shared pattern controls, manual finishing creation/Undo/edit, visible suppression impacts, safe order checks and save/reopen. Full retained Windows/Linux native/browser and independent PDF checks remain required on the frozen source. Public Platform discovery/download/hash/install/activate/launch and real GPU verification remain required before delivery. Final evidence belongs to that immutable commit's delivery artifacts; local checks do not assert publication or owner acceptance.
