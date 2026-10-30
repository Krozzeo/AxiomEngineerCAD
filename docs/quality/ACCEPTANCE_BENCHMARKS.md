# Acceptance Profiles, Benchmarks and Evidence

**Baseline:** Master v0.2.0. **Status:** acceptance *schema* approved; E0.M6 candidate measured bounds are recorded in [profile v1](E0_M6_PROFILE_V1.json); integrated acceptance still requires E0.M7 owner signoff. Never present a proposed target as a measured result.

## 1. Profile dimensions to freeze in E0

| Dimension | Required declared fields | Evidence |
| --- | --- | --- |
| Runtime | Windows/browser/Platform SDK/kernel/Wasm/native worker/solver versions | exact SHAs, binaries and lockfile |
| GPU | adapter, driver, WebGPU availability, fallback and device state | real device vs Null test clearly separated |
| Geometry | unit/shape scale, B-Rep complexity, face/edge count, feature graph depth | independent model fixtures and checksums |
| Sketch | entity/constraint count, relation classes, rank conditions | expected DOF/conflict fixtures |
| Assembly | unique definitions/instances, nesting, mate count/complexity | grounded/underdetermined/redundant/inconsistent states |
| Drawing | sheet size, projection convention, view count, hidden-line complexity | independent vector/PDF/dimension checks |
| AI | model/provider/version, text/tools/vision capabilities, source document type | provider-real vs deterministic tool/mock evidence |
| Resources | memory, worker lifecycle, cancellation deadline, query budget, document size | measured time/peak memory/result classification |
| Security | network allowed/denied, exposure profile, malformed imports, path boundaries | authorization/rollback and audit receipts |

A profile specifies **supported**, **unsupported** or **indeterminate** cases. Fixture manifests are versioned, immutable once baselined, and distinguish tested source/expected outcomes from measured run results. If a hardware/complexity target fails, report failure; to adjust the scope, review an ADR with user-visible consequence.

## 2. Exactness and numerical oracles

At minimum use independent references for dimensions, volume, area, mass/inertia where applicable, projection geometry, page sizes and tolerances. Shape comparison separates:
- geometric equivalence (within explicit length/angular/volume and reference-profile tolerances);
- exact-kernel shape validity/manifoldness;
- topological identity/provenance of referenced edges and faces;
- parameter/features/history editability;
- stable version and drawing annotations.

No screenshot, single volume match or source-generated self-roundtrip can stand alone as proof of correctness.

## 3. Named E0 tests and pass gates

| Gate | Minimum executable fixture | Fail / redesign trigger |
| --- | --- | --- |
| E0.M1 | direct + Platform create/open/status/save/close, stale/unknown/busy | unauthorized write or false-ready |
| E0.M2 | sketch DOF/conflict, B-Rep extrude/cut/revolve, split/merge persistent references | false-positive face retarget, silent invalid solid |
| E0.M3 | grounded two-body mate, redundant/inconsistent/singular, constrained drag | corrupt pose, false fully-constrained status, uncontrolled drag |
| E0.M4 | copy/reopen, missing external definition, immutable snapshot, crash/stale | lost work, broken identity, invalid historical closure |
| E0.M5 | typed manual/headless command, cancelled/stale/unauthorized proposal | MAIN mutated on rejection, untyped silent error |
| E0.M6 | exact HLR/view/dimension vector PDF, real GPU picking, data exposure denied | raster-only claimed vector, mismatched picker, unapproved upload |
| E0.M7 | integrated sketch→feature→reference edit→mate→drawing→proposal and reopen | broken authoritative path or unresolved P0 risk |

E0.M7 produces accepted benchmark profile versions and Go/Redesign/Stop decision. Later milestones inherit these regressions and add functionality without weakening earlier tests.

## 4. MVP acceptance projects

- **A:** Fully/underdefined sketches with correct DOF, redundant vs conflicting constraints, safe drag, dimensions, reopen.
- **B:** Moderate multi-feature parametric part, named equations, patterns/revolve, exact physical oracle, STEP v1, native reopen.
- **C:** Multi-instance assembly, spatial mates, constrained motion, interference, physical properties, Latest/Pinned, immutable history.
- **D:** Existing moderate part → associated engineering draft, dimensions/views/section when needed, genuine vector PDF, human review.
- **E:** Independently authored sufficiently dimensioned drawing → editable parametric model with bounded reconstruction and reprojection; ambiguous cases correctly clarify/abstain.

Moderate is **not** an acceptable sole criterion. Each project must specify actual feature/view/mate counts or shapes, supported input format, fixture ID, difficulty class, withheld holdout state, numeric bounds and expected failures before accepted execution.

## 5. Report template / merge gates

Every milestone result records: requirement IDs; exact code commit and upstream/library versions; named profile/fixture hashes; positive/negative/lifecycle case IDs; commands; measured values and pass/fail; real hardware/provider vs simulator/mock labels; crash/recovery and security outcome; screenshots/PDF where meaningful; known unsupported cases; deviations/ADRs; owner acceptance status. CI pass cannot replace owner-visible milestone review. Never declare a milestone passed from stale SHAs, empty wrappers, synthetic counters or unaudited visual plausibility.

References: [Master §§17–20](../../MASTER_DESIGN.md#17-nonfunctional-acceptance-contracts), [Requirements matrix](REQUIREMENTS_TRACEABILITY.md), [AI protocol](AI_EVALUATION.md).
