# Engineer handoff - E2.M4 drawing reconstruction / 0.2.3 candidate

Start with `npm run context`, AGENTS.md, [compact context](docs/PROJECT_CONTEXT.md) and the [E2.M4 report](docs/milestones/E2_M4_DRAWING_RECONSTRUCTION.md). Owner validated E2.M3 and requested E2.M4. Preserve prior source and immutable version semantics.

## Source and authority

ADR025 and the 0.1.8 milestone plan/report map every owner request. Snap attaches ordinary coincidence or point-on-circle relations atomically in the existing entity.add/drag command; origin materializes a construction point fixed at 0,0. Ctrl bypasses. Delete removes associated constraints and their parameter targets. Existing orphan relations remain repairable. New signed dimension direction is optional; old source retains its convention. Mathematical redundancy stays RedundantConsistent while ambiguous driving dimensions are explicitly invalid/conflicted. Compound line-distance is not falsely flagged for its implied parallel equation alone. Failed numerical solves retain original coordinates.

Exact planar faces outside the existing caps use producer-owned conservative geometry witnesses (normal/centroid/area/boundary) plus a verified orthonormal frame. Supports resolve uniquely during actual native verification. Changes that lose a witness fail rather than retarget. No arbitrary stable side-face lineage claim. Older strict source decoders reject new frame/direction/relation fields.

## UI

`search-select.mjs` preserves stable IDs with filtered labels, blank unset inputs and keyboard/literal support. Parameter Manager has four tables, one selected row, explicit footer states and paged revision-cached diagnostics. Geometric CRUD and repair use existing tools. The dimension Inspector Value selector binds immediately or atomically unbinds to a numeric literal. Bound Model labels prefix parameter names; icon source navigation selects the actual row. New Sketch uses picked Model/Manager supports, actual centroid arrows, reverse and four right directions; no Inspector preset plane buttons. Context New Sketch is first. New/Edit/Exit is contextual; exit selects its sketch. Create is guarded against duplicate asynchronous clicks.

A separate-window regression exposed a terminal camera pose being swallowed by an unrelated state acknowledgement. The channel defers camera publication during animation and independently tracks the last published local camera, ensuring the final owned pose is transmitted. Keep strict physical F8/middle-click parent/child assertions.

## Verification and delivery

Local retained domain corpus: 225 passed. The full Chrome 156/NVIDIA browser run at 4df8bd5e1f9f8dcb578bdd8241adeede065bef7b passed with zero page errors; actual new interaction Save/Close/Reopen and all retained flows passed. Five independent vector PDFs passed. A fault-injected absence of navigator.gpu passed the real semantic-support path and is explicitly not physical GPU evidence. A relocated development package passed. Final exact-head CI and immutable public delivery evidence are maintained on [PR16](https://github.com/Krozzeo/AxiomEngineerCAD/pull/16); source snapshots do not assert publication merely from local tests.

Focused development harness: `ENGINEER_HARDWARE=1 node scripts/check-sketch-interactions-ui.mjs`; evidence `.axiom/sketch-interactions-ui/`. `verifyInteractionProjectUI` creates a test identity from installed current demo source, without copying immutable history, and verifies actual Save/Close/Reopen. `tests/sketch-interactions.test.mjs` contains exact numeric/negative/old-reader tests. Full browser preserves earlier review/native/authorization/docking/camera/five-PDF checks. Historical unsnapped primitive fixtures explicitly hold Ctrl; new acceptance proves default Snap. GPU absence uses a labeled actual semantic-list path, never a physical picking claim.

Before delivery complete the full retained corpus, independent PDFs, relocated package checks, exact-head Win/Linux CI, immutable experimental ZIP+manifest and genuine public Platform discovery/install/activate/launch. Current candidate status is not delivery. Update PR/body and workspace delivery JSON with exact commit, workflows, bytes/hash and real installation evidence. No merge or stable claim.

Delivered 0.1.7 evidence: CI 41565076456, publication 41566221173, ZIP 99,900,683 bytes SHA256 855a5d6bffd2ff5c22781b05a542aa297477fa644012ebf29688be3274770383; public Platform13/Chrome 156/NVIDIA/fivePDF, zero page errors. See workspace deliverables/Engineer-E1-M5-0.1.7-*. Earlier intermediate immutable artifacts remain preserved.

## Preview-response ordering recovery

Candidate 257751d Windows PR CI exposed an intermittent lost re-enable preview (the matching push run and Linux passed). A deterministic actual-server response-order test reproduced it: a completed old proof/status response arriving after the next build acknowledgement cleared the newer tracked job. No blind retry was used as acceptance. The frontend now captures job/desired/source epoch before polling and retires superseded status/results/render completion. `browser-preview-ordering.mjs` holds genuine old status and result responses across Disable/Enable, asserts only the current revision is published, and runs in the installed acceptance fixture before sketch interactions. It failed before the fix with the same source-changed/empty Model symptom and passed afterward. Backend revisions, source checks, authority and geometry computation are unchanged. Final CI/public installation must use the later corrected head, not 257751d.
