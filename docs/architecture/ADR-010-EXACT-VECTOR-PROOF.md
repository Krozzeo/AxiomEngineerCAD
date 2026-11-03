# ADR-010 — Exact HLR and bounded vector drawing proof

Status: Experimenting, E0.M6, 2026-10-30; owner acceptance pending. Requirements CAD-R017/018. Unchanged replicad1.2.0 / OCCT V8_0_1; no new runtime dependency or scope change.

## Choice and boundary

Use actual OCCT `HLRBRep_Algo` through replicad `makeProjectedEdges`, not polygonal HLR, a GPU screenshot or hand-authored approximate outlines. [OCCT HLR reference](https://occt3d.com/dev/doc/refman/html/class_h_l_r_b_rep___algo.html). A small original vector emitter supports verified straight lines and full circles on one A4 portrait sheet, top/front/right third-angle views, scale1:1 and a width reference dimension. Larger PDF libraries were unnecessary for this bounded proof; authored multi-sheet drawing tools remain E2/E5.

The shared exact recipe is regenerated and validated before projection. Same-domain display simplification must preserve exact volume and area. The bounded plate profile suppresses coincident rear boundaries, collapsed circular end-curves and cylindrical seam edges. Every retained hidden silhouette must originate in HLR and pass independent expected positions/counts; missing silhouettes fail, never get reconstructed by the renderer. This filtering is specific to straight through-hole plates, not a general HLR algorithm replacement.

SVG uses native vector lines/circles and escaped literal text. PDF uses stroked lines, Helvetica text, correct mm→point transform/xref and sixteen cubic segments per circular path. PDF circles are a bounded vector approximation of exact analytic HLR circles; declared radial tolerance0.0001mm, independently measured fixture deviation about0.000000213mm. No raster images, scripts, actions or imported PDF code. Non-ASCII title glyphs use explicit '?' fallback in this English technical proof; font embedding/localization remains later work.

## Association and persistence

The generated drawing binds document/producer identity, definition-local dimension, full content hash and current working revision. Model/metadata changes invalidate the preview and export. Human `DownloadLocalPDF` requires the exact current manifest/revision, no pending fields and a durable redacted audit checkpoint. Browser cancellation does not mean a file was saved: receipt says prepared for local download. Agent grants cannot use this endpoint. Operation replay returns its retained preparation receipt rather than performing a new export.

The probe's layout and width binding are fixed by versioned code; they regenerate after ordinary native save/reopen. It is not a saved authored drawing sheet or final drawing schema. Existing native format1 drawing/version records remain compatible and unchanged. E0.M7 must prove integrated association/history; E2/E5 extend authored persistent sheets, annotations, sections/BOM and standards. The exported sheet is explicitly a geometric review draft, never an unattended manufacturing release.

## Evidence

14 new domain tests include mm/cm/m/inch, 1/2/4 holes, measured dimensions/volume/hidden lines, hostile text, cancellation/stale export and actual HTTP authorization. Browser changes width40→60, refuses old proof export, downloads both PDFs and regenerates after save/reopen. Independent pinned pypdf/pdfplumber readers inspect page dimensions, text, strokes, cubic deviation and zero raster images; PDFium renders PNGs for visual review. QA packages are external test tools, not product dependencies. Exact files, raw reports and screenshots are in E0_M6 evidence; remote CI/release provenance is recorded on the PR/release.
