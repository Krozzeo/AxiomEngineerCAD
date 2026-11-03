# ADR-003 — Conservative producing-role and OCCT lineage experiment

Status: **Experimenting / review proposal**. E0.M2; CAD-R003. Not a general topological naming guarantee.

The probe has a known rectangular profile producer (`base-extrude`) and explicitly typed top/bottom face or top/bottom boundary-edge roles. Unique producer geometry seeds the reference; no face array offset or GPU ID is persisted. Subsequent actual boolean operations propagate via OCCT Modified, IsDeleted and IsSame history.

Outcomes: preserved one-to-one identity is ResolvedStable; a unique proven descendant is ResolvedReidentified; multiple descendants produce AmbiguousReference; absence or unproven identity produces LostReference. Geometry resemblance alone cannot resolve a saved reference. Pattern counts, dimension change and reordered cuts regenerate the same named producer, with exact boolean lineage evaluated again. An inserted union or split may deliberately yield ambiguity rather than false attachment.

Split-to-merge repair is conservative: a fragment selector cannot be reassigned to a merged face without evidence. Imported/healed STEP has no native producing-feature lineage and returns LostReference. The kernel-change fixture demonstrates safe refusal of an unverified runtime profile; **a second kernel binary or historical migration was not executed**. Those broader compatibility gates remain E0.M4/E0.M7/E6.

Only the known producer family is supported. Arbitrary imported faces, freeform operations, general feature reordering, split-fragment persistence, branch/channel lineage and assembly occurrence naming are not accepted by this experiment. It is suitable to inform schema design, not to freeze it. The native E0.M2 recipe is an opt-in provisional envelope; full native schema remains deferred.

Browser face picking inspects actual kernel tessellation and exposes a semantic producer role only where lineage is proven. Other picks explicitly remain transient. Canvas CPU visibility is supplemental presentation; exact measurement/reference truth is generated in the worker. WebGPU CAD picking is still E0.M6.
