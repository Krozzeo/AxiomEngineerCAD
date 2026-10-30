# E0.M3 evidence — review candidate

Software 0.0.3. Baseline 7aa556b1836973a76fc2ffacd8ad3ca232627564. E0.M2 was explicitly validated by the owner; continuation to E0.M3 is authorized. E0.M3 owner acceptance remains pending. Exact final source, remote checks and immutable publication are indexed by this milestone's PR and release, independently of local evidence.

## Implemented and measured

Separate original MIT six-DOF rigid-body numerical prototype; semantic local point/axis/plane/frame references; grounding; coincident/concentric/distance/angle/parallel/perpendicular/fixed equations; local rank/DOF, whole-mate redundancy, conservative singularity and violated-relation diagnostics. No new external dependency. Platform remains 0.1.12 at 6d240845cd77eb1879738d32c9f2b8fcfd7297c5; OCCT/PlaneGCS dependency/source pins are unchanged. [ADR-005](../architecture/ADR-005-SPATIAL-MATE-PROBE.md) records equations, alternatives, limits and rollback.

28 spatial cases pass: free rigid body =6 DOF; coaxial shaft/collar =2 (slide/spin); three-body coaxial pair with a 12-mm spacing relation =3; coincident points/planes =3; point distance and nonparallel angle =5; parallel =4; perpendicular =5; locked frame =0. Repeated coaxial mate remains consistent/redundant at DOF2. Contradictory distances/angles are Inconsistent; zero distance/parallel angle are SingularOrIndeterminate with no certain DOF. Missing/ambiguous datums and tangent/width surfaces are refused explicitly.

Independent oracle checks include coaxial world XY=0, preserved axial Z=15 mm, 60-degree direction dot=0.5, three-body spacing=12 mm, spin quaternion for 0.7 rad, and grounded identity pose. Additional tests verify a rotated/translated definition-local datum against a manually calculated world point and a three-body drag to collar Z35/cap Z47. The 21-step axial path spans 0–40 mm and checks residuals/DOF at every step. Retained JSON evidence records per-case expected/actual values, input hashes, iterations/times and measured peak worker RSS.

Sample retained run: complete spatial corpus 264.7641 ms of task work, peak RSS 60,653,568 bytes; 21-path sample mean 4.1782 ms / maximum 7.6295 ms. This measures headless solves, not browser interaction latency or a smooth-drag guarantee. Full runtime/CPU/memory profile and exact values are in [spatial-report.json](evidence/E0.M3/spatial-report.json). Local relocated package passed both corpora, source hashes and spatial drag/keep/save/reopen; remote production builds remain separately indexed by exact PR/release.

Local Windows x64 / Node v24.21.0 / Chromium 141.0.7390.37: 36 tests including 28 spatial and 29 prior geometry/2D cases; actual direct/Platform browser flows, zero page errors. The browser verifies solving, numeric movement, actual pointer-up movement, keep/save, conflict/fixed-move rejection, exact-geometry regression and both real Hub demos. Exact remote Windows/Linux and packaged/public-install results must be verified before reporting delivery.

## Persistence and failure evidence

Assembly previews do not mutate document bytes. Keep assembly writes an opt-in bounded format-0/E0.M3 recipe with solved poses and semantic datums; existing E0.M2 geometry remains in the same envelope. Applying geometry again retains the E0.M3 marker and assembly. Old E0.M1/M2 documents remain readable; prior readers' explicit marker allowlists refuse M3. This is provisional experiment persistence, not native schema freeze or migration acceptance.

Conflicting/singular/missing-reference/off-axis targets preserve the last good placement and saved bytes. Fully locked and grounded drag is rejected unchanged. Cancellation/deadline terminates the worker; stale completion and stale apply cannot overwrite newer metadata. Shared worker, origin/auth, receipts, revision and lease authority serves headless and browser operations. Worker deadline20s / 192 MiB JS old-space / measured 768 MiB RSS postcondition are unchanged from M2; no hard OS RSS quota claim.

## Owner-visible flow and delivery

Install/activate **0.0.3 experimental** in Platform, choose **Load Demos**, open **E0.M3 Spatial Mate Lab**. Solve assembly, inspect DOF2, set target Z35 and Move collar, drag vertically, then Keep assembly → Save document. Close/reopen and Solve assembly to reproduce the saved pose. Try locked, conflicting and three-body cases; run/download the spatial corpus. The previous M2 demo remains available.

Deliver immutable ZIP/manifest only after exact PR CI and relocated-package verification. Public discovery, size/hash, install/activation, both demos, actual spatial/kernel corpora and saved placement reopen must pass using a clean Platform profile. Publication does not imply main merge or owner acceptance.

Limits: datum/rigid-frame CPU diagram, no exact mating surfaces/collision or actual WebGPU evidence; no large-assembly scaling, continuous smooth-drag claim, dynamics, general singularity/global convergence proof, full hierarchy or Latest/Pinned. Tangent and width are unsupported with explicit surface/placement decisions deferred to E4.M3. E0.M4 is next after owner validation/progression; ADR-005 is an experimental implementation proposal, not a final solver contract.
