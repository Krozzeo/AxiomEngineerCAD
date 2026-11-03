# ADR-001 — Exact OCCT worker experiment

Status: **Experimenting / review proposal**, not final acceptance. E0.M2; CAD-R002/R019/R023.

Use OCCT V8_0_1 through unmodified replicad-opencascadejs 1.1.0 and the MIT replicad 1.2.0 adapter as a bounded feasibility candidate. Alternative native OCCT adds a platform runtime/distribution requirement; full opencascade.js adds a larger API/build surface; the Game Engine static importer cannot edit B-Rep. This choice is confined to the lab and does not freeze the product kernel or document schema.

Actual Wasm performs rectangular sketch extrusion, circular-profile subtractive extrusion, analytic revolution, fuse/common, shape checking, mass-property volume/area, tessellation and exact STEP roundtrip. Closed-solid acceptance uses OCCT BRepCheck_Analyzer with geometric/exact checks, declared solid counts and separate analytic dimension/volume/area oracles. Invalid self-intersecting profiles, open shells and an edge-touch compound are rejected; a valid compound is not mislabeled a single valid part.

Workers accept finite typed recipes only. Node processes use 192 MiB JS old-space, a 20-second parent deadline, cancellation by process termination, 64 bounded sketch primitives, four holes and a 4 MiB result cap. Peak RSS is measured and a 768 MiB postcondition is checked. This is **not** an OS-level hard Wasm/RSS quota; large untrusted imports are not exposed. Deadline/cancel/stale-result tests preserve the committed document. Results and limits belong to exact profile/environment evidence, not universal latency claims.

LGPL binaries remain separate replaceable JS/Wasm files. Prepared deliveries contain full immutable corresponding-source archives and build/replacement instructions under legal/GEOMETRY_DEPENDENCIES.md. Upstream binaries are integrity-pinned; an independent bit-for-bit rebuild has not been performed. License/build review remains part of owner signoff.

Evidence: E0_M2_REPORT.md, geometry.test.mjs and the actual package/browser validation. No assembly, HLR/PDF or WebGPU acceptance. Rollback: retain the prior 0.0.1 installation and E0.M1 documents; version-0 E0.M2 recipes require this new build and are refused by the older reader.
