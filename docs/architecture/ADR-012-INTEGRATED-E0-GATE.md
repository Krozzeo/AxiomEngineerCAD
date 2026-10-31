# ADR-012 — Integrated E0 foundation and owner gate

Status: **Experimenting; owner Go / Redesign / Stop pending**. Date:2026-10-31. Software0.0.7. Owner: project owner. Requirements: Master E0.M7 and native/geometry/semantic/security/acceptance contracts. This does not authorize E1.

One portable document stores a constrained rectangle, depth extrusion, explicitly selected top-face hole, second definition/occurrence, geometry-derived plane mate and associative drawing parameter. Actual PlaneGCS solves deliberately incorrect coordinate hints; OCCT extrudes that solved loop and cuts from its resolved face using Modified lineage. Actual measured final/child planes feed the spatial solver with a perturbed cap seed. The numerical pose must agree with the declarative stored pose within1e-6mm. A single plane mate intentionally leaves3 DOF, while the sketch is FullyDefined/0DOF. Shared typed commands perform real before/after verification for manual and isolated proposal changes; full human review and atomic Apply remain mandatory.

## Representation, alternatives and compatibility

Four explicit versioned feature decoders (sketch-proof, extrude-proof, mate-binding-proof, drawing-proof) extend the existing native1 feature graph. Unknown versions refuse before writes. Old native0/1 documents and old feature decoders remain intact; no automatic migration or top-level schema relaxation. The actual archived0.0.6 decoder refuses the M7 study without modifying bytes. New-profile studies need0.0.7; downgrading their reader is unsupported. This extension uses the explicit decoder mechanism contemplated by ADR006; it does not freeze a general feature schema or change the approved MVP.

Rejected alternatives: flat final recipe alone fails to prove stored sketch/feature dependencies; disconnected screenshots fail to prove integration; executable expressions weaken data authority; a general editor prematurely expands E0 scope. A later representation change requires explicit versioning/migration with original backup. Historical proof renders a clone of retained content and checks freshness against the live anchor hash/revision. Picks carry versionId/readOnly. The fixed source-linked A4 layout shows the primary plate; the cap is shown/mated in the model viewport. This is not an authored assembly drawing or manufacturing release.

## Risk ledger and quantitative candidate baseline

| Risk | Evidence | Remaining gate |
| --- | --- | --- |
| Kernel, numerical profile, license | ADR001/004;29 retained kernel/2D cases; integrated volumes12000-90*pi and27000-135*pi within1e-6mm3; six corresponding source archives | Broad size/complexity/STEP and performance remain unaccepted |
| Sketch and spatial constraints | ADR002/005;28 spatial cases; integrated sketch0DOF, mate3DOF, measured residual below7.491e-7mm | General sketches and arbitrary B-Rep mate families remain future work |
| Topology identity | ADR003; actual OCCT Modified lineage, ResolvedReidentified; missing/split/merge unsupported references refuse | General arbitrary-history topology naming unresolved |
| Closure/durability | ADR006/007; unchanged retained baseline, offline copy, real writer kills prepared/replaced, retained corrupt recovery | Universal power loss and final container decision separate |
| Semantic authority | ADR008;19 typed tools, full review, agent Apply denied, stale/cancel/revoke and replay safeguards | Local scripted agent only, no real AI model acceptance |
| GPU and drawings | ADR009/010; actual NVIDIA picking/occlusion, lost/unavailable paths; independent PDF parsing and PDFium rendering | Fixed primary plate views, no general drafting claim |
| IP exposure | ADR011; Local default, zero remote dispatch, minimized preview, redacted audit | Future remote broker/provider cohorts require explicit approval |
| Coupling |15 new tests+85 retained; actual Hub manual/proposal/history/save/reopen and relocated package | Owner reviews portable demo and decides Go/Redesign/Stop |

[Versioned corpus](../quality/E0_M7_ACCEPTANCE_CORPUS_V1.json) records exact fixtures, tolerances, bounds and hardware. Raw local reports are in milestone evidence. These are a reproducible E0 baseline candidate, not guarantees for arbitrary devices/documents. Runtime dependencies/licenses and Platform0.1.12 pin are unchanged.

## Owner decision

**Go:** accept measured E0 architecture candidate and authorize E1 planning with remaining risks above. **Redesign:** name the rejected foundation/profile; require a new ADR/proof before dependent expansion. **Stop:** preserve builds/documents/evidence and halt expansion. Owner decision/date: **pending**. CI/publication and previous milestone validation do not sign this gate.
