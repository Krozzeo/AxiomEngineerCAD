# ADR025 — Sketch intent, repair and planar support

Date: 2026-11-03. Status: implementation under the owner's explicit attached request; acceptance and installation evidence remain gates. No kernel, solver, SDK or approved MVP replacement. Scope: E1.M5 workbench extension, not E2 progression.

## Interaction and transactions

Primitive cursor previews are presentation-only. Snap resolves bounded screen proximity to stable semantic point references, with Ctrl bypass. Creation plus inferred coincidence and a dragged point plus coincidence commit through shared typed domain commands in one revision/Undo step. Reject stale targets, incompatible roles, unsatisfied constraints and unauthorized mutations atomically. A snapped coordinate alone is not a persistent coincidence.

Explicit deletion removes constraints involving the deleted entities and their equation targets. It preserves unrelated orphan constraints, which stay queryable and removable by stable ID in Inspector and Parameter Manager. Expressions depending on removed named dimensions still require explicit repair; deletion does not silently rewrite arbitrary expressions.

Keep numerical redundancy distinct from inconsistent equations. The current workbench treats redundant driving dimensions as an overdefinition/driver-ownership conflict even when values agree. Expose involved IDs and red diagnostics; do not fabricate a different mathematical solver outcome. Retained older numerical profiles and immutable source data remain unchanged. The overdefinition dialog cannot move the pending dimension placement.

Signed dimension intent must retain the direction chosen at creation, so positive means the originally dimensioned direction and negative reverses it. Old dimensions without the new intent retain their original convention; older strict readers refuse new source fields.

## Planar support

Keep existing semantic cap references and their OCCT lineage. Every other planar face of the supported exact native solid receives a producer-owned geometric witness: exact planar normal, centroid/area and canonical sampled boundary geometry, hashed without kernel face-array indices or GPU hashes. The native support carries its verified orthonormal frame. Creation and every regeneration resolve exactly one face and compare that frame. Curved surfaces reject; forged frames, absent witnesses or ambiguous matches fail without retargeting. Geometry-changing edits that cannot retain the witness require explicit support repair and preserve the old valid document. This is deliberately conservative, not a claim of arbitrary edit-proof side-face lineage.

Exact face centroids position orientation arrows. Normal/right orientation remains separate from the source support frame. Older strict readers refuse the new planar role/frame rather than flattening it. The owner explicitly requested any planar native face; this adds that capability within the current kernel/solid profile without relaxing the no-false-retargeting gate. Broad stable reidentification through changing topology remains later work. Planar selection must use actual Model/Manager picking and context menus; preset Inspector buttons cannot stand in for picking.

## Interface and delivery

Searchable selectors show labels while retaining stable target IDs and support keyboard/blur/Escape without accidental commits. Parameter Manager has one selected row and a footer with textual/icon status; errors preserve the draft. The Inspector can bind a parameter or edit a literal through the same authoritative reducers, and Go to source selects its owning parameter row.

Required evidence: exact face frames on non-principal/angled sides, upstream edits, additive lineage, ambiguity/loss, old-reader refusal, atomic Snap/stale/Undo, redundant/missing constraints and repair, actual pointer previews/search/selection/context/camera/save/reopen, retained numerical/UI/PDF/security corpus, exact-head CI and a genuine public Platform installation. This ADR alone proves no completed capability.
