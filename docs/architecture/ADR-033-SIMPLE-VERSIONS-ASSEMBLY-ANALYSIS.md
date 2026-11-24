# ADR033 — Main version series and bounded assembly analysis

Status: owner-authorized design2026-11-24; implementation candidate; focused native and hardware UI evidence exists; complete final acceptance/public installation pending.

The retained owner request supersedes branch/publication consumer policy in Master section6 and E4.M4. Each source has one editable Main and ordered retained snapshots. + archives Main and creates its copy as the new Main. Promotion preserves the former Main. All retained versions are eligible for explicitly pinned consumers; Latest follows Main. Named Main identity is separate from immutable content hashes. Legacy immutable objects and branch archives remain readable, with no rewrite of historical content. A new series sidecar imports the old nodes and records deletion-successor tombstones. No user source or old release is deleted.

The current component link records a versioned series binding plus effective immutable snapshot. Independently configured instances use separate bindings. Deletion resolves tombstones deterministically and persists a per-consumer acknowledgement warning. No remaining version may be deleted. Historical assembly closures remain unchanged. Broken/missing mates can be retained as explicit diagnostics or disabled by user choice; unresolved references are never silently retargeted. Current numerical solving excludes disabled or explicitly unresolved constraints, reports them and preserves valid placements.

Main/series operations use expected revisions and recoverable atomic sidecar/document transactions. Cross-document refresh is staged and reports unresolved sources; no global atomicity claim. Legacy domain branch fixtures remain historical compatibility evidence but the current UI/API exposes only the linear series.

M5 analysis uses exact native transformed solids for pair intersection volume and minimum distance, distinguishes touch from positive-volume interference, and computes per-occurrence mass/centroid/inertia with material density. Missing density produces explicit incomplete results, never invented total mass. Pair and occurrence bounds and units are reported. GPU meshes never establish physical quantities.

Acceptance: migration/reopen; point-of-save +/promotion; deletion successor chains/one-time notices; per-instance versions/copy/insert; conflict vs lost vs disabled mates; native datum rotations/save/rebuild; analytic overlap/touch/gap/mass/parallel-axis tests; actual UI and installed hardware demo; complete exact-head Windows/Linux release gates.

Numerical adapter note: the pinned OCCT bridge does not bind gp_Mat, so MatrixOfInertia cannot be called. Six exact GProp_GProps::MomentOfInertia evaluations about COM axes recover the symmetric tensor; no tessellation approximation is used. Official API: https://occt3d.com/dev/doc/refman/html/class_g_prop___g_props.html.
