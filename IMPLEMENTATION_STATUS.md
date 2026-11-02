> **Current: 0.1.6 / E1.M5 review candidate.** Exact OCCT extrusion of real closed sketch profiles and additive history; M5 semantic sketch metadata/role-specific Inspector; continuous dimensions; safe constrained drag without enabling JavaScript evaluation; inline parameter/binding/model-dimension tables with explicit source ownership across separate windows. [Plan](docs/milestones/E1_M5_PLAN.md), [report](docs/milestones/E1_M5_REPORT.md), [ADR023](docs/architecture/ADR-023-EXTRUSION-AND-SEMANTIC-WORKBENCH.md). Local199 domain tests, the complete browser corpus, NVIDIA/Chrome UI and five independent vector PDFs pass. A relocated development ZIP passes its installation/domain corpus. Final exact-head Windows/Linux CI, immutable experimental publication and fresh public Platform install remain delivery gates. No M5 delivery or owner acceptance is claimed yet.

**Previous delivery verified:** 0.1.5 / E1.M4 at `8bb1cc7672c1434c7fd430aa37eb991653a1802d`, PR13, exact PR CI `41380835952` attempt2 Windows/Linux, publication `41382665375`. Immutable experimental ZIP SHA256 `2fceef9d19fb113b550e48495f43cd536347d50372e2fbd67c4cb29418b0a5be`, 99,825,174 bytes; actual public Platform0.1.13 discovery/install/launch, NVIDIA UI and five independent vector PDFs verified. Owner acceptance remains separate. Earlier pending-delivery statements below describe historical snapshots.

> **Current: 0.1.5 / E1.M4 review candidate.** Scoped unit-checked equations, Parameter Manager, physical dimensions, contextual Sketch Manager, principal line/point/circle relations, warm constrained drag and synchronized reference/camera feedback. [Review guide](docs/milestones/E1_M4_REPORT.md), [ADR022](docs/architecture/ADR-022-PARAMETERS-AND-SKETCH-WORKBENCH.md). Exact-head Windows/Linux CI, immutable experimental ZIP/manifest and fresh public Platform installation remain delivery gates. Owner acceptance is separate.

Earlier dated snapshots below are historical.

> **Current: 0.1.4 / E1.M3 review candidate.** Parametric relations and driving/reference dimensions, constrained drag, sketches in the Model viewport, one selection, Feature Manager actions, persisted synchronized visibility and working Undo/Redo. [Review guide](docs/milestones/E1_M3_REPORT.md), [ADR021](docs/architecture/ADR-021-PARAMETRIC-SKETCH-EDITING.md). Exact-head Windows/Linux CI and a fresh public Platform install remain delivery gates; owner acceptance is pending.

Earlier delivery snapshots below are historical.

> **Current:0.1.3 / E1.M2 review candidate.** Real editable point/line/circle/rectangle sketches, construction state and native persistence, shared human/agent commands, selected-state/GPU-frame/origin/axis corrections and optional Platform0.1.13 tab branding. [Test guide](docs/milestones/E1_M2_REPORT.md), [ADR019](docs/architecture/ADR-019-EDITABLE-SKETCH-PRIMITIVES.md), [ADR020](docs/architecture/ADR-020-SELECTION-FRAMES-AND-TAB-PRESENTATION.md). Exact-head CI and public prepared install remain delivery gates. E1.M3 constraints are next and unstarted.

Earlier revision snapshots below describe their historical state.

> **0.1.2 interaction revision:** current-only demos; Auto/hover selection, canonical Origin and smooth reference navigation; Manager, selection-only Inspector, central Document properties, tabbed operations and dirty Save. [Guide](docs/milestones/E1_M1_UX_0_1_2.md), [ADR018](docs/architecture/ADR-018-INTERACTION-WORKBENCH.md). Native0/1 unchanged; E1.M2 unstarted. Final exact-head CI/public-install gates apply.

> **0.1.1 UX revision:** compact CAD header/ribbon, Game Engine five-zone docking/Separate Windows and persistent layout, Panels reopen/reset, reversed horizontal orbit and cursor-centered wheel zoom. [Test guide](docs/milestones/E1_M1_UX_0_1_1.md), [ADR017](docs/architecture/ADR-017-CAD-DOCKING-UX.md). E1.M2 remains unstarted; exact-head CI and fresh public Platform install are delivery gates. Native schema/data and runtime pins unchanged.

# Implementation status

Date: 2026-11-01. Master: v0.2.0. Software: **0.1.4 parametric sketch review candidate**.

