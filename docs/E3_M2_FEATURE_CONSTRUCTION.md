# E3.M2 feature construction — 0.3.7

This owner-requested batch refines E3.M2. Owner acceptance of the stage remains separate from publication.

## Try the delivery

In Axiom Platform load **E3.M2 Feature Construction**. Its base, separate solid and joining bridge finish at 14,000 mm³. The history demonstrates a retained separate solid followed by Unite. It includes an unused closed **limit-practice** sketch, a plane 20 mm above Front, a reference axis and a translated coordinate system.

Open Extrude without selecting anything, then pick **limit-practice** in the Manager or Sketch table. Choose **None**, set From to **Symmetric Value** and enter 2 mm. Apply creates a second body and the total material volume becomes 14,144 mm³. Save/reopen retains the operation. A new plane offset 7 mm from Front can support a new sketch with its origin at Z = 7 mm.

## Shared interaction

Feature and sketch operations use `operationPanel`, `operationSelection`, `operationValue` and the existing searchable stable-ID selector. Construction can start with empty tables. A valid current selection seeds the operation. Click a table to choose its input, pick geometry from Model/Manager or search the selector, and remove individual entries or clear the table. The active table's entities remain highlighted. Mirror and both pattern commands share a medium column. Cancel feature shares Cancel draft's icon and ribbon position. Build, Cancel build and Source occupy the rightmost medium column.

Extrude and Revolve each expose None, Unite, Subtract and Intersect. The first feature permits None. None retains a distinct closed solid, including overlapping material as separate bodies. Unite must touch at least one existing body. Subtract can split a body, and Intersect retains positive common material. A fully empty result is rejected atomically. Multi-solid scenes expose individual body witnesses and picking. These are part-local bodies, with general assembly occurrences following their own workbench.

The sketch, revolution axis, mirror plane, pattern direction/axis and limit references are saved as dependencies. Axes may be straight sketch lines, straight model edges or reference axes. Mirror accepts a plane or planar model face. Patterns can carry multiple source feature tools. Editing the operation rolls back its downstream history.

## Limits and reference geometry

From and To support Value, Until Next, Until Selected, Offset from Selected and Through All. Symmetric Value on From hides To and applies the entered amount on each side. Numeric limits and offsets can use typed parameters. Revolution values are angles. Extrusion values are lengths. Reverse is an icon beside the value field. Enter or blur updates the draft preview, and Apply commits the operation.

Selected planar extrusion limits trim with exact plane splitting, including tilted planes. Through All uses an enclosing span derived from the current model. Until Next and body limits bracket first contact or first exit using exact B-Rep intersections and solve to 0.000001 mm or 0.0000001°. A start section already crossing the target is ambiguous and requires a selected face. Missing contact, parallel extrusion end planes, incompatible axes and invalid/empty results report an error. Numerical contact tolerance is distinct from an analytical plane/angle solution.

Planes, axes and coordinate systems use one to three reference tables. Available relations depend on the selected geometry. Plane constructions include offsets/angles from planes, a plane through three points, planes containing lines, perpendicular planes and midplanes. Axes include existing straight directions, plane normals, two points and two intersecting planes. Coordinate systems use an origin plus optional directions or points to define right-handed axes. Contradictory relations and degenerate directions are rejected. Preview geometry is temporary and never establishes native identity. Model face/edge/vertex references retain conservative exact witnesses and require explicit repair when those witnesses disappear. This delivery does not provide a general nonlinear 3D datum constraint solver.

## Sketch responsiveness

The editor reads one revision-matched document snapshot plus bounded metadata rather than paging through every entity and constraint after each action. Independent local diagnosis and Model refresh run together. The central-difference Jacobian evaluates only relations that touch the perturbed entity, and point mobility projects only its own coordinates. Solver results and completed native verification are cached by content hash within bounded process-local caches. Changed content, rollback, source geometry and solver options receive distinct keys, and failed verification is never cached as valid. Point, line, circle and rectangle construction accepts queued physical clicks and paints provisional geometry immediately. Native commands remain ordered, keep individual Undo entries and coalesce intermediate Model refreshes. Finishing the queue refreshes the current proof. Commands retain authoritative numerical validation and atomic source revisions. Measured interaction timings and final exact-commit publication evidence belong in delivery artifacts.

## Verification

Focused domain cases cover four booleans, body counts, signed/symmetric/parameter limits, exact contact entry/exit, datum axes, selected angular limits and sketch supports. Browser acceptance constructs an operation from empty tables, applies None and symmetry, creates a referenced plane, uses it for a sketch, cancels a feature and saves/reopens. Historical E3.M1 and E3.M2 fixtures remain acceptance-only. The public release advertises only the current construction demo.

## 0.3.6 construction corrections

