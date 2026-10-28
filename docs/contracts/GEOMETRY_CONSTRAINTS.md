# Geometry, Topology and Constraint Contracts

**Baseline:** Master v0.2.0. **Status:** behavioral specification with measured implementation choices pending E0.M2/M3. Geometry is authoritative CPU/Wasm/native-worker B-Rep, not WebGPU triangles.

## 1. Exact geometry and regeneration

Authoritative modeling stores a feature/dependency DAG with stable feature/sketch/parameter identities, typed references, suppression status, input values, cached derived state and diagnostic result. Regeneration uses a deterministic dependency order within a pinned kernel/tolerance profile. Invalid downstream operations preserve last-known-good committed state and report causes; partial or stale results cannot commit. Surface intersections, self-intersecting profiles, degenerate edges, invalid booleans, nonmanifold solids, NaN/infinity, undefined references and unsupported topology must fail visibly and without data loss.

An exact valid solid is not established by triangle render, GPU screenshot or positive mesh area. Compare B-Rep validity, geometric dimensions, volume/area and reference lineage against independent oracles; distinguish exact shape equivalence from matching surface ordering or feature-history identity.

## 2. Persistent geometric selection

A semantic selector captures producing definition/feature, subelement type/role, occurrence path and frame, expected version/provenance, optional geometry/adjacency signature and ambiguity evidence. Candidate implementation is **not** yet frozen. Four states are required:
- **ResolvedStable:** same intended subelement with proven lineage.
- **ResolvedReidentified:** changed kernel topology but evidence uniquely identifies same intended element within declared bounds.
- **AmbiguousReference:** multiple plausible targets; do not guess.
- **LostReference:** target is absent/invalid, repair required.

References stored by sketches-on-faces, mates, patterns, dimensions, section/cut definitions and agent geometry queries must use the same resolver. Selection on a transient WebGPU edge/face returns an authoritative semantic ID before it becomes a saved reference.

**E0.M2 gate:** edit base dimensions; insert/reorder/suppress an upstream feature; split and merge a face; vary hole-pattern count; delete generating feature; import healed B-Rep; change kernel version. No silent false-positive reassignment. Actionable ambiguity/loss is acceptable, silent wrong attachment is not.

## 3. Numeric contract

The selected ADR must define canonical length/mass/angle representation, user-facing mm/cm/m/inch and degrees/radians conversions, per-operation length/angular/relative tolerances, sketch solve residuals, topological reference matching policy, mass-property error, HLR/vector tolerance and GPU-picking screen tolerance. Manufacturing tolerances and displayed decimal rounding are distinct. Model scales, unit conversion and shape limits are versioned acceptance profiles; a single global epsilon is prohibited.

Each benchmark records exact hardware/OS/browser/kernel/solver/worker version and independent expected results. E0.M6 freezes measurable pass/fail/unsupported thresholds, with an owner-reviewed change process. Do not manufacture numeric limits in advance of measurement.

## 4. 2D sketch solver

Supported entities begin points, straight segments, circles, rectangles; expand arcs, polygons, trim/split, mirror and patterns. Dimensions are **driving** or **read-only reference**. Constrain only where a relation is intentionally present; geometric elements do not have to be artificially fixed on creation.

Solver outcome is typed:
- FullyDefined: no permitted free DOF in the declared frame.
- UnderDefined: remaining DOF with drag directions or rank evidence.
- RedundantConsistent: a dependent relation adds no new restriction, potentially consistent.
- Inconsistent: no valid solution under tolerance.
- SingularOrIndeterminate: rank/geometry conditions prevent a reliable DOF claim.
- Unsupported/InvalidInput/Cancelled.

DOF classification must consider numerical rank and singularities; an overcomplete list of constraints is not automatically inconsistent. Drag preserves all satisfied constraints, updates a temporary preview and validates a revision-checked authoritative commit. Status blue/black/conflict icon is display only; queries expose textual diagnosis and involved constraint IDs.

## 5. Spatial assembly solver (different from 2D)

Each initially free rigid instance has up to six DOF (translation/rotation). A grounded component removes them. Represent coincident, concentric, parallel, perpendicular, distance, angle and fixed relations as typed equations on local datum/geometry references with explicit frames. Tangent and width need explicitly supported surface/reference classes, unique solution policy and bounds; do not promise arbitrary surfaces by name alone.

The E0.M3 feasibility proof requires at least: one grounded component; two bodies constrained coaxially but free along an axis; a redundant consistent relation; inconsistent distance/angle; singular pose; fully locked instance; constrained drag along remaining DOF; cancellation; missing/ambiguous reference. Output remaining DOF, residual/error diagnostics and unsolved status. Drag may use preview solve but final commit must validate exact current revision. Static feasibility is not evidence of smooth interactive motion.

## 6. Kernel, STEP and distribution

OCCT with an appropriate maintained bridge/native worker and PlaneGCS or alternatives are **candidates**. License compatibility, source/rebuild/replacement notices, packaging binaries, worker sandbox/memory/cancel deadlines and numerical performance require ADR review. Game Engine's occt-import-js static STEP tessellator is not an editable B-Rep CAD kernel. Bound STEP v1 to supported exact geometry, units, orientation, naming/hierarchy/metadata actually provided by translator, with fidelity report and original source retained. Do not claim recovery of unavailable proprietary operations/constraints.

## 7. Integration acceptance sequence

Sketch constrained geometry → exact feature → semantic face/edge selection → dependent feature → driving parameter edit → regeneration → verified selectors or typed lost/ambiguous → native save/reopen → associated vector drawing → assembly mate → independent semantic query/tool modification. Test every transition for cancellation, stale revision, near-degeneracy and recovery, not only final viewport appearance.

References: [Master §7](../../MASTER_DESIGN.md#7-geometry-numerical-foundations-and-topology), [Native data](NATIVE_DATA_VERSIONING.md), [Benchmark profiles](../quality/ACCEPTANCE_BENCHMARKS.md).
