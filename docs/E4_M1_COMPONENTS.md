# E4.M1 implementation start

The owner authorized starting E4.M1 after the corrected E3 stable delivery. This first native block reuses native1 definitions/instances rather than cloning B-Rep per occurrence. A component hierarchy composes local rigid placements into occurrence-world frames and keeps authoritative geometry identities. Draft graph mutations clone working state and run complete structural validation before returning; immutable versions/publications are never rewritten. Existing native cycle, identity, placement and occurrence expansion bounds remain authoritative.

This is a development start, not a completed or installable M1 delivery. Next: definition-local feature validation/regeneration, revision-checked semantic commands, shared-definition geometry consumers, in-place context routing, Components Manager/ribbon controls, actual picking/editing, historical snapshot numerical checks, demo, exact Windows/Linux/browser acceptance and public experimental installation. E4.M2 mates and E4.M4 publication policies remain separate milestones.

Acceptance for the first block must exercise repeated definitions and nested quaternion placement against analytic coordinates, invalid-cycle rollback, independent instance removal, and unchanged retained snapshot hashes. No UI or exact assembly-modeling acceptance is claimed by this draft.

Base: main 94411d99cc91c850ae9bf553248dd98a569e1a16 (0.3.13). Work branch: engineer/e4-m1-components. No M1 installation or milestone completion is claimed.

## Current evidence and next integration points

The first block passes three analytic native tests and the complete local 341-test native suite on Windows/Node24.21 (54.2 s). This is structural/domain evidence only. It does not establish assembled B-Rep, GPU picking, in-place editing or user UI completion.

`src/components/hierarchy.mjs` composes quaternion placements, expands occurrence paths and offers validated draft definition/instance create, move/reparent and remove operations. It reuses the native1 graph and the accepted spatial quaternion math. Repeated definitions remain shared; removing an instance preserves its reusable definition. Cycles, duplicate IDs, missing definitions and non-unit rigid transforms reject without source mutation. Retained version bytes/hashes are preserved.

Next integration must address the existing primary-part guards in sketch/extrusion/reference validation, definition-local exact regeneration and verification, occurrence-aware model scene/selection, revision-checked semantic commands and in-place editor context. Do not simply remove the guards and feed all definitions into the existing part history. The old geometry-probe viewport supports only bounded direct local occurrences and is not evidence of nested parametric part modeling. Parameter scope, rollback, source references and immutable effective snapshots must remain coherent. Complete the Components tree/ribbon/Inspector, real edit-and-repeat demo and negative/recovery paths before declaring M1 delivered.
