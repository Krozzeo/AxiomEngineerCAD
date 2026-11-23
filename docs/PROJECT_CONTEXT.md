# Compact Engineer context

Current candidate: **0.4.4 / E4.M3 remaining mates and responsive motion**, branch `engineer/e4-m3-mates-motion`, based on delivered0.4.3/PR25 (`97c62f5a48e08531ad1f60cce1626f1ce8ceb2d9`). Read [M3 scope and owner checks](E4_M3_MATES_MOTION.md), [ADR031](architecture/ADR-031-RESPONSIVE-ASSEMBLY-MOTION.md) and the retained request. Implementation is ready for full exact-head acceptance; publication and actual public installation remain required. Main/stable0.3.13 is unchanged.

Last immutable delivery0.4.3 passed Windows/Linux372 native tests each, full browser/PDF/36 STEP round trips/performance, and actual public Platform0.1.13 installation with Chrome/NVIDIA hardware.553 source files matched; zero page/renderer errors. See PROJECT_STATE.json for provenance. Owner requested the next milestone and corrections; this is not a main/stable merge.

Start with `npm run context`. MASTER_DESIGN.md is the canonical intent; its normalized SHA256 matches the reviewed baseline in PROJECT_STATE.json. Reuse unchanged intent and read affected sections. Full design review is required if that hash changes or a foundational/scope contradiction appears. A compact brief is navigation, never implementation proof.

Platform owns lifecycle, credentials and shared AI/review SDK. Engineer owns exact geometry, sketches, parametric history, versions, assemblies, drawings and semantic CAD tools. Preserve native identities, revision checks, human AI Apply, atomic persistence, immutable releases and user files. GPU IDs only author references against their native manifest; they never establish persistent geometry identity.

M3 scope: analytic cylinder/plane and external parallel cylinder/cylinder tangency; Between plane sets (3–4 refs); single-reference Fixed plus retained M2 fixed pairs; native draft preview/editing; worker-based feasible pointer projection and continuous queued motion; reciprocal Components/Mates trees; owner Project/operation corrections. No arbitrary-surface tangency, collision avoidance or global numerical convergence claim. External assembly files are rigid at file boundaries. Latest/Pinned updates and interference remain later milestones.

| Change | Entry points | Focused checks |
| --- | --- | --- |
| Mates/native references | src/assembly/native-profile.mjs, native.mjs, solver.mjs, profile.mjs; src/workspace/session.mjs | e4-spatial-mates.test.mjs, e4-m3-motion.test.mjs |
| Motion/preview/selection | app/assembly-motion*.mjs, assembly-gizmo.mjs, assembly-controls.mjs, assembly-mates.mjs, proof.mjs | browser-e4-m3.mjs, browser-e4-m2.mjs |
| Component/Mate trees | app/components-workbench.mjs, mate-tree.mjs | actual reciprocal tree, Edit/Delete and scope handoff |
| Project/layout | app/workspace-ui.mjs, project.css, dock-workbench.mjs | side resize, default layout, filenames/copies |
| Sketch/parameters/features | app/sketch-workbench.mjs; src/sketch/, src/parameters/, src/extrusion/ | existing relevant domain/browser tests |
| Delivery | AGENTS.md, DEVELOPMENT_WORKFLOW.md, MILESTONE_DELIVERY.md | exact-head Windows/Linux; public install and real GPU |

Focused tests diagnose changes. Complete `npm run check`, `npm run test:browser`, independent PDF/STEP and performance checks on Windows/Linux remain publication acceptance. Freeze source/version/docs first; final delivery evidence is external to the accepted source commit. Do not restart acceptance for a cosmetic evidence commit. Do not skip a failing required test or claim software rendering as hardware proof.
