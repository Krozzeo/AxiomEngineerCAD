# E0.M7 — Integrated foundation proof (0.0.7)

Date:2026-10-31. Review candidate; **owner Go / Redesign / Stop pending**. Owner validated M6 and authorized M7. Experimental publication does not merge main or start E1.

One portable native document connects stored constrained sketch → actual extrusion → top-face-dependent hole → geometry-derived cap plane mate → associative A4 vector drawing → isolated proposal/full human review → atomic save/reopen. Manual and agent work share the same typed dimension command. No mock solver, mesh-derived volume or remote provider is involved.

Initial width40/height30/depth10/radius3mm gives11717.256661176916mm³. Manual depth15 moves cap toZ15 and gives17575.88499176538mm³. Reviewed width60 gives26575.88499176538mm³. Sketch is FullyDefined/0DOF; the plane mate retains3 DOF with residual <1e-6mm. The retained baseline remains40/depth10; its drawing can be rendered/exported without changing working state. Drawing views show the primary plate; the model viewport also displays the mated cap.

## Owner test

1. Install/activate experimental0.0.7 in Platform; **Load Demos → E0.M7 Integrated Foundation Lab**. No manually created new project is needed.
2. **Build from model**. Inspect all five stages. Top view lets you select plate and raised cap. Choose Drawing and download vector PDF.
3. Thickness15 → **Apply driving dimension → Save document → Build from model**. Observe capZ15, width40 and taller front/right views.
4. **Open proposal review**; width60 → **Run local scripted proposal → Validate proposal → Review changes**. Inspect all changes/evidence, check approval and **Apply & Save**. Rebuild: width/sketch/drawing60, capZ15.
5. Source **Retained1 → Build from model** previews original40/depth10 read-only. Export historical PDF. Return Working model, rebuild, close/reopen; current60/depth15 persists.
6. Review [ADR012](../architecture/ADR-012-INTEGRATED-E0-GATE.md) and choose Go / Redesign / Stop. E1 begins only with owner approval.

## Verification and boundaries

100 local domain tests pass:85 retained+15 integration cases. Includes actual archived0.0.6 decoder, unknown profiles, broken dependencies, forbidden legacy bypasses, agent/stale/cancelled Apply, offline portability and actual writer termination at both WAL boundaries. Browser proof uses real Platform Hub and full human UI. Hardware proof uses Chrome156/NVIDIA GTX1650 driver32.0.16.1692 without unsafe-WebGPU flags. Independent pypdf/pdfplumber/PDFium parse/render initial/current/historical A4 PDFs: width40/60, depth10/15,4 hidden strokes,16 circle cubic segments, radial deviation2.127e-7mm, zero raster/action payloads. Physical/software/unsupported GPU results are labeled separately.

Four explicit feature-profile decoders extend native1; new studies need reader0.0.7. Existing native0/1 files remain readable unchanged; old readers safely refuse unknown profiles before writes. No implicit conversion. General sketch/feature/assembly/drawing editors, arbitrary topology/imports, real AI quality and manufacturing release remain later work.

[Plan](E0_M7_PLAN.md), [ADR012/risk ledger](../architecture/ADR-012-INTEGRATED-E0-GATE.md), [corpus](../quality/E0_M7_ACCEPTANCE_CORPUS_V1.json). Raw local reports/screenshots/PDFs: evidence/E0_M7. Exact final commit/Windows-Linux CI/public ZIP hash/actual public Platform installation proof belong to the delivery PR and immutable experimental release; local evidence does not replace that gate.

Five isolated initial proof workers took591.8–608.9ms wall time and174.9–177.2MB peak RSS on the recorded local machine. These observations are not hard OS memory quotas or general device guarantees. Browser proof also passed with explicit unsupported-GPU fallback (zero page errors), independently of physical hardware proof.
