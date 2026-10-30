# Implementation status

Date: 2026-10-30. Master: v0.2.0. Software: **0.0.2 experimental geometry and sketch lab**.

| Milestone | State | Evidence |
| --- | --- | --- |
| E0.M1 | Published 0.0.1; owner authorized progression | [Report](docs/milestones/E0_M1_REPORT.md), immutable build at a1958f378c524b65cf50212e92c53937bbc9f998 |
| E0.M2 | Review candidate; owner acceptance pending | [Plan](docs/milestones/E0_M2_PLAN.md), [report](docs/milestones/E0_M2_REPORT.md), ADR-001–004 experiments |
| E0.M3–M7 | Planned; not started | No native schema freeze or integrated E0 acceptance |
| E1–E6 | Planned; not started | Broad CAD workflows remain future work |

Actual capabilities: Platform lifecycle and authenticated metadata editing; isolated exact OCCT extrusion/cut/revolution/union/intersection and STEP roundtrip probes; bounded producer/history reference diagnostics; PlaneGCS 2D DOF/conflict/redundancy/singularity/drag probes; editable lab with CPU tessellation preview and face inspection; version-owned Load Demos document; explicit keep/save/reopen of a bounded recipe.

Local proof: Windows x64, Node v24.21.0, Chromium 141.0.7390.37; 27 tests including a 29-case numerical/topology/solver corpus, browser direct and real Hub flows, zero page errors. Exact final remote CI/publication evidence belongs to the PR head and immutable release, independently of local results. Release delivery requires actual public catalog/install/launch verification.

Format 0 / E0.M2 is provisional; E0.M1 documents remain readable. No final kernel/solver/schema decision, arbitrary STEP importer, general feature editor, assembly solver, WebGPU, drawing, AI or manufacturing acceptance is claimed. Full crash recovery/migrations remain E0.M4. Known singular/merge/import/kernel-profile cases refuse uncertain references.

Platform **0.1.12** remains pinned to 6d240845cd77eb1879738d32c9f2b8fcfd7297c5 with lockfile integrity. Geometry dependencies and bundled corresponding sources: [legal record](legal/GEOMETRY_DEPENDENCIES.md). Publication does not imply merge to main or owner acceptance.
