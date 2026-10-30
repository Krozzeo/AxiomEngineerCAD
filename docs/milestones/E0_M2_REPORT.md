# E0.M2 evidence — review candidate

Date: 2026-10-30. Owner authorized progression from E0.M1; E0.M2 acceptance is pending. Baseline E0.M1: a1958f378c524b65cf50212e92c53937bbc9f998. Current exact source/CI/publication are indexed by the E0.M2 PR head and immutable experimental release; do not treat a prior SHA's green checks as final acceptance.

## Real implementation

Software 0.0.2: isolated OCCT/Wasm and PlaneGCS experiments; editable lab recipe, CPU isometric tessellation preview with depth-buffer face inspection, solver canvas/drag, diagnostic corpus and version-owned Platform demo. No final kernel/solver or native schema decision is accepted. ADR-001–004 are explicit experiments/review proposals.

Runtime pins: replicad 1.2.0, replicad-opencascadejs 1.1.0 (upstream OCCT V8_0_1), @salusoft89/planegcs 1.3.0; all npm SHA512 values are in package-lock.json. Platform remains 0.1.12 at 6d240845cd77eb1879738d32c9f2b8fcfd7297c5. Corresponding source versions/SHA256 and build-chain inputs are recorded in legal/source-manifest.json and included in prepared installations.

## Local proof

Windows x64, Node v24.21.0, npm 11.19.0, Chromium 141.0.7390.37 / Playwright 1.56.1. `npm run check`: **27 tests passed**, including a **29-case kernel/solver corpus** (no skipped cases). `npm run test:browser`: direct/actual Platform flows and the lab passed with zero page errors. Assertions verify width-driven volume change, last-good preview on invalid self-intersection, explicit recipe apply/save, sketch/drag and real Hub Load Demos. Artifacts are in test-results/ and CI uploads them; retained snapshots may be included alongside this report.

Named geometry results: 40×30×10 mm extrusion = 12000 mm³ / 3800 mm²; two radius-3 through cuts = 11434.513322353834 mm³; radius-3 depth-10 revolution = 282.7433388230814 mm³; half-overlap union = 18000 mm³; intersection = 6000 mm³. Every accepted shape also passes B-Rep validity, declared solid count and analytic area. STEP reimport agrees within the declared probe tolerance. This does not certify arbitrary STEP hierarchy/history recovery.

Topology results: unique modified top face reidentified; actual split yields two candidates and ambiguity; merge fragment/import/kernel-profile uncertainty produce explicit loss; deleted producer has no descendants. Edge, dimension, suppression, reorder and pattern-count cases are separately named. No general edit-proof naming or second-kernel numerical comparison is claimed.

Sketch results: rectangle DOF 0; constrained-radius free circle DOF 2; consistent redundancy distinguished from conflicting coordinate dimensions; singular zero-distance reports no certain DOF; drag to (20,15) preserves radius 4; fixed drag does not move; non-driving radius is measured after solve and leaves geometric DOF 3. Invalid references and nonfinite values are rejected. Domain/UI/headless operations share the same revision checks and worker implementation.

Resources: sample complete corpus ran about 1.2 seconds of task work locally, with roughly 446 MiB peak RSS in the measured isolated process. Startup, per-operation and browser times vary; actual run artifacts contain exact values. Parent deadline is 20 seconds; cancellation kills the worker; JS old-space is 192 MiB; RSS has a measured 768 MiB postcondition, **not an OS hard memory quota**. These are experimental admission limits and measurements, not final E0.M6 performance guarantees.

## Persistence, recovery and known bounds

E0.M1 files still open unchanged. Keep experiment explicitly writes provisional marker E0.M2 with a bounded recipe and kernel profile, never opaque B-Rep/renderer handles or full schema v1. Save/reopen regenerates from that recipe on request. The older 0.0.1 reader refuses the newer marker without writing. Failed/cancelled/stale workers do not overwrite the committed file or last good preview. Full snapshots/migrations/versions remain E0.M4.

Limits: no arbitrary user STEP upload, general feature editor/history, 3D mates, exact HLR/PDF, general topology naming, actual second-kernel migration, GPU or real-provider acceptance. The edge-touch compound is rejected by the single-solid contract even though its individual B-Rep components may be valid. Reference-rank evidence is local to the documented supported 2D relations, not a general proof over all singular mechanisms. Upstream Wasm is used unmodified; no independent bit-for-bit rebuild is claimed.

## Delivery and manual review

Install 0.0.2 experimental from Platform. In its installation card choose **Load Demos**, open **E0.M2 Geometry & Sketch Lab**, then Build exact preview, change width and rebuild, inspect reference diagnostics, run the corpus, solve/drag the circle, Keep experiment, Save, close/reopen and rebuild. Source archives/licenses remain available inside the installed package. Public discovery/download/hash/install/activation/launch and the packaged corpus must pass before reporting the release delivered. Owner review remains separate from publication and main merge.
