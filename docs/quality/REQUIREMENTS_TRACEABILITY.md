# Requirement → Milestone → Acceptance Traceability

**Baseline:** Master Design v0.2.0. **Implementation status:** all requirements are **Planned / Not yet accepted**. This is a versioned design-to-test map, not evidence that tests or code exist. Every requirement can be traced to milestone proof and final integration acceptance.

## 1. Priority and status discipline

P0 = architecture/data-integrity/reliability blocker, P1 = required approved MVP behavior, P2 = important later architectural extensibility (not an MVP implementation promise). Each requirement owns stable ID, source section, planned milestone gate, positive/negative fixture IDs, test/evidence status and owner disposition. New MVP features require explicit owner scope decision and dependent roadmap update; missing P0 failures block downstream claims.

## 2. MVP requirements

| Requirement | Normative outcome | Earliest evidence / mature acceptance | Canonical project |
| --- | --- | --- | --- |
| CAD-R001 P0 | Platform direct/Hub native create/open/save/close and authorized paths | E0.M1 / E6.M3 | A–E shared |
| CAD-R002 P0 | Exact B-Rep editing and regeneration, independent of GPU | E0.M2, E1.M5 / E3.M6 | B |
| CAD-R003 P0 | Stable semantic topology or explicit ambiguity/loss, never false retarget | E0.M2 / E1.M5, E6.M1 | B, C, D |
| CAD-R004 P0 | Distinct 2D DOF/consistent redundancy/inconsistency and constrained drag | E0.M2, E1.M3 / E3.M1 | A |
| CAD-R005 P0 | 3D rigid assembly solve, grounded and remaining DOF, constrained motion | E0.M3 / E4.M2–M3 | C |
| CAD-R006 P0 | Single logical document with stable definitions/instances/drawings/frames | E0.M4 / E4.M1, E5.M1 | B, C, D |
| CAD-R007 P0 | Revision/recovery snapshots/immutable publications/Latest-Pinned and external refs | E0.M4 / E4.M4, E6.M1 | C, D |
| CAD-R008 P0 | Durable atomic saves, migration/refusal, crash and stale-write recovery | E0.M4 / E6.M1, E6.M3 | A–E shared |
| CAD-R009 P0 | Typed semantic API, shared manual/agent authority, isolated review/Apply | E0.M5 / E2.M1, E6.M4 | A–E shared |
| CAD-R010 P0 | CAD-specific hardware WebGPU picking matches exact semantics | E0.M6 / E1.M1, E6.M2 | A–E shared |
| CAD-R011 P0 | External AI context exposure is task-authorized/audited, local-only preserved | E0.M5–M6 / E6.M1 | D, E |
| CAD-R012 P1 | Sketch primitives, arcs, trim, mirror, pattern, dimensions/constraints | E1.M2–3 / E3.M1 | A |
| CAD-R013 P1 | Named variables/equations, scoped typed parameter DAG and Manager | E1.M4 / E3.M4 | B |
| CAD-R014 P1 | Add/cut extrude, revolve, mirror/pattern and bounded finishing | E1.M5 / E3.M2–M3 | B |
| CAD-R015 P1 | Assembly instances, mating incl tangent and width, free move and errors | E4.M1–M3 / E4.M6 | C |
| CAD-R016 P1 | Measurement, material, exact mass/COM/inertia and assembly interference | E1.M5 / E4.M5 | B, C |
| CAD-R017 P1 | A0–A4 multi-sheet associative views, cuts, dimensions, notes, BOM/balloons | E0.M6/E2.M2 / E5.M1–M3 | D |
| CAD-R018 P1 | Genuine vector PDF with exact HLR and dimensional consistency | E0.M6 / E5.M3 | D |
| CAD-R019 P1 | Bounded exact STEP import/export, source preservation and fidelity report | E0.M2 / E3.M5 | B |
| CAD-R020 P1 | AI model→reviewable engineering draft from moderate model | E2.M3 / E5.M4 | D |
| CAD-R021 P1 | AI independent drawing→editable moderate parametric part | E2.M4 / E5.M5 | E |
| CAD-R022 P1 | Offline operation, authorized project paths, local service security | E0.M1/E0.M6 / E6.M1–M3 | A–E shared |
| CAD-R023 P1 | Deterministic independent fixtures + real-provider, actual GPU evidence and UI parity | E0.M7 / E6.M4 | A–E |
| CAD-R024 P2 | Pluggable proprietary translators and partial feature recognition provenance | E3.M5 design / post-MVP build | Future |
| CAD-R025 P2 | Rich configurations, manufacturing approval/GD&T, enterprise PDM/cloud | Data extensibility at E0.M4 / post-MVP build | Future |

## 3. E0 risk proof mapping

| Proof | Hard failure preventing further investment | Required artifact |
| --- | --- | --- |
| E0.M1 | Cannot launch securely under accepted Platform SDK | lifecycle conformance run + SDK/IPC pin |
| E0.M2 | False positive topology or invalid exact geometry; 2D solver unusable | independent fixtures, kernel/solver/topology ADR |
| E0.M3 | Intractable 3D mate/drag semantics without safe failure | spatial solver fixture corpus, mate ADR |
| E0.M4 | Nonportable/unrecoverable native doc or inconsistent dependency closure | native format ADR, version graph and crash suite |
| E0.M5 | Manual/agent write divergence or proposal leakage | schema catalog, deterministic tool/concurrency suite |
| E0.M6 | Inexact vector PDF/picking or unapproved provider transmission | GPU/drawing/security evidence and benchmark profiles |
| E0.M7 | Vertical end-to-end cannot preserve shared invariants | go/no-go ADR, signed fixture/profile baseline |

## 4. Acceptance artifact indexing

Plan named versioned fixtures A-SKETCH-*, B-PART-*, C-ASSEMBLY-*, D-DRAFT-*, E-RECON-*, TOPO-*, SOLVER2D-*, SOLVER3D-*, VERS-*, DRAW-*, SECURITY-* and TOOL-*; placeholder categories are **not** existing test files. Each fixture manifest must declare source, input hash, expected result, numerical tolerance profile, invalid-case expectation, prerequisite IDs and replay command. Every milestone report lists exact requirement IDs and fixture IDs, failing and passing outcomes, deviations and owner approval.

A requirement only becomes **Accepted** after its full mature acceptance milestone and current owner review, not because a narrow E0/E2 probe passed. Store actual acceptance status in IMPLEMENTATION_STATUS.md after coding begins; do not edit this file to fabricate completion.

References: [Master roadmap](../../MASTER_DESIGN.md#18-development-generations-and-milestones), [Benchmark profile](ACCEPTANCE_BENCHMARKS.md), [ADR register](../architecture/ADR_REGISTER.md).

## E0.M7 integrated candidate baseline

[ADR012](../architecture/ADR-012-INTEGRATED-E0-GATE.md) and [corpus](E0_M7_ACCEPTANCE_CORPUS_V1.json) connect sketch/kernel/topology/mate/native closure/tool review/drawing/GPU/IP gates.15 new tests+85 retained; actual Hub human workflow, separately labeled physical GPU, independent current/historical PDF parsing/rendering, actual installed demo. The archived0.0.6 decoder refuses new profiles without writes. Final exact CI/public provenance belongs to delivery PR/release. Owner decision pending; E1 unstarted.
