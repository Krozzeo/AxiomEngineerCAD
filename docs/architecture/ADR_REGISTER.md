# Architecture Decision Register — Axiom Engineer CAD

**Design baseline:** Master Design v0.2.0. **Implementation status:** E0.M1 review candidate; owner acceptance pending. **Authority:** Owner-approved design and reproducible milestone evidence. **Scope:** E0 proof and subsequent controlled redesign.

E0.M1 implementation proposal: [ADR-015 — Provisional shell and Platform pin](ADR-015-E0-M1-PROVISIONAL-SHELL.md). This does not accept or replace pending foundational ADR-001–014.

## Rules

An ADR records a real choice, never a speculative implementation claim. Each decision has an ID, author/owner, status (Proposed / Experimenting / Accepted / Rejected / Superseded), affected requirement IDs, exact repository/source versions, context, alternatives, consequences, security/license analysis, benchmark fixture IDs, numeric results, rollback/compatibility effect, downstream milestones and owner signoff. "Accepted" requires replicable evidence and owner approval. An experimental default is not a binding product contract. Architecture decisions may change through a new ADR; do not rewrite the old record to hide failed assumptions.

**Risk gate:** an unresolved or rejected P0 decision blocks dependent schema freeze/feature expansion. Evidence can justify a design change, but not silent downgrading of the approved MVP.

## Pending foundational decisions

| ID | Decision to make | Proof required | Gate | Status |
| --- | --- | --- | --- | --- |
| ADR-001 | Exact B-Rep kernel / Wasm vs native worker | Boolean, extrude, revolve, STEP, HLR, memory, cancellation, license/rebuild | E0.M2 | Pending |
| ADR-002 | 2D solver and constraint algebra | DOF/rank, redundant vs inconsistent, drag, singular cases, license | E0.M2 | Pending |
| ADR-003 | Persistent geometric/topological identity | Feature lineage, split/merge, reorder, semantic selector and false-retarget tests | E0.M2 | Pending |
| ADR-004 | Units, tolerance and shape-scale profiles | Independent oracles, canonical units, precision and failure taxonomy | E0.M2/E0.M6 | Pending |
| ADR-005 | 3D mate solver and supported mate surfaces | Ground, spatial DOF, motion, singularity, conflict, license/runtime | E0.M3 | Pending |
| ADR-006 | Native container and cross-document graph | Stable identities, portable paths, snapshot/atomicity/crash/migration | E0.M4 | Pending |
| ADR-007 | Version publication and Latest compatibility resolver | Pinned/current/ambiguous, historical closure, safe update rollback | E0.M4; E4.M4 implementation | Pending |
| ADR-008 | Semantic tool schemas and proposal Apply | Shared authority, stale base, permission envelopes, replay/rollback | E0.M5 | Pending |
| ADR-009 | Browser/daemon/WebGPU CAD selection | Two launch modes, actual GPU, picking geometry correspondence, fallback | E0.M6 | Pending |
| ADR-010 | Vector drawings and exact HLR | Independent view/dimension/reference PDF output checks | E0.M6 | Pending |
| ADR-011 | Engineering-data external exposure default | Local/restricted/full, audit, offline and permission-denial tests | E0.M5–M6 | Pending |
| ADR-012 | E0 integrated foundation go/no-go | Entire authoritative sketch→model→mate→drawing→proposed-edit slice | E0.M7 | Pending |
| ADR-013 | STEP import/export bounded supported subset | Geometry/structure, units, invalid input, source preservation and licensing | E3.M5 | Pending |
| ADR-014 | Provider/model-supported AI cohorts | Independent vector/raster and hosted/local capability matrix | E2/E5 | Pending |

## Suggested record format

- **Title / status / date / author / owner**.
- **Requirements and milestone dependencies**.
- **Observed problem**, with real fixture/source links and known counterexamples.
- **Alternatives** (including defer or change architecture), measured comparison, license/security implications.
- **Decision and explicit non-goals**.
- **Behavioral and numerical contracts**, error/unsupported responses, operation budgets.
- **Migration/rollback/compatibility effects**, including old documents and external consumers.
- **Evidence:** exact commits, runtime, fixture hashes, commands, measured output, real vs Null/mock distinction.
- **Review outcome:** accept, revise or stop; owner signoff; follow-up changes to master, contracts and traceability.

## Decision precedence

Current explicit product-owner decision and accepted contract > accepted ADR scoped to that implementation choice > exact published upstream interface > proposed design experiments > code convenience. If an accepted ADR conflicts with the master, update the master and dependency/acceptance map in the same reviewed change. Requiring an ADR is **not** a license for coding agents to silently pick a kernel, solver, version-policy or security default.

References: [Master §21](../../MASTER_DESIGN.md#21-risks-experiments-and-architecture-decision-gates), [Axiom Platform product contract](https://github.com/Krozzeo/AxiomPlatform/blob/main/docs/architecture/PRODUCT_CONTRACT.md), [Platform ownership](https://github.com/Krozzeo/AxiomPlatform/blob/main/docs/architecture/OWNERSHIP_MATRIX.md).