| Milestone | State | Evidence |
| --- | --- | --- |
| E0.M1 | Published 0.0.1; owner authorized progression | [Report](docs/milestones/E0_M1_REPORT.md), immutable build at a1958f378c524b65cf50212e92c53937bbc9f998 |
| E0.M2 | Owner validated; published 0.0.2 | [Plan](docs/milestones/E0_M2_PLAN.md), [report](docs/milestones/E0_M2_REPORT.md), ADR-001–004 experiments |
| E0.M3 | Published 0.0.3; owner authorized progression | [Report](docs/milestones/E0_M3_REPORT.md), [ADR-005](docs/architecture/ADR-005-SPATIAL-MATE-PROBE.md) |
| E0.M4 | Published 0.0.4; owner authorized progression | [Report](docs/milestones/E0_M4_REPORT.md), ADR-006/007 |
| E0.M5 | Published 0.0.5; owner authorized progression | [Report](docs/milestones/E0_M5_REPORT.md), [ADR-008](docs/architecture/ADR-008-SEMANTIC-REVIEW.md), [tool schemas](docs/contracts/SEMANTIC_TOOLS_V1.json) |
| E0.M6 | Published0.0.6; owner validated and authorized M7 | [Report](docs/milestones/E0_M6_REPORT.md), ADR-009/010/011, [measured profile](docs/quality/E0_M6_PROFILE_V1.json) |
| E0.M7 | Published0.0.7; owner Go to E1 recorded2026-10-31 | [Report](docs/milestones/E0_M7_REPORT.md), [ADR012](docs/architecture/ADR-012-INTEGRATED-E0-GATE.md), [corpus](docs/quality/E0_M7_ACCEPTANCE_CORPUS_V1.json) |
| E1.M1 | Workbench review candidate0.1.2 (UX revision) | [Plan](docs/milestones/E1_M1_PLAN.md), [report](docs/milestones/E1_M1_REPORT.md), [ADR016](docs/architecture/ADR-016-E1-WORKBENCH.md) |
| E1.M2 | Implemented review candidate0.1.3; delivery gates pending | [Report](docs/milestones/E1_M2_REPORT.md), [ADR019](docs/architecture/ADR-019-EDITABLE-SKETCH-PRIMITIVES.md) |
| E1.M4 | 0.1.5 review candidate; exact CI/public-install gates pending | [Report](docs/milestones/E1_M4_REPORT.md), ADR022, typed expressions and physical sketch UX |
| E1.M3 | Implemented review candidate 0.1.4; exact-head CI/public install gates pending | [Report](docs/milestones/E1_M3_REPORT.md), ADR021 |
| E1.M4–M5, E2–E6 | Planned; not started | Expressions, arbitrary sketch extrusion and broader workflows remain later milestones |

Actual capabilities: Platform lifecycle and authenticated metadata editing; isolated exact OCCT extrusion/cut/revolution/union/intersection and STEP roundtrip probes; bounded producer/history reference diagnostics; PlaneGCS 2D DOF/conflict/redundancy/singularity/drag probes; editable lab with CPU tessellation preview and face inspection; version-owned Load Demos document; explicit keep/save/reopen of a bounded recipe.

E0.M3 adds an original isolated six-DOF spatial solver experiment, local analytic datum mates, two/three-body fixtures, constrained translation/spin and pointer-up movement, rank/DOF/conflict/singularity diagnostics, last-good recovery and opt-in provisional assembly persistence. It is not a general assembly editor or B-Rep surface mating engine.

E0.M4 adds stable graph identities/occurrences, content-addressed immutable closure, local publication candidates, source cache/identity/integrity, independent drawing revision bindings, explicit legacy conversion, recovery journal and durable save receipt. The native source/consumer demos exercise actual kernel update, explicit verified adoption, save/reopen and original-preserving recovery.

E0.M5 adds 17 typed semantic tools, shared manual/proposal commands, actual numerical validation, separate local agent authority, bounded queries/receipts, isolated SDK-journaled proposals, complete human SDK review and revision/dependency-bound atomic Apply & Save. Local-only exposure denies remote transmission. The Review Lab uses an actual local scripted agent endpoint, without evaluating a model/provider.

E0.M6 adds bounded exact HLR/vector A4 drawing with source-linked width, an actual WebGPU viewport/semantic face-edge-occurrence picker, explicit camera interaction modes, human-only current local PDF preparation, minimized denied sharing preflight and redacted audit. These are regenerable proof layouts; authored sheets and full external/nested scenes remain later work.

Local proof: Windows x64, Node v24.21.0, Chromium 141.0.7390.37; 115 tests including 15 workbench, 15 integration and 14 drawing/security and 17 semantic transaction and 18 native storage/reference/crash tests, 29 geometry/2D and 28 spatial cases, browser direct and real Hub flows, zero page errors. Separate real NVIDIA GTX1650/driver32.0.16.1692/Chrome156 hardware picking/device-loss evidence and independent pypdf/pdfplumber/PDFium vector/dimension/render checks pass. Exact final remote CI/publication evidence belongs to the PR head and immutable release, independently of local results. Release delivery requires actual public catalog/install/launch verification.

Native format1 stores the versioned tested graph/probe foundation; legacy format0/E0.M1–M3 remains readable and explicitly convertible with original backup. E0 baseline is accepted within the measured ADR profiles. Arbitrary STEP import, general feature/assembly/drawing editors, real-model AI quality and manufacturing acceptance remain future work. Prepared/replaced writer-process termination and explicit corrupt-file recovery are tested. Platform stale lease ownership and universal hardware power-loss remain separate boundaries. Known singular/merge/import/kernel-profile cases refuse uncertain references.

Platform **0.1.12** remains pinned to 6d240845cd77eb1879738d32c9f2b8fcfd7297c5 with lockfile integrity. Geometry dependencies and bundled corresponding sources: [legal record](legal/GEOMETRY_DEPENDENCIES.md). Publication does not imply merge to main or owner acceptance.

E0.M7 connects one persisted solved sketch/extrusion/face feature, measured plane mate and associative drawing, actual shared manual/proposal review, historical read-only rendering and save/reopen. Four explicit versioned feature-profile decoders require0.0.7 for new studies; the native1 envelope and old documents remain unchanged.19 tools include integration inspect/validate. Owner Go now recorded; E1.M1 is in review.

E1.M1 turns the view into a default CAD workbench with source-linked history/component/mate tree, Inspector, menus/status, canonical reference planes/axes, orthographic/perspective/normal-to/fit, navigation presets and keyboard controls. Seven exact selection classes and21 typed tools, empty-project no-migration UI and old0.0.7-reader compatibility are verified. Source labels are derived presentation; IDs remain stable. Current-editor panel/nav configuration is transient; durable layouts and actual entity dragging remain later gates. The actual new milestone remains owner-review pending.
