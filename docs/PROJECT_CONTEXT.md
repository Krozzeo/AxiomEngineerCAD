# Compact Engineer context

Current candidate: **0.4.5 / E4.M4** on `engineer/e4-m4-versioned-assemblies`, based on the selective-verification branch and delivered CAD0.4.4. Read [M4 scope/demo](E4_M4_VERSIONS.md), [ADR032](architecture/ADR-032-MOTION-SESSIONS-PUBLISHED-COMPONENTS.md) and the retained owner request map. This adds published versions/Latest/Pinned plus grouped motion and assembly UI corrections. Focused domain and actual hardware UI checks passed; exact-head full acceptance and public installation remain pending.

Last immutable delivery0.4.4/PR26 passed exact-head Windows/Linux379 native tests each, full browser/PDF/36 STEP round trips/performance and actual public Platform0.1.13 install with Chrome/NVIDIA hardware.561 packaged source files matched; zero page/renderer errors. Provenance is in PROJECT_STATE.json. Main/stable0.3.13 remains unchanged.

Start with `npm run context`. MASTER_DESIGN.md is the canonical intent; its normalized SHA256 matches the reviewed baseline in PROJECT_STATE.json. Reuse unchanged intent and read affected sections. Full design review is required if that hash changes or a foundational/scope contradiction appears. A compact brief is navigation, never implementation proof.

Platform owns lifecycle, credentials and shared AI/review SDK. Engineer owns exact geometry, sketches, parametric history, versions, assemblies, drawings and semantic CAD tools. Preserve native identities, revision checks, human AI Apply, atomic persistence, immutable releases and user files. GPU IDs only author references against their native manifest; they never establish persistent geometry identity.

Retained M3 scope: analytic cylinder/plane and external parallel cylinder/cylinder tangency; Between plane sets (3–4 refs); single-reference Fixed plus retained M2 fixed pairs; native draft preview/editing; worker-based feasible pointer projection and continuous queued motion; reciprocal Components/Mates trees; owner Project/operation corrections. No arbitrary-surface tangency, collision avoidance or global numerical convergence claim. External assembly files are rigid at file boundaries. Latest/Pinned updates and interference remain later milestones.

| Change | Entry points | Focused checks |
| --- | --- | --- |
| Published versions/updates | src/workspace/publications.mjs; app/published-versions.mjs | e4-m4-versions.test.mjs, browser:versioned-assemblies |
| Grouped motion/GPU | src/workspace/motion-session.mjs; app/assembly-stage.mjs; app/gpu-motion.mjs | e4-m4-motion.test.mjs, actual M4 and M3/M2 neighbors |
| Mates/native references | src/assembly/native-profile.mjs, native.mjs, solver.mjs, profile.mjs; src/workspace/session.mjs | e4-spatial-mates.test.mjs, e4-m3-motion.test.mjs |
| Motion/preview/selection | app/assembly-motion*.mjs, assembly-gizmo.mjs, assembly-controls.mjs, assembly-mates.mjs, proof.mjs | browser-e4-m3.mjs, browser-e4-m2.mjs |
| Component/Mate trees | app/components-workbench.mjs, mate-tree.mjs | actual reciprocal tree, Edit/Delete and scope handoff |
| Project/layout | app/workspace-ui.mjs, project.css, dock-workbench.mjs | side resize, default layout, filenames/copies |
| Sketch/parameters/features | app/sketch-workbench.mjs; src/sketch/, src/parameters/, src/extrusion/ | existing relevant domain/browser tests |
| Delivery | AGENTS.md, DEVELOPMENT_WORKFLOW.md, MILESTONE_DELIVERY.md | exact-head Windows/Linux; public install and real GPU |

Begin each implementation block with `npm run verify -- --plan` or an explicit area/suite. Read the report summary; rerun only failed focused suites. Update impact rules and declare fixtures for new scenarios. Unknown code falls back to full local verification; partial evidence never grants publication.

Focused tests diagnose changes. Complete `npm run check`, `npm run test:browser`, independent PDF/STEP and performance checks on Windows/Linux remain publication acceptance. Freeze source/version/docs first; final delivery evidence is external to the accepted source commit. Do not restart acceptance for a cosmetic evidence commit. Do not skip a failing required test or claim software rendering as hardware proof.
