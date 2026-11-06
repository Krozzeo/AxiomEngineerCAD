# E2.M1 semantic geometry and bounded visual evidence

Owner-requested 0.2.0 candidate. Exact geometry and query identities continue to use the stable definition, producer, role and occurrence path contract. Existing document, parameter and feature queries remain paged. New read-only `cad.viewport.capture.v1` resolves one face or edge through the same real kernel worker and returns exact semantic measurements with a definition-local, bounded 320 px SVG. The SVG uses display tessellation and includes model revision and content hash. A normal projection is preferred when available; other targets use a fixed oblique projection. Large, stale and unresolved targets fail explicitly. Capture works without browser or GPU and stays local under existing tool authorization.

## Owner test

1. Load **E2.M1 Semantic Geometry & Evidence**. Select a plate face or edge in **Model**, then choose **Download selection evidence** in **Inspector**. Check the area or length in Inspector and open the SVG. Its source revision is in the filename and its content hash is in the SVG description.
2. Turn on **View → Reference planes & axes**. Right-click a reference in **Model** and choose **Hide**. Reveal it from the Feature Manager. A displayed sketch supports the same Model action.
3. Edit the plate profile or an earlier extrusion in a feature chain. Later rows use the disabled appearance and cannot be enabled or edited until you leave the edit. Previously suppressed rows keep their original state.

The exact viewport and local visual evidence are available for sketch-based extrusions. Associative engineering sheets and PDF for this model family remain E2.M2 scope.

## Verification

`tests/workbench.test.mjs` compares evidence to direct semantic queries on the exact demo, checks numeric area/length, validates provenance and rejects stale or missing targets without writing source. The consolidation browser flow covers local evidence download, Model Hide, temporary tree state, preview recovery and save/reopen. Exact-head CI, publication and installed results are recorded separately.