An operation stays highlighted in the ribbon until Apply or Cancel, independently of Model selection. The feature inspector is exclusive while constructing; source Selection/Details stays hidden. A new operation or sketch edit cannot replace an active feature draft. Sketch transform, conversion and equation drafts also prevent starting a solid feature.

Geometry tables have no search input: activate the table, then pick compatible geometry from Manager or Model. The active table filters incompatible overlapping candidates. Sketch source picks work in both places. Changing Value or Symmetric Value selects the numeric contents for immediate replacement; Until Selected and Offset from Selected activate their geometry table. Feature values match the adjacent 32px icon controls. Boolean icons use outlined overlapping regions matching the owner's reference.

All relevant committed changes rebuild the preview, including Boolean, sketch source, limit mode, numeric/parameter value, direction and selected reference. Incomplete tables remove the old preview and disable Apply. The exact source model retains its selectable manifest during an operation preview; the ghost layer never writes picking IDs or introduces native references. None is yellow, Unite retains the existing tint, Subtract is red and Intersect orange. Apply, PDF export and provider sharing retain their separate source/review checks.

Until Selected accepts supported datum planes and exact planar model faces; parallel limits, coplanar zero-depth results and other invalid material still reject safely. Regression evidence covers physical Model picks with a ghost over the source, Manager plane selection, source replacement, field focus, exclusive construction, all four colors and existing native/croquis/save workflows.

Physical feature picking in CI uses the complete pinned Playwright Chromium with an explicitly labelled SwiftShader context, following [Chromium’s WebGPU test configuration](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/web_tests/FlagSpecificConfig). The headless-shell no-GPU corpus remains separate. Public-install verification uses actual Chrome/NVIDIA without forced software rendering. An unavailable renderer is an explicit failure for the physical construction suite.

Linux software canvas tests use the shared ANGLE/Dawn Vulkan configuration reported for [Chromium issue 575926500](https://issues.chromium.org/issues/575926500); forcing a separate WebGPU fallback adapter caused device loss without validation errors. These switches belong only to the acceptance harness, and do not change production browser settings.

## 0.3.7 edited limits, Boolean applicability and revolution axes

Selection groups the source Sketch/Axis tables. Boolean and From/To controls share their heading line. Only the main Boolean, Limits and Preview sections have separators; nested limit rows do not. Section headings use stronger type. Reference and pattern selection tables share the same grouping and analytic line picking where applicable.

During solid editing, the selectable scene is the native history immediately before that operation; the active result is a display-only ghost and downstream features stay rolled back. For the first solid there is no previous body, only source sketches and datums. Turning Preview off hides the ghost; the read-only candidate still evaluates exact geometry and applicability. No ghost receives selection IDs. Until Selected and Offset from Selected therefore pick faces owned by an earlier producer, without a self-dependency. The original source remains unchanged until Apply.

From and To are material boundaries whose numeric order may be reversed, for extrusion and angular sweeps. Selected planes and offsets are assigned to their physical lower/upper side, then trim the exact tool; profile-enclosing ranges cover tilted limits. Zero thickness and sweeps exceeding 360 degrees still reject. Numeric extrusion cap identity follows the physical lower/upper cap, retaining reference semantics when bound order changes.

Read-only previews evaluate exact tool/base intersection and joining capability. When the preferred Boolean cannot produce its valid material result, the candidate uses None, disables unavailable modes and preserves the preference. Returning to valid contact restores that choice. Face-touching Unite is distinguished from positive-volume overlap needed by Subtract/Intersect, and an empty subtraction remains unavailable. Apply records the actual explicit operation and an optional `booleanPreference` editing hint. The hint survives save/reopen and re-edit; it does not silently change an already saved Boolean during unrelated regeneration. Direct semantic commands retain strict Boolean validation. Older strict readers may reject the new optional source field.

Revolve uses `axisReference` for datum axes, straight model edges and analytic sketch lines. A legacy `axisId` is sent only for a sketch line and is never an empty string. Model sketch-line picks resolve through the current server-owned manifest; they are offered when an active construction table accepts them, preserving normal whole-sketch selection otherwise. The axis must still lie in the profile plane and the profile cannot cross it.

The demo now includes **revolve-practice** and its construction line **practice-axis**. Try an empty Revolve, choose its source and Axis table, and pick a datum, a straight model edge or the construction line in Model. For reversed Extrude limits use limit-practice with None, From 10 and To -10: the material total is 14,720 mm³. For automatic fallback move both bounds above the model, then return them to overlap; the original Boolean is restored. Regression coverage includes the edited-face and offset paths, persisted preference, reversed angular bounds, all three axis sources, explicit Apply and unchanged source during previews.

Cancellation tracks issued preview HTTP acknowledgements separately from queued draft tasks. Closing invalidates queued drafts, drains actual in-flight acknowledgements and retires server work before restoring the source. The delayed-response regression includes a second rapid value change before Escape and asserts unchanged source and no early source rebuild.
