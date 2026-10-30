# Axiom Engineer CAD — Semantic Tool and Transaction Contract

**Baseline:** Master v0.2.0. **First normative schema gate:** E0.M5. **Status:** E0.M5 bounded executable experiment in 0.0.5; owner review pending. [Implemented versioned catalog](SEMANTIC_TOOLS_V1.json) and [ADR-008](../architecture/ADR-008-SEMANTIC-REVIEW.md) define the actual installed subset and transaction limits. The broader contract below remains the target for later capabilities. Generic transport/account/provider/review primitives belong to [Axiom Platform](https://github.com/Krozzeo/AxiomPlatform/blob/main/docs/architecture/AI_CONTRACT.md); CAD semantics belong to Engineer.

## 1. One authoritative command path

UI actions, headless automation and agents call the same versioned Engineer domain commands and validators. Preview interactions may use faster temporary calculations but never commit unvalidated state. No agent-specific route may bypass unit/geometry, reference, version, permission or document transaction rules. Agent tools represent typed CAD intents, not simulated mouse clicks as their primary interface.

## 2. Tool schemas and envelope

Every tool has an explicit versioned name, capability/feature flags, read/write/external effect class, schema/units/constraints, resource limits, preconditions, deterministic validation, typed result/error and permission requirements. For mutations, record at least:

| Field | Purpose |
| --- | --- |
| operationId / traceId | Idempotence, causal correlation, replay, recovery |
| actor / scope / capability | Authorized user-agent/provider task, document/project resource boundary |
| expectedDocumentRevision | Optimistic concurrency; stale proposal rejection |
| expectedDependencyVersions | No hidden cross-document version drift |
| toolName / toolVersion / schemaVersion | Stable contract and backward compatibility |
| inputs | Typed dimensions/units, stable entity IDs and semantic selectors |
| effectClass | ReadOnly, LocalProposal, MainMutation, FileExport or ExternalPublication |
| validation | Shape, constraint, reference, version and security checks actually run |
| receipt | Outcome, affected IDs, new revision or unchanged state, artifacts and diagnostic trace |

The typed error taxonomy includes UnsupportedCapability, InvalidInput, InvalidUnits, InvalidGeometry, ConstraintConflict, SolverIndeterminate, AmbiguousReference, LostReference, MissingDependency, IncompatibleVersion, RevisionConflict, PermissionDenied, Cancelled, ResourceLimit, ProposalStale, OperationFailed and ResultUnknown. Underlying kernel/provider messages may be redacted metadata; never replace structured errors with generic success.

All measurements are typed quantities with units, frames and tolerance/evidence. IDs must survive save/reopen. Queries use field projection, pagination/limits and resource/token budgets; avoid entire-document dumps or image/OCR-only truth.

## 3. Initial vertical tool family

| Family | Minimal v0 proof | Later coverage |
| --- | --- | --- |
| Document | inspect/status, validate, persistence/version query | publication, restore, migration |
| Geometry/sketch | add point/line/circle, add dimension/constraint, solve/DOF | arc, trim, mirror/pattern |
| Feature | exact extrude/inspect, parameter edit/regenerate | cut, revolve, patterns, fillets |
| Structure/mates | inspect definition/instance, simple spatial mate/solve | full mates and Latest/Pinned |
| Drawing | single orthographic view, associated dimension, vector export | sections, multi-sheet, BOM |
| Context/diagnostics | bounded dependency and semantic face query, trace, targeted visual capture | high-complexity context planning |
| Proposal | isolate, diff, validate, human Apply, rollback/stale refusal | bounded multi-step workflows |
| Import/export | analyze source/fidelity, validate STEP geometry | proprietary adapters |

This is a capability-level target. The exact schema and naming are ADR-008/E0.M5 deliverables; the Master examples are not preexisting Platform tool names.

## 4. Transactional agent flow

1. Resolve authorized project/document and explicit data exposure.
2. Read base revision and effective version dependencies.
3. Query bounded semantic context; optional targeted visual capture is supplemental.
4. Construct plan/clarifications.
5. Run validated, cancellable operations in isolated proposal state.
6. Recompute exact geometry/constraints/version dependencies and check proposed drawings.
7. Present meaningful feature/parameter/geometry/drawing diff, errors, provenance and relevant screenshots.
8. Obtain human Apply approval, re-check base/dependency versions and permissions.
9. Atomically commit or reject with unchanged main document and exact receipt.
10. Reconcile uncertain outcomes through operation ID; never blind-retry writes.

Offline deterministic scripts prove tool behavior without any provider. Separate real model runs prove provider capability/quality; mocked API traffic is not proof of inference.

## 5. Provider neutrality and model capabilities

Platform owns account credentials, secure transport, generic tool runtime, cancellation and usage. Engineer discovers supported tool calling, vision/image inputs, context size, limitations, local vs hosted classification and available model versions. A text-only local model may operate on semantic CAD data even without visual perception; image-dependent reconstruction must return UnsupportedCapability or request a suitable configured model, not fabricate vision support.

No provider account automatically authorizes remote geometry transmission, export, Apply or publication. Apply and external writes require separate privileges.

## 6. Conformance suites

- UI-triggered and headless commands converge to equivalent authoritative CAD state under same revision.
- Tool schema rejects unknown enum, wrong unit, stale schema, missing reference, path escape and nonfinite value.
- Query response budget remains bounded; pagination is consistent; no stable IDs become GPU indices.
- Cancelled, stale, unauthorized or resource-limited proposal cannot change MAIN.
- Duplicate operation ID returns same receipt or ResultUnknown requiring reconciliation.
- Human Apply compares base and dependency versions; failed postcondition rolls back.
- Tool/permission compatibility tests run against pinned Platform SDK and both direct and Hub launches.
- External transmission is denied under Local profile even when a provider account exists.
- Independent scripted tests pass without login, network or model; real AI fixture evaluations reported separately.

References: [Master §14](../../MASTER_DESIGN.md#14-agent-native-architecture-and-ai-workflows), [Data exposure](../security/DATA_EXPOSURE.md), [AI evaluation](../quality/AI_EVALUATION.md).
