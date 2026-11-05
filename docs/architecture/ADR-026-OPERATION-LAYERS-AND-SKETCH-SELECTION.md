# ADR026 - Operation layers, circular references and sketch gestures

Status: implementation under the owner's 0.1.11 request; exact-head delivery and owner review remain separate gates. Kernel, solver, native format version and accepted Platform SDK pins are unchanged.

Operation previews compose exact producer-owned display layers over the original scene. The candidate supplies verified resulting metrics; original material and source identity stay separate. Display layers carry no semantic selection IDs or saved authority. Extrusion's producer exposes the unfused tool shape rather than tinting the fused result. The renderer consumes generic mesh layers with translucent yellow faces and yellow boundaries.

External sketch references are internal solver inputs with independently regenerated source witnesses. They are neither projected display geometry nor ordinary sketch primitives. Conversion is explicit: review a read-only selection draft and atomically create ordinary entities plus removable source projection anchors. Face conversion uses exact face-to-edge membership; it never invents boundary curves from display triangles.

Some circular B-Rep boundaries are split into multiple arcs. A composite circle is accepted only if analytic circle witnesses agree, arc endpoints connect, total length is a circumference and signed winding is exactly one turn. Its semantic role is a conservative geometric witness. No nearest-edge retargeting or partial-arc-to-circle conversion is permitted.

Ordinary picking prioritizes Origin, then local sketch geometry, then external geometry. The explicit overlap table enumerates semantic candidates, including occluded model faces, and resolves a chosen ID through native authority. Candidate enumeration from display geometry does not establish native identity.

Endpoint holds are convenience gestures, not saved constraints. They may not suppress permitted motion in a connected constraint network. Pointer offsets and final release goals are preserved. Snap must not target coincident aliases or geometry moved by the same gesture. Pinned numerical solving and independent verification continue to control committed coordinates.

External-reference verification receives the complete canonical content, including parameter bindings in later or suppressed sketches. Execution rollback still bounds the regenerated upstream geometry; its truncated feature graph is not a complete source document for reference validation. Finishing an earlier sketch must preserve valid downstream bindings and continue rejecting missing targets.

See [0.1.11 scope and validation](../milestones/E1_M5_UX_0_1_11.md).
