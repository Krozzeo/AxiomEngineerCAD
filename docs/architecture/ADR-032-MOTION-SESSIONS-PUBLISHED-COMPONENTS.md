# ADR032 — Grouped motion and published component resolution

Status: implementation candidate for owner-authorized E4.M4 /0.4.5.

The owner explicitly chose a temporary motion session: direct Model dragging and
Move component stage poses without a MAIN revision per release. Exiting Move,
saving or starting another edit validates and confirms the session as one revision
and one Undo entry. Sequence checks protect staged requests; source hashes and
native revisions protect confirmation. MAIN, immutable versions and their effective
dependency snapshots remain unchanged during staging. A failed verification retains
MAIN and the draft. Discard/close must not silently save staged geometry.

Native-derived analytic recipes are cached only for their exact content/context.
Pointer projection omits rank/redundancy diagnostics, isolates the affected movable
constraint island, uses a rigid seed for linked pieces and accepts only residual-valid
poses. Unrelated pieces sharing a grounded bridge do not become solver variables.
Mouse release seals input for both gizmo and direct Model dragging. Native validation
still occurs at confirmation and exact identity checks are preserved.

The displayed tessellation remains uploaded. A WebGPU compute pass updates rigid
vertex positions/normals from immutable base buffers; it preserves picking IDs.
Native B-Rep and the double-precision solver remain authoritative. WGSL runtime
floating types are f32/f16 ([W3C WGSL](https://www.w3.org/TR/2026/CRD-WGSL-20260825/#floating-point-types));
moving the authoritative tolerance-sensitive solve to f32 would not preserve this
product's numerical contract. GPU render transforms and CPU-worker solver reduction
address the measured hotspots without changing kernel/solver dependencies.

On the measured local nine-body fixture (one fixed, eight plane-constrained), the
original0.4.4 preview solver median was448ms and the reduced preview median7.6ms,
12 samples each, with permanent residual and free XY checks. These are local solver
wall times, not a guarantee for all assemblies, whole-frame latency or token savings.

Published source versions are immutable retained native snapshots. Latest resolves
new publications for valid working project consumers; Pinned retains its selected
snapshot. Preview stages a validated candidate and feature/dependency comparison.
Apply requires unchanged source and consumer hashes. Lost references/conflicting
mates block a consumer update; there is no substitute selection or partial adoption.
Historical assemblies reconstruct their embedded effective dependency closure.
Current source discovery uses the authorized project catalogue; cached snapshots
remain available when the source is missing. Existing project-working references
retain their separate live-edit semantics.

E4.M4-spatial/1 adds explicit reversible mate direction and reads prior M2/M3
profiles. Old immutable documents are not rewritten. New direction semantics cannot
be silently emitted under an older native profile.

Real verification also covers failed-renderer retirement: an uncaptured GPU error,
as well as device loss, retires pending completion waits. A GPU failure must not
leave cancellation/close waiting indefinitely or change native document content.
The owner-facing tests use the existing selective runner and real Platform/browser
fixtures. Full exact-head Windows/Linux acceptance and public installation remain
mandatory before experimental milestone delivery.
