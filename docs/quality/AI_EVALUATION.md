# AI Model / Engineering Drawing Evaluation Protocol

**Baseline:** Master v0.2.0. **State:** planned evaluation contract, datasets/targets not yet created. First narrow proof E2; final moderate-complexity Project D/E acceptance E5/E6. This framework tests provider reasoning **separately** from the deterministic CAD engine.

## 1. Two different claims, two suites

**D — Model → drawing:** agent receives an *existing* native parametric model with bounded semantic query tools. It chooses projection/orientation/section, dimension placement and notes under uncertainty; the CAD domain computes exact geometry, dimensions and PDF vectors. Target is a *human-review engineering draft*, not unapproved manufacturing release.

**E — Drawing → model:** agent analyzes independent vector/raster engineering drawings, extracts provenance-linked view/dimension evidence, asks for clarification if underdetermined and creates a feature-based editable model. Reprojection and numerical comparison against an independent CAD oracle are mandatory. A visually similar render or synthetic same-renderer loop is insufficient.

## 2. Fixed complexity cohorts

| Cohort | Input | Expected behavior |
| --- | --- | --- |
| E-A | Fully dimensioned simple orthographic prismatic part | Exact editable sketch/extrusion; comparable 3D and projections |
| E-B | Independent 2–3 view drawing with holes/cuts and dimensions | Parametric solid with correct geometry and feature links |
| E-C | Revolved/patterned part and section views | Bounded editable feature plan, no invented hidden dimensions |
| E-D | Insufficient views, dimensions or multiple plausible depths | Explicit clarification or alternatives; no false certainty |
| E-E | Contradictory dimensions or inconsistent views | Conflict report and refusal of unverified solid |
| D-A | Simple native extruded part | Correct associated views/dimensions/vector PDF |
| D-B | Moderate multi-feature native part | Appropriate view/section arrangement and model-linked dimensions |
| D-C | Missing manufacturing intent | Distinguish unknown tolerances, datum/fit/finish and request human review |

Each cohort has a vector/raster input subtype if applicable. Initial numeric feature/view/dimension bounds and success thresholds must be frozen with fixture manifests by E0/E2 before evaluation is scored. Model-generated drawings may supplement, **not replace**, independently authored and withheld drawings.

## 3. Outcome and quality metrics

Report each axis independently; do not collapse into a single subjective "success":

- **Input interpretation:** view convention, extracted geometry/dimensions and OCR/vector accuracy; source-pixel/path evidence.
- **Geometric correctness:** valid exact solid, dimensions, distance/volume/shape equivalence and projection mismatch under documented tolerances.
- **Parametric editability:** real sketch/constraint/feature DAG, meaningful parameters, independent edit/regeneration test and stable source associations.
- **Drawing technical quality:** view sufficiency, section suitability, legible nonoverlapping annotations, source-bound dimensions and actual vector PDF.
- **Ambiguity handling:** calibration of uncertainty, explicit abstention/clarification, no fabricated hidden geometry or fabrication data.
- **Safety/integrity:** proposal isolation, no stale Apply, source/IP exposure, no unapproved writes or external publication.
- **Efficiency:** context bytes/tokens, semantic tool calls, tool errors/retries, duration, peak resources and provider usage/cost if reported.
- **Human review:** reviewer needed corrections, whether acceptance depended on substantial undisclosed human repair.

Use true-positive, false-positive, false-refusal and unsupported classifications. A valid refusal on underdetermined input is a pass for ambiguity discipline but not a successful geometric reconstruction.

## 4. Independent validation protocol

1. Freeze public training/dev fixtures and a separate withheld holdout corpus from independent authors or third-party technical drawings.
2. Record input hash, declared projection conventions, dimensional completeness and permitted reconstructible feature classes.
3. Execute deterministic CAD commands/oracles without model to prove exact geometry and PDF/reference pipeline.
4. Execute model task with versioned tool context and bounded permissions; capture queries, plans, clarifications, operations, retries and receipts.
5. Human-review the proposal then independently compare exact geometry/annotations and edit history; repeat after dimension edit/reopen.
6. For reconstruction, reproject model against **input** drawings and compare against a separate reference model when available. Do not validate solely by the same renderer that generated the input.
7. Run malformed/ambiguous/contradictory negative cases and cancel/stale/denied transmission cases.
8. Publish real-provider results separated by provider, model version, text/tools/vision capabilities, local vs remote status and actual context budgets; unsupported combinations are explicitly labeled.
9. Re-run on changes to tools, kernel, model/provider, extraction or evaluation profile. Never tune a hidden holdout merely to pass it.

No model is guaranteed to provide tool use/vision simply because the provider is connected. If a local model lacks vision, it may operate with semantic vector extraction; raster reconstruction is correctly unsupported until an actual capable pipeline is available.

## 5. Engineering intent limits

The model cannot infer missing manufacturing tolerances, finish, fits, inspection criteria or design datums from geometry alone. The result may be **geometrically correct** and **reviewable engineering draft**, but not automatically a released manufacturing drawing. Any standard-specific manufacturing claim requires a declared, validated rule set and human signoff beyond this MVP.

## 6. Evaluation evidence package

Store benchmark version, source/expected geometry hashes, vector/raster designation, fixture author independence, model/provider/tool/runtime versions, exact tool trace, prompts with sensitive engineering content redacted, limits and measured correctness, PDF/vector validation, proposed vs applied revisions, ambiguity decisions, hardware and final human review outcome. Mock or manually scripted runs support tool correctness, not AI inference quality.

References: [Master §14](../../MASTER_DESIGN.md#14-agent-native-architecture-and-ai-workflows), [Acceptance](ACCEPTANCE_BENCHMARKS.md), [Data exposure](../security/DATA_EXPOSURE.md).
