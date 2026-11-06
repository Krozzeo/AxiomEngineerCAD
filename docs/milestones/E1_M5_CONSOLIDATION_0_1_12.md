# E1.M5 consolidation - CAD 0.1.12

Owner-requested consolidation before E2. Only **E1.M5 Extrusion & Sketch Workbench** is advertised; existing projects and immutable versions are preserved. See [ADR027](../architecture/ADR-027-EXTRUSION-REFINEMENT-AND-SKETCH-REFERENCES.md).

| Change | Observable result |
| --- | --- |
| Exact additive refinement | A new pad flush with a plate side is one solid, with merged compatible faces and unchanged material volume/area. History still contains both features. |
| Seam policy | Smooth internal divisions and cylindrical seams are omitted from Model drawing, hover and overlap choices. Older source identities remain available for validation. |
| External Snap | Both construction points preselect supported source geometry and can attach real point/curve relations in one command. Ctrl bypasses Snap but preserves preselection. |
| External constraints | Implicit source entities are read-only; mixed constraints can drive local sketch geometry. Converted entities remain normal editable geometry. |
| Convert Entities | The command seeds its review table from valid existing external selections, and commits only with Apply. |
| Circle grip | A perimeter drag adjusts free radius when the center is defined. Free circles retain their existing translation grip. |
| Dimension source | Icon beside Value opens the exact Model dimensions or Equation bindings row. |
| Extrusion Depth | A searchable value field selects its content at entry and after Enter. Numeric and parameter choices affect the preview; Apply writes extrusion and binding in one Undo step. |
| Context menu | Left click outside the Model menu closes it during sketch editing. |

Verify a flush-sided pad, a cylindrical hole, both external Snap clicks and Ctrl bypass, an inherited sketch support, a fixed-center circle, both Value source destinations, numeric/parameter Depth preview, Apply, Undo/Redo, parameter regeneration and Save/Close/Reopen. Use the current demo or a test copy; do not overwrite earlier user projects.

Focused domain and human UI checks precede exact-head Windows/Linux browser/domain/PDF acceptance, immutable ZIP/manifest publication and actual public Platform discovery, install, activate, launch, GPU and independent PDF verification. Final evidence is recorded on PR18 and in delivery artifacts. Owner acceptance and E2 progression are separate.

## 0.1.14 follow-up

- Extrude an overlapping profile into the plate. The concave intersection edge and its real endpoints are visible and pickable on the resulting solid.
- Preselect and select the cylindrical hole wall. Its analytic seam and artificial endpoint stay out of the viewport highlights and pick list.
- Edit an earlier extrusion with preview enabled and disabled. Later features and sketches are absent during the edit and return when it ends. Cancel preserves the original operation.
