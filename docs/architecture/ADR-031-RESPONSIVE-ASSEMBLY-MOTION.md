# ADR031 — Native mate preview and responsive constrained motion

Status: implementation candidate for owner-authorized E4.M3. Acceptance and public installation pending.

E4.M3 extends the existing rigid solver and native mate profile. M2 documents and retained fixed-pair frames remain readable. New single-reference Fixed retains the native world pose; Between retains two plane sets with three or four total references. Tangent is bounded to analytic cylinder/plane and external parallel cylinder/cylinder contact. Arbitrary trimmed surfaces, internal tangency and collision avoidance are not claimed.

Native preparation resolves exact references once into a bounded analytic recipe. The human-session motion endpoint returns this read-only recipe, occurrence paths and source poses for the current document revision/context. A dedicated browser worker computes nearest feasible temporary target poses; displayed transforms are updated only after the permanent mate residuals satisfy tolerances. GPU meshes do not establish identity. Target poses remain untrusted motion requests: the backend resolves source geometry and independently solves/verifies before committing, with existing revision, scope, history and atomic persistence checks. Temporary previews do not create history entries or save geometry. Cancel restores the source scene. Late preview results retire at context changes.

Mate authoring and editing use the same native draft solve for preview and Apply. Pick IDs are consumed only against the originating manifest and revision. Two-sided legacy Fixed is distinct from the new one-component world fixation. Native grouped reference traversal is shared by hierarchy remapping, copy/import, deletion and visualization so extra Between references cannot be lost or silently retargeted.

Mates and Components are two views over the same retained relation identities. Grounded M2 paths appear as removable Fixed items; they are not silently rewritten. All mates preserves creation order. Part rows and relation rows provide reciprocal navigation, Edit and Delete.

Platform lifecycle/provider contracts and kernel/solver pins remain unchanged. Main/stable remains0.3.13. Published Latest/Pinned updates and interference belong to later milestones.
