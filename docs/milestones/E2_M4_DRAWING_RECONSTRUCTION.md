# E2.M4 drawing-to-model reconstruction

The bounded input is a flat A4 SVG in mm at 1:1 with tagged top/front rectangles, one circular through bore, both hidden bore edges, and explicit width, height, depth, bore diameter and bore center dimensions. The original source is preserved with SHA-256 and semantic references. Evidence extraction checks actual SVG geometry against those values. Missing, conflicting or duplicate inputs raise a clarification question. This prototype supports the supplied SVG profile, not general SVG, PDF, raster or multimodal interpretation. No provider is involved.

The local agent creates a draft containing an editable constrained sketch and native extrusion in an empty native part. The worker reprojects the exact solid and compares its outlines, bore circle and both hidden edges against the source. Human review shows maximum deviation and the source dimensions. Apply & Save is revision-checked and atomic, using the existing proposal workflow.

## Owner test

1. Install and load **E2.M4 Drawing Reconstruction**. Open **Tools → Review proposals**.
2. Click **Propose model from drawing** to use the sample, or download the sample and select it in **Orthographic SVG**. Choose **Validate proposal → Review changes**. Check **48 × 32 × 12 mm**, bore diameter **8 mm**, center **18 × 12 mm** and zero reprojection deviation.
3. Approve **Apply & Save**. Inspect the sketch and extrusion in **Model**, or export the regenerated view via **Drawing → Drawing → Download vector PDF**. Close and reopen to verify the saved source and native geometry.
4. In a fresh demo, remove the text line tagged `data-dimension="depth"` from the sample and select that SVG. The review panel requests the missing depth and the model remains empty.

## Verification

The domain tests cover the accepted exact fixture, source identity, editability, invalid and ambiguous inputs. The installed browser flow verifies file upload, human approval, PDF generation, and save/reopen. Independent PDF parsing verifies A4, outline dimensions, vector bore and both hidden lines.
