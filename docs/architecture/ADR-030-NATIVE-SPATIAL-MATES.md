# ADR030 — Native occurrence mates and constrained movement

Status: E4.M2 implementation, owner-authorized milestone scope. Evidence is recorded with the candidate; acceptance/public installation remain separate gates.

E4.M2 extends the proven E0 world-tangent rigid solver to the actual native component hierarchy. Optional `graph.spatial` uses `E4.M2-spatial/1`, stores explicit grounded occurrence paths and typed mates, and participates in native hashes, history and immutable snapshots. The document format remains native1; strict older readers reject this extension rather than discard mates.

References retain source document identity, occurrence path, producer, kind and semantic role. They resolve through regenerated native geometry. GPU IDs are accepted only against the active native proof manifest when authoring a mate, then discarded. Missing, transient and ambiguous references fail explicitly. Geometry coordinates supplied by a client never establish a reference.

The first profile supports 32 rigid components plus the grounded world, 128 mates, points, planes, straight axes, circular-edge axes and analytic cylindrical axes. External assemblies form rigid components at their file boundary. Local Group nodes organize child components; path changes remap affected references atomically while preserving world placements. Shared internal occurrences which cannot be edited independently remain explicit errors. Tangent/width mates and broader motion behavior belong to M3.

Ground/fix, coincident, concentric, parallel, perpendicular, distance and angle relations reuse the rank/residual diagnostics of the existing solver. Distance supports point pairs and plane offsets; angle uses degrees at the human boundary. Deterministic tangent perturbations release initially parallel perpendicular/angle cases without changing legacy probe semantics. DOF is the local Jacobian nullspace projection per component, not a claim of global uniqueness.

Manual motion sends temporary simultaneous world targets for selected rigid components. They never become retained mates. Infeasible targets reject atomically, retaining the feasible source. Local drag previews are transient and untrusted. Native verification independently checks that retained placements already satisfy the equations; it does not repair or silently move saved geometry.

Platform still owns lifecycle, accounts and shared UI/AI services. The spatial profile, exact references, solver and CAD transactions remain Engineer-owned. No kernel/solver SDK pin or approved MVP boundary changes.

Clipboard operations retain an explicit source assembly identity and occurrence paths. Same-document groups clone their organization while sharing part definitions; cross-file copies remap only typed local identities, retain immutable foreign snapshots and world poses, and copy internal mate paths together. Project paste extracts an internal leaf definition when needed and creates an independent native file. Native file import rebinds local mate document identities. Neither a coincident destination ID nor an arbitrary client-supplied coordinate can select a substitute source.
