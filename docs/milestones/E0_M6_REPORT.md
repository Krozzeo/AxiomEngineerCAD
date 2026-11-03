# E0.M6 — Drawing, hardware selection and security proof

Date: 2026-10-30. Software **0.0.6 experimental**, Master v0.2.0. Owner authorized progression after delivered E0.M5 / PR5 head4f542802f47e585870edf517819a92eed5fd3fd7. Review candidate; no main merge, final schema acceptance or owner E0 Go implied.

## Delivered experiment

- Actual exact-kernel HLR top/front/right views, A4 portrait vector PDF/SVG, width reference dimension and revision/hash-bound source. Width40→60 invalidates stale export, regenerates and survives ordinary save/reopen. Fixed regenerable proof layout; authored persistent sheets, arbitrary surfaces and manufacturing approval remain later gates.
- Original WebGPU color/depth/integer-ID renderer over real exact-kernel tessellation and supported edge roles. Explicit Select/Orbit/Pan, orthographic standard views/fit/zoom, server-resolved face/edge/occurrence IDs and visible selection. No GPU IDs become persistent references.
- Native **E0.M6 Drawing & GPU Lab** in Platform Load Demos: one perforated plate and two independently placed instances sharing a definition. Earlier demos/lifecycle/reference/recovery/proposal workflows remain available in expandable panels.
- Human-only local PDF preparation, bounded exact/current selection, Local-only refusal and selected-context sharing preview with zero provider dispatch. Redacted durable audit; no provider/account/credential implementation duplicated.

Architecture details/limitations: [ADR-009](../architecture/ADR-009-WEBGPU-CAD-PROOF.md), [ADR-010](../architecture/ADR-010-EXACT-VECTOR-PROOF.md), [ADR-011](../architecture/ADR-011-LOCAL-EXPOSURE-PROOF.md). [Proof API schemas](../contracts/PROOF_API_V1.json), [measured profile](../quality/E0_M6_PROFILE_V1.json).

## Local evidence

Windows x64, Node v24.21.0. **85/85 tests**, no skips/failures; 14 new M6 tests retain all 71 previous tests and 29 geometry/2D +28 spatial cases. M6 tests execute actual OCCT projection and analytic oracles, unit conversion, multi-hole curves, typed roles/occurrences, actual HTTP, stale/busy/cancel/close, human/export/origin/agent denial, hostile text, selected-context minimization, audit links and independent camera transforms.

Full pinned Chromium141 direct/Hub browser regression passes with zero page errors. Its unavailable/software adapter is labeled and is not physical GPU acceptance. `npm run test:hardware` separately runs actual Hub/demo/picking/interaction/export/stale/reopen/device-loss/offline workflows on **NVIDIA GeForce GTX1650**, driver32.0.16.1692, Chrome156.0.8078.74; real nvidia/turing adapter, fallback=false. Two repeated instances and occluded back/bottom cases resolve correctly. `device.destroy()` verifies the actual lost-device event; no universal driver-failure claim. Harness enables unsafe-webgpu; named device/browser limits are explicit.

Independent **pypdf6.10.0 / pdfplumber0.11.9 / PDFium5.14.0** parse and render both downloaded PDFs. A4 dimensions210×297mm, text40/60mm, exact independent top width, four hidden strokes, sixteen circular cubic segments, zero raster images. Maximum measured circle radial deviation approximately2.13e-7mm against declared1e-4mm. Rendered pages are visually inspected for legibility and association. QA dependencies are not shipped runtime dependencies.

Raw browser/hardware/PDF reports, fixture profile and screenshots/PDF samples live under `docs/milestones/evidence/E0_M6/`. Candidate measured timing/resource limits are scoped to those fixtures and await E0.M7 owner baseline review; no generic CAD FPS/precision/device guarantee.

## Compatibility and delivery

Native format1, prior document IDs/history/backups, Platform0.1.12 pin6d240845cd77eb1879738d32c9f2b8fcfd7297c5, geometry/solver pins and six corresponding-source archives are unchanged. No silent schema extension or migration. New generated proof/audit data does not replace authoritative native geometry. Direct local scenes only; external/nested viewport rendering and general assembly editing remain unsupported.

Production ZIP verification executes all old corpora/native/semantic operations plus actual installed proof build, exact face query, Local refusal and human PDF export, denying agent export. Delivery additionally requires exact-head Windows/Linux CI with independent PDF QA, immutable experimental0.0.6 ZIP/manifest, and actual public Platform catalog/download/hash/install/activation/launch/demo proof. Final SHA/run/hash/public verification are recorded on the PR/release after this pre-publication source report; local success alone is not delivery.

E0.M7 is next only after owner review/progression: integrated sketch→solid→dependent feature/reference→mate→drawing→proposal→save/reopen and Go/Redesign/Stop. No broader E1 feature-editor work or real-model AI quality is claimed by M6.
