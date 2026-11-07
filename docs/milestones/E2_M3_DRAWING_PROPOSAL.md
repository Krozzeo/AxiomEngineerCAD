# E2.M3 reviewed model-to-drawing proposal

The local agent tool `cad.drawing.layout.set.v1` accepts an extrusion ID, A4 orientation, top/front view set and compatible width/depth dimensions. The source scope remains the supported single XY extrusion from E2.M2. A drawing layout associates with the live feature ID and regenerates exact OCCT projections from the selected source. Older strict readers can refuse documents after applying a layout; existing documents and immutable versions retain their prior shape.

The existing proposal worker validates exact before/after sheets and binds PDF checksums, view geometry counts, sheet size and dimension values to the review. The agent cannot modify MAIN or export via human endpoints. Review and Apply & Save use the existing human authority, complete diff review, revision checks and atomic persistence. The demo uses a deterministic local script. Real model/provider behavior remains unverified and no source is sent to a provider.

## Owner test

1. Load **E2.M3 Drawing Proposal**. Open **Drawing → Drawing** to see portrait A4 with top and front views and width/depth.
2. Open **Tools → Review proposals**. Choose **Propose drawing layout (local script)**, wait for Draft, then **Validate proposal** and open the review.
3. Check the before/after sheet, views and depth. Leaving the proposal pending or cancelling preserves the original. To accept, check the review confirmation and choose **Apply & Save**.
4. Reopen **Drawing**. It shows landscape A4 with the front view and its 10 mm depth dimension. Download the vector PDF. Close and reopen the project to confirm the association was saved.

The automated corpus verifies isolated edits, forbidden agent Apply, stale/cancelled proposals, saved layout, and the real PDF. The browser fixture uses the published demo source and the independent PDF verifier checks the resulting page size, strokes, hidden geometry and dimensions.
