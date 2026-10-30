# ADR-005 — Rigid-body spatial solver experiment

Status: **Experimenting / review proposal**, E0.M3, CAD-R004/CAD-R015. Owner validated the bounded E0.M2 milestone and authorized continuation; this is not final assembly-solver or schema acceptance.

## Candidate and alternatives

An original MIT JavaScript prototype (`Engineer-rigid-LM/0.0.1`) evaluates a small analytic-datum problem without a new binary dependency. It uses double precision, world-space translation/rotation tangent increments, normalized xyzw quaternions, central finite differences, damped normal-equation steps and pivoted local Jacobian rank. Grounded instances are excluded from unknowns. No Euler-angle chart or PlaneGCS spatial extension is used.

The general numerical approach is described in the primary [Ceres nonlinear least-squares documentation](https://github.com/ceres-solver/ceres-solver/blob/master/docs/source/nnls_solving.rst) and [manifold documentation](https://github.com/ceres-solver/ceres-solver/blob/master/docs/source/nnls_modeling.rst). These are conceptual references; Ceres code is not copied, linked or distributed. Its mature sparse solvers/native adapter are a future alternative if this bounded prototype does not scale. PlaneGCS is retained for 2D only. A GPL solver is not silently embedded. No new third-party license obligation is introduced by this original code.

## Explicit equations and frames

Input profile `E0.M3-datums-v0` uses right-handed definition-local points/directions, mm, radians, and body transforms into world coordinates. References are `{bodyId, datumId}`, with explicit definition IDs and datum states. Frame datums use the body's local XYZ orientation and an explicit local origin. No mesh/face offset becomes a saved identity. Missing or ambiguous references fail before dispatch; there is no nearest-geometry fallback.

| Mate | Supported classes / meaning |
| --- | --- |
| Coincident | point-to-point (3 equations), or planes (parallel normals plus normal separation) |
| Concentric | analytic axes: cross direction and cross axis separation; axial slide and spin remain free |
| Distance | Euclidean point distance in mm; zero/coincident configurations are singular |
| Angle | angle between oriented axis/plane directions in [0, pi]; parallel endpoints are conservatively singular |
| Parallel / perpendicular | axis or plane direction cross/dot equations; parallel and concentric axes are unoriented |
| Fixed | two analytic frame origins and orientations coincide; not an arbitrary stored initial offset |
| Tangent / width | explicitly unsupported for all surface classes in this probe; E4.M3 must define cylinder/plane tangent side and width datum/placement conventions before enabling them |

Per-instance freedom begins at six; grounding removes six. Rank is local to the solved pose, not a proof of global mechanism mobility or unique solution. Whole mates that add no rank after earlier mates are reported as consistent redundancy. Cross-product rows contain internal algebraic dependencies and are not counted as separate redundant mates. Conflicts list violated mate IDs, not a minimal unsatisfiable set. Contradictory same-reference distance/angle bounds, or violated fully grounded relations, justify Inconsistent; other nonconvergence reports Unsolved or SingularOrIndeterminate. No convergence is silently interpreted as a valid placement.

## Motion and atomicity

Drag adds a temporary world position and optional orientation target, solves it together with permanent mates, then removes the target before permanent DOF evaluation. A feasible target can move dependent free bodies. An incompatible target rejects the entire move and retains the previous feasible placement. It is not a collision response or nearest-point projection of an infeasible target. Fully locked/grounded moves fail unchanged.

The actual browser supports numeric target edits and a pointer-up solve along world Z; the headless path supports full position/orientation targets. A 21-sample path measures constrained motion correctness and solve times, without claiming continuous high-frame-rate drag. The UI displays a CPU datum diagram, not B-Rep/interference or WebGPU proof. Failed/singular/unsolved jobs cannot replace last-good poses or be kept. Apply rechecks the captured document revision and successful worker identity; Save remains atomic under Platform lease. Cancellation/timeout kills the isolated worker and late results cannot commit.

## Experimental bounds and evidence

2–4 bodies, 1–8 local datums each, <=16 mates, positions/local origins bounded to +/-1000 mm, unit directions/quaternions. Up to 100 damped iterations, central difference step 1e-6, absolute rank threshold 1e-6. Acceptance residuals: length 1e-6 mm and angle/direction 1e-7. Rank depends on conditioning and the bounded mm profile; these are measured probe admission criteria, not frozen E0.M6/manufacturing thresholds. Solved poses must still pass the bounded recipe validator before application.

[28-case corpus](../../src/assembly/suite.mjs), [integration tests](../../tests/assembly.test.mjs), [milestone report](../milestones/E0_M3_REPORT.md). Independent expected two/three-body DOF/positions and direct analytic angle/spacing checks supplement numerical residuals; no image-only proof. Existing 29-case exact-kernel/2D corpus remains required.

Limitations: dense normal equations, no robust sparse factorization or global infeasibility/uniqueness proof, narrow singularity detection, no arbitrary B-Rep/changed-face resolution, general multi-instance hierarchy, large assemblies, version following, interference, dynamics or native schema v1. If these fail later gates, retain documents and adapter inputs, replace the experimental solver, and rebaseline with an owner-reviewed ADR. E0.M4 must validate identities, immutable dependency closure and migrations before schema stabilization.
