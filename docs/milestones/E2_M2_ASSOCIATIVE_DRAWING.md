# E2.M2 minimal associative drawing

The current profile generates one A4 sheet on demand from a single sketch-based extrusion normal to XY. The top and front views use OCCT hidden-line removal on the exact solid. Straight edges and complete circular boundaries are supported. A full circle split by projection into two opposite semicircles is emitted as a single circle. The sheet is regenerated from source and does not require a schema migration. Drawing export uses the current proof manifest, and editing invalidates stale export.

The width is measured from the projected geometry. The depth dimension follows the extrusion depth and records its parameter ID when bound. Values are in mm, with automatic supported scale. The PDF is vector and intended for geometric review.

## Owner test

1. Install and load **E2.M2 Associative Drawing**. In the ribbon choose **Drawing → Drawing**.
2. Check the top view, front view, the hole circle and its two hidden lines. Verify the **40 mm** width and **10 mm** depth and download the vector PDF.
3. Change **StockDepth** to **17 mm** in Parameter Manager. Reopen Drawing to regenerate from the new revision. Confirm the new depth dimension and the changed front view.
4. Try a chain of additive extrusions. The drawing reports that the profile is unsupported; Model continues to open the exact solid.

Additional views, drawing placement tools, sections, annotations, multiple sheets and general operation chains are outside this profile. E2.M3 begins the reviewed AI model-to-drawing workflow after E2.M2.

## Verification

Domain tests verify the exact hole outline and silhouettes, width/depth binding, regeneration and stale export. The browser test generates and downloads the current demo sheet. The independent PDF verifier parses and renders the actual downloaded vector PDF.
