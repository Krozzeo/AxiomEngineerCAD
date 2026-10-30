# Axiom Engineer CAD — Master Design Document

**Document version:** 0.2.0 (architecture-hardening revision)  
**Date:** 2026-10-28  
**Product:** Axiom Engineer CAD  
**Repository:** https://github.com/Krozzeo/AxiomEngineerCAD  
**Status:** Approved MVP functional scope, revised staged engineering contracts and risk gates; **E0.M2 validated, progression after E0.M3 authorized; E0.M4 native foundation is a review candidate; full CAD and final container/schema acceptance remain pending** (see IMPLEMENTATION_STATUS.md)
**Audience:** Product owner, human contributors, coding agents, CAD/geometry specialists, test agents

> **Authority and interpretation.** This is the canonical product-intent, architecture, MVP-scope and delivery-plan document for Axiom Engineer CAD. It consolidates owner-approved decisions. It is **not** evidence that features exist. An implementation, solver, data format, provider integration or hardware profile is accepted only after its milestone tests and owner review. Specific third-party technologies are candidates until their E0 gates pass. Do not infer missing product requirements from Axiom Game Engine implementation details.

## Contents

1. [Vision, scope and success](#1-vision-scope-and-success)
2. [Axiom family and source references](#2-axiom-family-and-source-references)
3. [Non-negotiable design principles](#3-non-negotiable-design-principles)
4. [Product architecture and ownership](#4-product-architecture-and-ownership)
5. [Unified engineering document](#5-unified-engineering-document)
6. [Revisioning, versions and dependency policy](#6-revisioning-versions-and-dependency-policy)
7. [Geometry, numerical foundations and topology](#7-geometry-numerical-foundations-and-topology)
8. [Sketching and constraint solving](#8-sketching-and-constraint-solving)
9. [Parametric feature modeling](#9-parametric-feature-modeling)
10. [Assemblies and positioning constraints](#10-assemblies-and-positioning-constraints)
11. [Drawings and documentation](#11-drawings-and-documentation)
12. [Parameters, equations, materials and properties](#12-parameters-equations-materials-and-properties)
13. [CAD interoperability and migration](#13-cad-interoperability-and-migration)
14. [Agent-native architecture and AI workflows](#14-agent-native-architecture-and-ai-workflows)
15. [Human interface and navigation](#15-human-interface-and-navigation)
16. [Persistence, security and operational behavior](#16-persistence-security-and-operational-behavior)
17. [Nonfunctional acceptance contracts](#17-nonfunctional-acceptance-contracts)
18. [Development Generations and Milestones](#18-development-generations-and-milestones)
19. [MVP end-to-end acceptance projects](#19-mvp-end-to-end-acceptance-projects)
20. [Engineering process and milestone closure](#20-engineering-process-and-milestone-closure)
21. [Risks, experiments and architecture decision gates](#21-risks-experiments-and-architecture-decision-gates)
22. [Deferred roadmap and extensibility](#22-deferred-roadmap-and-extensibility)
23. [Agent implementation handoff](#23-agent-implementation-handoff)
24. [v0.2 architecture hardening and decision ledger](#24-v02-architecture-hardening-and-decision-ledger)

---

## 1. Vision, scope and success

### 1.1 Mission

Build a **local-first, browser-operated, precise parametric mechanical CAD** product in the Axiom family. Humans must be able to model, assemble, document, measure, inspect, save and reopen engineering designs through a complete visual interface. AI agents from hosted or local providers must be able to understand and operate the **same authoritative engineering model** through validated typed semantic tools, efficient contextual queries and bounded visual evidence.

The goal is not merely to imitate SolidWorks or Siemens NX screens or add a chatbot to a viewer. The defining advantage is a shared, inspectable and verifiable model of design intent: features, sketches, constraints, parameters, dependencies, component instances, version references and associative drawings are first-class data accessible to both humans and agents.

### 1.2 Approved platform properties

- Browser UI, local execution and local primary document storage; no mandatory cloud account for manual CAD.
- WebGPU for primary 3D viewport presentation. GPU rendering is not the exact geometry engine; CAD computations must also work headlessly without the browser.
- Windows is the first product-distribution/hardware-acceptance target, with cross-platform architecture and later macOS/Linux acceptance. No assumption that every browser/device supports WebGPU.
- Direct development/automation startup remains available; ordinary installation and project launch integrate with Axiom Platform.
- English technical source/UI documentation, consistent with the maintained Platform/Game Engine repositories. Localized UI can be added later.
- Public repository is MIT; dependencies retain their own licenses, notices and replacement/rebuild obligations. Commercial positioning is not set by this document.

### 1.3 Approved MVP functional outcome

One local engineering document can contain component definitions, part geometry, component instances, assemblies, parameters, equations, material information, multiple drawings and version relationships. The user can:

1. Create, open, modify, save, close and reopen the native document without information loss.
2. Create/edit fully constrained and underconstrained sketches and diagnose conflicting constraints.
3. Build and change moderately complex parametric solids with basic feature operations and dependency regeneration.
4. Build and move assemblies using specified spatial mates, including version-following component references.
5. Measure geometry and calculate physical properties when material data exists.
6. Create model-associated A0–A4 engineering drawings with editable title blocks, dimensions, annotations, section views, basic BOM/balloons and **true vector PDF** output.
7. Import/export exact STEP geometry at a bounded MVP level; keep an architecture for richer third-party migration.
8. Have an AI agent (a) create a usable engineering drawing from a moderately complex modeled part, and (b) construct an editable moderately complex parametric part from a sufficiently specified engineering drawing, with reviewable evidence and explicit ambiguity handling.

### 1.4 Meaning of MVP

The list above defines the **first functional product release**, not an initial coding sprint. Generations E0–E6 progressively implement and prove vertical slices. E2 deliberately tests a narrow model/drawing/AI round trip **before** feature breadth is complete; E6 closes the complete MVP. Do not call E1 or E2 the finished MVP. Exact supported profile bounds, complexity limits and numerical thresholds are measured and frozen in E0/E6 rather than fabricated upfront.

### 1.5 Explicit exclusions from MVP

No promise of SolidWorks/NX feature parity; no complete proprietary native-history migration, advanced configurations/design families UI, full GD&T/PMI manufacturing coverage, sheet metal, advanced freeform surfacing, FEM, CAM, advanced kinematic simulation, enterprise PDM/ERP, real-time multiuser collaboration, cloud-first storage, third-party extension marketplace or universal autonomous external publication. Plan these only after the native CAD foundation is proven.

---

## 2. Axiom family and source references

### 2.1 Canonical repositories

| Repository | Canonical reference | Role |
| --- | --- | --- |
| **Axiom Platform** | https://github.com/Krozzeo/AxiomPlatform | Hub, product lifecycle, local storage/services, identity/session authority, installation, account/provider transport, SDK, generic tool/review primitives |
| **Axiom Game Engine** | https://github.com/Krozzeo/AxiomGameEngine | Reference consumer and source of proven interaction/renderer/agent design patterns, **not** the Engineer domain model |
| **Axiom Engineer CAD** | https://github.com/Krozzeo/AxiomEngineerCAD | This product's CAD document, sketch/assembly solvers, B-Rep adapter, feature graph, drawings, semantic CAD tools and own test/release cadence |

### 2.2 Required upstream documents for engineering agents

- Platform master plan: https://github.com/Krozzeo/AxiomPlatform/blob/main/docs/MASTER_PLAN.md
- Platform ownership matrix: https://github.com/Krozzeo/AxiomPlatform/blob/main/docs/architecture/OWNERSHIP_MATRIX.md
- Platform product/IPC contract: https://github.com/Krozzeo/AxiomPlatform/blob/main/docs/architecture/PRODUCT_CONTRACT.md
- Platform AI/review contract: https://github.com/Krozzeo/AxiomPlatform/blob/main/docs/architecture/AI_CONTRACT.md
- Platform release compatibility: https://github.com/Krozzeo/AxiomPlatform/blob/main/docs/architecture/RELEASE_AND_COMPATIBILITY.md
- Game Engine maintained master spec: https://github.com/Krozzeo/AxiomGameEngine/blob/main/docs/architecture/AXIOM_MASTER_SPEC.md
- Game Engine protocol/commands: https://github.com/Krozzeo/AxiomGameEngine/blob/main/docs/architecture/PROTOCOL_V1.md
- Game Engine CAD **static mesh import** boundary: https://github.com/Krozzeo/AxiomGameEngine/blob/main/docs/architecture/ADR-017-CAD-AND-SCRIPT-COMPONENTS.md
- Game Engine recent implementation evidence: https://github.com/Krozzeo/AxiomGameEngine/blob/main/docs/architecture/IMPLEMENTATION_STATUS.md
- Game Engine product descriptor example: https://github.com/Krozzeo/AxiomGameEngine/blob/main/platform/product.json

### 2.3 Observed baseline, not a permanent pin

At initial design review (2026-10-28), Platform `main` was 0.1.7 at `7c03b7fc6f25fdceeda645bd1bf33534751e68e9`; Game Engine `main` was 0.0.57 at `46e2bbc86f7eec5891c0e92074b2ae870c9253db`. Both are actively developed. Their future versions, release artifacts and SDK contracts must be **re-inspected and pinned by exact immutable release/commit and lockfile integrity** at E0. Do not hardcode this historical baseline as a forever-current dependency.

Platform's main-branch provider service at this baseline is OpenAI-focused. Its experimental provider/account work (including OpenAI, Anthropic, Google, Ollama and local OpenAI-compatible servers) exists in https://github.com/Krozzeo/AxiomPlatform/pull/11 but is not assumed merged. Consume an accepted Platform provider abstraction when available; **never recreate a competing credential store or provider transport inside Engineer**. Preserve provider/model capability detection rather than asserting all models have vision/tool-use support.

Game Engine's `occt-import-js` STEP/IGES pipeline tessellates and flattens inputs into static renderable assets. It does **not** supply editable B-Rep, sketch constraints, assembly hierarchy, persistent CAD topology or design history. Adapt its bounded worker/security/provenance practices, not its static mesh data as the source of CAD truth.

---

### 2.4 Maintained Engineer contracts (v0.2)

This master owns *product intent and scope*. The following in-repository contracts resolve cross-cutting architecture questions and provide milestone-ready interfaces and evidence; they do not imply completed code:

- [ADR register and decision gates](docs/architecture/ADR_REGISTER.md).
- [Native document, graph, versions and migrations](docs/contracts/NATIVE_DATA_VERSIONING.md).
- [Geometry, topology, sketch and spatial constraints](docs/contracts/GEOMETRY_CONSTRAINTS.md).
- [Semantic AI/human tool API](docs/contracts/SEMANTIC_TOOL_API.md).
- [Acceptance profiles and engineering benchmarks](docs/quality/ACCEPTANCE_BENCHMARKS.md).
- [Requirements-to-milestones-to-evidence matrix](docs/quality/REQUIREMENTS_TRACEABILITY.md).
- [AI model/drawing evaluation protocol](docs/quality/AI_EVALUATION.md).
- [Engineering IP and provider data-exposure controls](docs/security/DATA_EXPOSURE.md).

Normative decisions in these documents are design constraints. **TBD/experiment** items are gates to close with evidence and reviewed ADRs in E0, not permissions for an agent to invent an unreviewed contract. Owner-approved scope changes require synchronized updates to master, dependent contracts and acceptance mapping.

## 3. Non-negotiable design principles

1. **One authoritative domain.** Manual UI, local automation and AI tools invoke common versioned CAD commands, validators and transactions. A UI shortcut must not bypass model rules.
2. **Exact geometry vs presentation.** Authoritative B-Rep/analytic geometry and parametric graph are separate from WebGPU triangles, picking buffers, thumbnails or screenshots.
3. **Human-first and agent-native.** Full manual CAD without AI; equivalent domain capabilities through typed tools. Screenshots supplement, never replace semantic queries.
4. **Revision safety.** Expected-revision writes, operation IDs/receipts, preserved immutable versions, stale-base detection, deterministic failure reporting, atomic publication of validated changes and tested recovery.
5. **No silent fabrication.** Geometry, dimensions, mass, inferred drawing details, restored features or import fidelity must never be asserted when unknown or only guessed.
6. **Bounded headless operation.** Solvers, B-Rep regeneration, document validation, drawing projection and agent operations work without a live browser and expose cancellation/diagnostics/limits.
7. **Incremental generation.** Every milestone yields an executable, inspectable slice with negative tests and an editable demo. Discovery may trigger a reviewed redesign; upstream work does not count as CAD acceptance.
8. **Domain ownership.** Platform never imports Engineer feature/geometry types; Engineer never receives raw Hub secrets; Game Engine is not an implicit shared kernel.
9. **Document continuity.** Stable IDs, reference provenance, migrations, source preservation and ability to reopen old versions are prerequisites for advanced features.
10. **Real evidence.** Null/fixture tests are not physical WebGPU proof; mock AI calls are not real-model quality; a successful import is not full source-history recovery.

---

## 4. Product architecture and ownership

### 4.1 Logical runtime

```text
Axiom Platform Hub / local host
  ├─ authorized projects, registrations, installation versions, leases
  ├─ provider accounts, transport, tool/review/usage services
  └─ official Engineer product adapter (versioned IPC)
       └─ Engineer local domain daemon and headless tool service
            ├─ document store, revision/version manager, command/event bus
            ├─ parametric feature/dependency graph and regeneration scheduler
            ├─ sketch solver, assembly solver, B-Rep/OCCT workers
            ├─ drawing/vector/BOM engine and CAD import/export adapters
            └─ agent domain tool registry, proposal transaction, evidence
                 ↕ authenticated protocol
       Engineer browser UI
            ├─ WebGPU CAD viewport and selection/camera interactions
            ├─ sketch/model/assembly/drawing workbenches
            ├─ tree, inspectors, parameters, status and diagnostics
            └─ AI task, diff, review and reference-evidence presentation
```

Prefer one domain implementation callable by headless daemon tasks and browser-preview workers, not separately authored mathematical rules. Live drag may use a temporary/preview solve for responsiveness; the authoritative commit validates against current domain revision. Choose concrete process/worker topology in E0 after benchmark.

### 4.2 Ownership matrix

| Capability | Owner | Reuse strategy |
| --- | --- | --- |
| Hub/catalog/product start/close, installer, session leases | Platform | Use public product descriptor, adapter and SDK |
| Authorized OS paths, dialogs, project lifecycle/installation | Platform | Consume services through allowed interface |
| Provider connections, credentials, turn transport, model options | Platform | Consume accepted provider-neutral service; never duplicate |
| Generic tool schema/validation, review hashes/receipts/journal | Platform | Reuse public primitives; Engineer supplies CAD semantics |
| Panels, dock/Inspector interactions, viewport camera patterns | Engineer | Adapt proven Game Engine behavior selectively; avoid source copies |
| Render surface/WebGPU handling, diagnostics ideas | Engineer | Reuse only utility code behind explicit proven boundaries |
| B-Rep solid kernel, geometric identities, feature graph | Engineer | Dedicated CAD domain; no Game Engine mesh/physics dependency |
| Sketch/mate solvers, reference naming, regeneration | Engineer | Own contracts and algorithms/adapters |
| Drawings, PDF vector output, BOM, constraints/parameters | Engineer | Own authoritative engineering data and validation |
| Native CAD format and conversions | Engineer | Preserve source and fidelity metadata |
| Domain AI context, actions, interpretation and acceptance | Engineer | Shared transport, product-specific logic, human Apply |

### 4.3 Proposed product descriptor (design target, not implemented)

Product ID: `axiom.engineer-cad`; display name: `Axiom Engineer CAD`; native format ID: `axiom.engineer-document` version 1; independent semantic-tool version. The manifest/IPC/API range and launch adapter must satisfy the **actually installed** Platform validator at E0. Expected lifecycle includes `project.detect`, `project.create`, `project.open`, `project.status`, `project.save` and `project.close`, followed by explicitly real optional capabilities such as import/rename. Do not advertise capabilities as stubs.

### 4.4 Browser/compute split

WebGPU renders tessellated solids, edges, annotations and selection highlighting. Exact B-Rep, constraint solves, measurements, mass properties and HLR projection are computed in CPU/Wasm or appropriately isolated local native workers. Candidate OCCT bindings and PlaneGCS are **not** accepted choices until verified. Optional local native execution may accelerate heavy documents behind the same API without contradicting browser UI/local execution. Provide an honest unsupported-device/fallback state, never mislabeled GPU output.

---

### 4.5 Browser execution and reuse boundary

"Browser-operated" means the user-facing workbench runs in a browser; the approved Windows-first, local-first release may require an installed, authenticated local domain service and Platform host. **It is not yet a zero-install, cloud-hosted or browser-only product promise.** E0 must document a direct-start development mode and a Hub-launched mode, their origin/session/port permissions and device/browser support. Browser preview workers must never become a divergent second authority for geometry or constraints.

Use Platform's published product lifecycle, service boundaries, SDK and review primitives. Use Engine's proven interaction patterns only after CAD-specific selection/picking and edit/drag tests; Game Engine's static CAD importer, scene graph, physics and renderer are not interchangeable with exact Engineer solids or mates. Compatibility must pin an actual Platform release/API, not follow mutable main or experimental provider PRs.

## 5. Unified engineering document

### 5.1 User-level rule

A part, assembly and drawing are **not separate mandatory file classes**. They are work modes and collections inside one parent **Engineering Document**. One file/project may contain a modeled body, several components and subassemblies, associated drawings, and in-place component design while viewing an assembly. The user switches Model / Assembly / Drawing presentation modes; this does not convert the native document into another type.

Definitions and instances remain distinct internally. Reusing one bolt definition as eight instances must not duplicate eight independently edited solids. A multibody component and an assembly of instances are both possible.

### 5.2 Conceptual model

```text
EngineeringDocument (stable documentId, native format version, unit profile)
  Metadata, Properties, ReferenceFrames
  GlobalParameters / Equations / DependencyGraph
  ComponentDefinitions (stable IDs)
    Sketches (geometry + constraints + dimensions)
    FeatureNodes (ordered/dependency-aware DAG)
    Bodies / analytic B-Rep derived state
    MaterialAssignments / LocalParameters
  ComponentInstances (definitionId, transform, version policy, local overrides)
  AssemblyGroups / MateConstraints / GroundedInstances
  Drawings
    Sheets (A0–A4, orientation, editable title block)
    ViewDefinitions (target + effective model revision + projection)
    Sections, Dimensions, Annotations, BOM, Balloons
  Revisions / ImmutablePublishedVersions / Branch-or-workhead history
  SourceReferences / Imports / ConversionProvenance
  CachedDerivedArtifacts (regenerable, non-authoritative)
```

### 5.3 Identity and dependencies

- Stable UUID-like identity for document, component definition, instance, feature, sketch, entity, constraint, parameter, drawing, sheet, view and annotation.
- Explicit semantic references to geometric subelements; raw kernel face-array offsets or transient GPU indices are **not** persistent IDs.
- Dependency graph connects parameter → sketch → feature → body → instance/mate → drawing/BOM; support incremental recomputation, invalidation and diagnostics.
- Prevent cyclic definition references, invalid cross-version references and unsupported broken external links.
- Instance transforms and definition-local geometry have separate coordinate systems; record handedness/up-axis and explicit unit conversion on import/export.
- A drawing may target an entire assembly, one definition or a selected view state without becoming a separate independent document.

### 5.4 Storage and portability

The logical document is a single cohesive user artifact. Choose a physical representation (transactional project folder plus exportable self-contained `.axcad` package, or equivalent) in E0; **the extension is provisional**. Must contain a versioned manifest, parametric authoritative data, immutable version references and necessary source attachments; generated meshes and thumbnails may be discardable caches. Save must be atomic/recoverable across related resources. Reopen must not require absolute machine paths. Version migration requires backups, compatibility checks, explicit consent when incompatible and tested rollback.

---

### 5.5 Internal/external reference contract

The unified engineering **user artifact** does not imply a mandatory monolithic storage file. Internal definition IDs, instance IDs and occurrence paths are separate from physical storage and from document-location paths. A consuming document may reference a definition in another authorized document through a stable document+definition identity, a version policy and an effective resolved immutable version. Cross-document references and missing/relocated sources must be modeled in E0, even if the full external-reference UI and repair tooling are shipped later.

References may never rely solely on absolute filesystem paths, transient kernel indices or renderer picking IDs. Documents store dependency manifests, source/provenance and verified last-good effective snapshots. Define cycles, deleted sources, relocation, offline reopen, simultaneous publication, write ownership and stale-reference reconciliation. Cross-document dependency discovery and publish/update order are domain operations, never hidden side effects of opening a file.

See [native data/version contract](docs/contracts/NATIVE_DATA_VERSIONING.md).

## 6. Revisioning, versions and dependency policy

### 6.1 Distinct concepts

- **Save / working revision:** durable edit state with monotonic revision/causal receipt; not a published component version.
- **Immutable version:** identifiable snapshot of a definition or assembly, preserving dependencies and geometry intent.
- **Published version:** immutable version eligible for consumers following Latest; publishing is an explicit, validated action.
- **Drawing revision:** documentation revision that can change independently of modeled geometry.
- **Configuration/variant:** alternative parameter state of one definition, **not** the same as a historical version. Data-model extensibility is required now; advanced configuration-management UI is deferred.

### 6.2 Versioned subobjects within a unified document

The parent document owns version history of component definitions, assemblies and drawings. A component instance records definition identity, dependency policy and effective resolved revision; a drawing records its model dependency and its own revision. A published assembly is a reproducible snapshot of **effective resolved component versions** even if its working successor follows new Latest versions.

### 6.3 Approved dependency policies

| Policy | Behavior |
| --- | --- |
| `Latest` (default) | Follow latest **published** compatible component version in working assemblies |
| `Pinned` | Refer to one explicit immutable component version until changed deliberately |

On new publication, a working assembly with Latest dependency attempts a **candidate update**: resolve references, regenerate, validate mates, check new interference and derived drawings, then apply if all required gates pass. If it fails, preserve the previous effective state and show pending/conflict with exact causes. Do not silently change an already published assembly, release baseline or drawing revision. Do not silently choose a branch/version if Latest is ambiguous; define publication channel and ordering in E4.

### 6.4 Required UX and tools

Inspect version graph; compare geometry/parameters/features/drawings; list consumers of a definition; pin/unpin; publish; restore old version as a **new** working revision; show effective versions and update impact; preview updates and report dependencies/invalidations. Provide revision-aware undo/redo, stale write rejection and receipts. Published history is immutable; recovery never rewrites earlier published identities.

### 6.5 Change and conflict semantics

Capture expected document revision plus dependency versions on every mutation. A previously accepted AI proposal cannot overwrite newer manual edits; require rebase/review. Store content hashes, actor/action provenance, tested kernel/solver versions and meaningful change summaries. Deleting an in-use definition/version is blocked or explicitly resolved. Snapshot restoration must retain the ability to reproduce prior drawings and BOM.

---

### 6.6 Formal version resolution and reproducibility

A *working revision* is an editable, causally ordered persistence state. A *recovery snapshot* protects data after failure. An *immutable version* names a content-stable definition/assembly/drawing state. *Publication* makes an immutable version eligible for Latest consumers. These are distinct types and tests; an E0 recovery snapshot does not prove E4 publication/version-following support.

For each external or internal dependency, record (a) source document/definition, (b) policy Latest/Pinned, (c) effective resolved immutable version, (d) resolution status and (e) verified source/geometry provenance. Latest means a **candidate** update to a working consumer; a published assembly's full effective dependency closure stays immutable. Define branch/channel ordering and compatibility predicate in a reviewed ADR before any automatic-follow feature is accepted.

Store enough original parametric definitions, dependency closure, exact geometry baseline or pinned kernel/solver+converter provenance to verify or safely reconstruct a historical release after application/kernel upgrades. A geometrically equivalent shape with different face lineage is not automatically reference-compatible. A multi-document publication/update must be either transactionally coherent or explicitly staged with recoverable pending outcomes; one-document atomic save does not confer global atomicity.

See [native data/version contract](docs/contracts/NATIVE_DATA_VERSIONING.md).

## 7. Geometry, numerical foundations and topology

### 7.1 Candidate exact kernel

Evaluate **Open CASCADE Technology** (OCCT) with a suitable maintained JavaScript/WebAssembly bridge or a narrowly specified native worker; benchmark against real solids before selecting integration. Its B-Rep, boolean, extrusion/revolution, shape validity, triangulation, STEP/XDE and hidden-line removal capabilities are relevant. `occt-import-js` in Game Engine is a static importer only. Preserve LGPL/Open CASCADE exception obligations, source/rebuild notices and replacement paths as applicable.

Official technical entrypoints:

- https://occt3d.com/open-cascade-technology/
- https://dev.opencascade.org/doc/refman/html/class_s_t_e_p_c_a_f_control___reader.html
- https://occt3d.com/dev/doc/overview/html/occt_user_guides__modeling_algos.html
- https://ocjs.org/docs/about

### 7.2 Solver candidates

For 2D sketches, evaluate FreeCAD PlaneGCS and its WebAssembly wrapper; license and build distribution review are mandatory. Avoid assuming GPL-licensed SolveSpace `libslvs` can be embedded in this MIT product without examining distribution obligations. For 3D assembly mates, design a separate rigid-body constraint solver or proven adapter; PlaneGCS is not automatically a spatial assembly solver.

### 7.3 Numerical policy

- Default user-facing mechanical profile should support mm, cm, m, inch; angle degrees/radians; SI mass/material data. Internal canonical dimensional units and conversions must be fixed in E0 and tested.
- Use appropriate double-precision CPU geometry. GPU may use camera-relative/normalized representation, but cannot define authoritative dimensions.
- Explicit tolerances for point coincidence, curve joining, B-Rep boolean/healing, solver residuals, reference matching, mass and drawing output. Do not use one magic epsilon for all scales.
- Distinguish modeling numerical tolerance from manufacturing tolerance and display rounding.
- Reject/diagnose NaN, infinities, zero-length edges, self-intersecting profiles, invalid solids, ambiguous loops, degenerate booleans and impossible constraints.
- Benchmarks freeze representative units/shape scales, hardware, worker memory, operation deadlines and current precision limits before acceptance.

### 7.4 Persistent topology / topological naming

Raw `Face_17` indices are unstable across regeneration. Design versioned semantic selectors based on producing feature, role, adjacency/geometry signature and disambiguation evidence. Preserve stable names where provable; otherwise return `ambiguousReference` or `lostReference` and require repair. Never silently retarget a sketch, mate or drawing dimension to a different face. Prototype the naming strategy with geometry-changing edits **before** building extensive feature breadth.

### 7.5 Regeneration

Features form a dependency DAG with deterministic ordering, input revision and kernel/solver version attribution. Incremental invalidation computes affected outputs and caches only derived results. An invalid later feature produces explicit degraded/failed state and a retained last-valid snapshot, never an unreported partially saved document. Model edits and derived drawings/measurements either commit coherently or remain pending, with recovery.

---

### 7.6 Topology first: identity and regeneration gate

Persistent references are versioned semantic selectors, not raw kernel shape positions. Candidate selector fields: owning document/definition/feature, generating operation and subelement role, occurrence path and coordinate frame, geometric/adjacency signature, expected version lineage and explicit evidence/ambiguity status. Implementation details are an E0 decision; never promise arbitrary edit-proof identity.

Before freezing native schema v1, validate: dimensional modification, insertion/suppression upstream, face split/merge, hole pattern/count change, lost face, imported-solid change and app/kernel-version migration. A selector may remain valid, resolve provably to the intended element, become ambiguous or become lost. False-positive retargeting is a **release blocker**. Exact B-Rep validation, sketch reference attachment, mates, drawing dimensions and agent face queries must share those outcomes.

Numeric profile, tolerance taxonomy, independent comparison oracles and B-Rep reference fixtures are defined in [geometry and constraints contract](docs/contracts/GEOMETRY_CONSTRAINTS.md), with measurable gates in [acceptance benchmarks](docs/quality/ACCEPTANCE_BENCHMARKS.md).

## 8. Sketching and constraint solving

### 8.1 Geometry/tools required in MVP

- Point, segment/line, circle, rectangle, arc and regular polygon.
- Trim/split entities, mirror entities, and bounded linear/circular sketch patterns.
- Construction geometry, origin/axes, geometric selection, editing and deletion.
- Driving (controls geometry) and reference/driven (computed) dimensions; length, distance, radius, diameter and angle as applicable.
- Geometric constraints including coincidence, horizontal/vertical, parallel, perpendicular, tangent, concentric, equal, symmetry, fixed, distance and angle, with type-appropriate applicability.
- Sketches on named reference planes or selected planar faces; editable later via feature history.

### 8.2 Solver and UX contract

Determine solve status: **fully constrained**, **underconstrained with remaining degrees of freedom**, **overconstrained/redundant**, **inconsistent/unresolved**. Identify constraint conflicts/redundancy and report relevant entities. Not every sketch element needs an explicit constraint: unconstrained geometry is valid and movable.

Conventional indication: underconstrained entities **blue**, fully determined **black**, conflicting constraints/associated diagnostics **red**. Color is accompanied by textual/accessibility status; individual entity color is a derived display from the solved system, not an arbitrary entity flag.

Dragging a free entity imposes a **temporary solver target** while preserving valid constraints, releases the target on pointer-up, and commits a validated change at the captured revision. Numeric edits change driving constraints, not displayed values alone. Reference dimensions cannot drive the solve.

Negative tests: inconsistent coincident/distance pair, redundant fixed geometry, missing reference, collapsed polygon, trim that invalidates dependent constraint, drag of fully fixed element, stale drag commit and a conflicting parameter equation. Keep document and last-good visual state recoverable.

---

## 9. Parametric feature modeling

### 9.1 MVP operations

Extrude/add material, extruded cut, revolve/add material, revolved cut, linear/circular pattern, mirror, bounded fillet and chamfer where supported by the selected exact kernel. Select profile regions/axes/faces semantically. Named reference planes/axes and feature order are editable. Multi-body part definitions are supported; part modeling is allowed inside assembly context.

Each feature stores: stable feature ID, type, parameters/expressions, input references, operation mode (add/remove/etc.), dependency edges, suppression state, result status, diagnostics and generated shape provenance. Distinguish feature patterns from sketch-pattern entity duplication, and definition edits from instance duplication.

### 9.2 Editing and history

The left History tree supports create, select, inspect, reorder when dependency-safe, edit parameter, suppress/reactivate, delete with dependency impact, undo/redo and locate references. A parameter table can edit the exposed parameters, not bypass feature validators. Regeneration must update dependent geometry, mates and drawings or flag broken references.

### 9.3 MVP quality gates

Model an editable bracket, shaft-like revolved part, patterned drilled plate and one multi-body fixture using the actual kernel; save/reopen; modify primary driving dimensions; regenerate with stable identities or actionable repair. Reject invalid booleans and report nonmanifold/self-intersecting outputs. A mesh-only extrusion does not satisfy the B-Rep gate.

---

## 10. Assemblies and positioning constraints

### 10.1 Unified composition

Insert/remove component definitions or instances, edit a component in-place, duplicate instances, group/nest subassemblies, and choose Latest/Pinned version policy. A document can mix modeling features and assembly instances; workbench changes presentation only.

### 10.2 Required MVP mates

Coincident, parallel, perpendicular, tangent, concentric, fixed/lock, distance, angle and **width** mates with precise reference/plane/axis definitions. Resolve rigid-component position and orientation (up to six initial DOF per free instance); allow grounding a base component. Report remaining component/assembly DOF, redundant and inconsistent mates, and relationships affected by feature/version changes.

The width mate must declare its datum reference convention and placement behavior; do not implement it as an unexplained UI offset.

### 10.3 Interaction, validation and properties

Free components drag in 3D with constraints preserved; fully fixed components cannot move without an explicit mate/edit operation. Assembly Move/Rotate and camera navigation must not share ambiguous pointer mode. Detect exact or bounded validated interference; distinguish collision/interference from merely touching. Show clearances/distances when available. Instance count, mass, center of mass and inertia aggregate from resolved component geometry and material densities.

### 10.4 Version-update acceptance

Assembly with at least three definition types and repeated instances: publish a revised part; Latest consumers update after validated regeneration; Pinned consumers stay unchanged. A changed/missing mating face fails safely and preserves prior effective assembly. Published older assembly reproduces previous geometry/BOM. Version updates never silently mutate historical drawings.

---

### 10.5 Spatial solver feasibility and bounded motion

A spatial mate solver is independent of the 2D sketch solver and must be prototyped in **E0.M3**, before designing the full assembly feature/UI. Test rigid-body six-DOF state, grounded components, solver rank/remaining DOF, consistent redundancy vs inconsistency, singular configurations, overconstraint, constrained drag and cancellation. Mates reference semantically identified datums/planes/axes/surfaces with explicit frames, not screen coordinates or unversioned face indexes. A static feasible pose does not prove interactive motion feasibility; validate both. Scope advanced tangent/width geometries to documented bounded supported surface classes and report unsupported cases.

## 11. Drawings and documentation

### 11.1 Data model and workbench

Drawings are **associated views inside the parent document**, not mandatory independent drawing files. One model/assembly can have multiple sheets and drawing revisions. Sheet format A0, A1, A2, A3, A4 in portrait or landscape. Editable title block supports manual fields and optionally linked document/part/version/material fields.

### 11.2 MVP capabilities

- Insert and position orthographic principal/projected and isometric views of a selected part or assembly; explicit projection convention, scale and orientation.
- Create section/cut views with section plane, hatch and labels; show/hide edges, centerlines and relevant reference marks.
- Driving/model-linked dimensions where a valid design parameter is exposed; reference dimensions measured from exact geometry; annotation text, notes, leaders and basic symbols.
- Associative model/version references, sheet/view layout controls and update/out-of-date indicators.
- Basic auto-generated BOM for assemblies: item, part code/name, quantity, material, effective component version, optional notes; corresponding numbered balloons.
- Export genuinely **vector** PDF (curves/lines/text, not screenshot rasterization), correct page dimensions, line weights and stable text layout.

### 11.3 Geometric correctness

Use exact B-Rep projection and hidden-line removal (HLR) where required; WebGPU screenshot edges are not authoritative drawing geometry. Dimensions are linked to design parameters or measured geometry with source IDs, unit/tolerance policy and provenance. Model edits invalidate or regenerate dependent views; orphaned dimensions visibly require repair instead of silently showing stale measurements. A published drawing revision stays reproducible against its effective model version.

### 11.4 MVP constraints

Full ISO/ASME production compliance, advanced GD&T/PMI, weld symbols, complete standards libraries and sophisticated auto-dimensioning are later work. MVP must nevertheless handle basic mechanical fabrication documentation reliably and report unsupported annotations.

---

### 11.5 Drawing quality classification

Distinguish **geometrically correct** (views and measurements agree with authoritative model), **engineering draft for review** (appropriate views, dimensions, annotations and traceable uncertainty), and **released manufacturing document** (discipline/standard/tolerance/approval obligations). MVP AI targets the first two, **not unattended manufacturing release**. A model does not necessarily contain manufacturing process, datum intent, fit, finish, GD&T, tolerance strategy or inspection requirements. The agent must not invent such assertions. Human review is mandatory for documentation choices with manufacturing implications.

Annotations distinguish exact measured geometry, driving design dimensions, derived/reference values and user-authored manufacturing instructions with source/evidence and stale-state semantics.

## 12. Parameters, equations, materials and properties

### 12.1 Parameter Manager (central MVP feature)

A dockable/editable table, analogous in purpose to SolidWorks Equations, displays document-global variables, component-local parameters, equations, driving/reference dimensions, feature parameters and derived values. Include search/filter/grouping, unit, scope, expression, evaluated value, usage/dependencies, error state and link to owning sketch/feature. Permit create/edit/delete with reference-impact validation.

Example semantic expressions:

```text
Length = 120 mm
Width = 60 mm
Thickness = 8 mm
HoleDiameter = 10 mm
HoleCount = 4
HoleMargin = Length / 6
ExtrudeBase.Depth = Thickness
PatternHoles.Count = HoleCount
```

These are illustrative names, not a parser grammar. E1 must freeze a typed expression grammar, safe functions, namespaces and unit syntax; **no arbitrary eval**. Evaluate a directed dependency graph, reject cycles, unresolved symbols, incompatible dimensions, invalid number domains and unsafe expressions. Reference dimensions/properties are read-only derived inputs unless explicitly represented by a valid driving rule. Document and component scopes need deterministic name resolution.

### 12.2 Parameters as agent context

An agent receives machine-readable parameter DAG, users/consumers, units, expressions, range and diagnostic status via tools; the visual Parameter Manager and selected model capture are secondary evidence. Never require OCR of the displayed table as the main tool interface. An agent may propose safe edits, run validation and present before/after geometry plus exact parameter diffs.

### 12.3 Materials and physical properties

Materials have stable IDs, name, density, appearance and unit/optional metadata. Exact solid validity and material density are prerequisites to meaningful mass/center-of-mass/inertia. Provide bounding dimensions, volume, surface area, geometric centroid, material-dependent mass, center of mass and inertia tensor with units and computation method. Do not fabricate mass for unknown density. Assembly properties aggregate actual positioned component instances.

### 12.4 Configurations

Architect the parameter/version model to permit multiple named configurations (variant values/suppression choices) later. MVP needs only one active configuration per definition, no full design-family/configuration-table UI. A configuration is not a published version.

---

## 13. CAD interoperability and migration

### 13.1 MVP

Basic bounded import/export of **exact** STEP bodies, with correct units, coordinate frames and at least the supported structure/names/material metadata that the STEP payload and selected translator can actually preserve. Test round-trip geometry and assembly hierarchy when supported. An imported STEP body may remain an editable-in-context **imported B-Rep feature**, but it must not be mislabeled as recovered native feature history. Keep source file, checksum, translator version and conversion report. Treat imported geometry as untrusted data subject to size/time/complexity limits.

### 13.2 Future architecture

```text
Source file / official translator / authenticated approved export
   → per-format importer adapter
   → neutral CAD exchange/semantic intermediate representation
       (exact geometry, assembly tree, units, metadata, available constraints)
   → validated mapping into Engineer document + provenance
   → optional feature recognition / AI-assisted parametric reconstruction
   → geometry/metadata/reference/drawing fidelity report
```

Future target formats include IGES, Parasolid, SolidWorks, Autodesk Inventor, Fusion 360, Siemens NX and others. Native proprietary support may require authorized official APIs/translators, supported product installations and license review. Do not promise opening every proprietary native version directly or recovering unavailable history/constraints. STEP/IGES usually do not carry an original editable feature timeline; recognition yields a **new proposed design history**, not proof of the original designer's intent.

### 13.3 Required conversion report

Per entity category: preserved, approximated, reconstructed, unsupported, missing or ambiguous; source IDs, resulting IDs, units, tolerance, detected unsupported types, topology/volume comparison and unreconciled relationships. Never silently drop sketches, mates or annotations. Preserve untouched original source and allow import rollback. Migrations operate as reviewable transactions.

### 13.4 AI-assisted feature reconstruction (post-MVP)

Given imported exact B-Rep, agents can propose sketches/extrusions/cuts/revolutions/patterns with a geometry-difference check. Multiple distinct feature histories can yield the same solid; label inferences and confidence, require human review and preserve original imported reference for comparison. Native proprietary full-history import is a long-term research workstream, not a closure gate for this MVP.

---

## 14. Agent-native architecture and AI workflows

### 14.1 Provider independence

Transport, credentials, provider account lifecycle, usage and generic tool validation belong to Platform. Engineer exposes domain-native operations and bounded contextual views; Platform may route OpenAI, Anthropic, Google or local Ollama/LM Studio compatible models once their versions/capabilities are accepted. Discover each model's text, tool-call and image support. Local models must never be assumed visually capable merely because the transport supports images.

### 14.2 Semantic tool catalog (initial proposed vocabulary)

Names below are proposed **Engineer** names, not existing Platform APIs. E0.M5 freezes the first versioned schemas and E2 extends them with input/output units, scope, capability, read/write effects, preconditions and bounded results.

| Tool family | Illustrative operations |
| --- | --- |
| Document / versions | `cad.document.inspect`, `cad.document.validate`, `cad.versions.list`, `cad.versions.compare`, `cad.versions.publish` |
| Parameters / dependencies | `cad.parameters.inspect`, `cad.parameters.set`, `cad.dependency.trace` |
| Sketch | `cad.sketch.create`, `cad.sketch.geometry.add`, `cad.sketch.constraint.add`, `cad.sketch.solve` |
| Feature/B-Rep | `cad.feature.create`, `cad.feature.update`, `cad.feature.suppress`, `cad.geometry.query` |
| Assembly | `cad.component.instance.add`, `cad.mate.set`, `cad.assembly.solve`, `cad.interference.check` |
| Drawing | `cad.drawing.sheet.create`, `cad.drawing.view.add`, `cad.drawing.dimension.add`, `cad.drawing.validate`, `cad.drawing.pdf.export` |
| Measurement / visuals | `cad.measure`, `cad.properties.compute`, `cad.viewport.capture`, `cad.drawing.capture` |
| Migration | `cad.import.analyze`, `cad.import.preview`, `cad.import.apply`, `cad.export.step` |
| Review and diagnostics | `cad.proposal.create`, `cad.proposal.diff`, `cad.diagnostics.explain`, `cad.proposal.review` |

Queries must accept targeted IDs, field selection, filtering, pagination and size/token budgets. Return stable semantic IDs, typed quantities/units, feature-generated face roles, dependency chains, solve diagnostics and uncertainty. A face query must not require scraping screenshots or reading full project JSON.

### 14.3 Mutation and review contract

For each operation: `operationId`, actor, product/project/workspace scope, expected document revision, relevant dependency versions, tool/schema version, declared effect class, validated input, causal trace ID, result receipt and structured errors. Ordinary manual committed edits and agent proposal edits use the **same domain engine**. AI work is isolated:

1. Capture base revision, versions and project-authorized scope.
2. Query relevant semantic context, with optional targeted visual evidence.
3. Construct an explicit plan and, if needed, request clarification.
4. Execute typed, bounded operations in an isolated proposal workspace.
5. Validate constraints, exact B-Rep, references, geometry, drawings, units and versions.
6. Produce inspectable operation/parameter/geometry/drawing diff, diagnostics, screenshots when useful, and evidence.
7. Obtain **human review and Apply** (MVP policy); recheck base and dependencies.
8. Commit transactionally or reject with conflict and recovery information.

Cancelled/stale tasks cannot apply late results; a transport response is not a domain success. External writes, publication and file export are separately permissioned and never implied by an account connection.

### 14.4 AI workflow A: model → manufacturing drawing

From a moderately complex **existing** parametric part, query: structure, important features/holes, axes, dimensions, materials, versions and candidate manufacturing intent. Agent chooses principal/projected/isometric views, cuts, dimension placement, title block and notes. CAD engine calculates exact projections and dimension values; agent arranges/documentation choices, not freehand geometry. Generate associated drawing and vector PDF; check complete dimensions, duplicate/redundant/contradictory annotations, view-source consistency, dangling refs and document validity. Human reviews.

### 14.5 AI workflow B: drawing → editable parametric model

Input may be vector PDF or raster/scan with explicit separate capability paths. Extract views, geometry, projection convention, dimensions, section lines and text; build an **intermediate normalized evidence model** with confidence/source pointers. Resolve dimensions and infer a candidate sketch/feature plan. If drawing underdetermines the solid, explicitly ask questions or present alternatives; do not invent nominal dimensions silently. Generate editable features, recalculate and reproject; compare against drawing measurements/views, report tolerance/differences and ambiguous/unrepresented details. Human reviews and applies.

### 14.6 Visual assistance and provenance

Targeted captures show selected geometry or drawing regions only after semantic state is known. Images are fallible supplemental evidence; every claimed measurement/constraint must be grounded in the authoritative CAD state or recognized drawing evidence. Imported text, PDFs, labels, STEP metadata and model responses are **untrusted task data** and never authorization instructions. Record uncertainty and source attribution throughout inference.

### 14.7 Deterministic and real-provider tests

Prove tools and transactions independently of the model with scripted deterministic agents and fixture responses; then run separate, clearly labeled evaluations on actual configured OpenAI/Anthropic/Google/local models. Measure task completion, geometry correctness, ambiguity disclosure, editability, tool errors/repairs, context bytes/tokens, time and usage where reported. Do not call fixture success proof of AI reasoning quality. Model-to-drawing-to-model self-roundtrip is useful but insufficient: include independent human-authored/third-party holdout drawings to catch correlated bugs.

---

### 14.8 Provider capabilities, tool conformance and evaluation

The semantic tool surface is an explicit versioned public-style Engineer API, not a list of tool names. Minimum v0 catalog, typed quantities/units, stable selectors, read/write effects, failure taxonomy, proposals, permission envelopes and schema compatibility must pass deterministic tool tests before real models are accepted. Agent successes must be replayable as domain commands independent of provider conversation text.

Report model/provider capability profiles separately: text-only, tool-capable, vision-capable, local, hosted, context/token/latency ceilings and unverified. No model is guaranteed to complete a CAD task merely because it connects to Platform. Agent workflows must support uncertainty/clarification and an explicit unsupported-capability result.

The full model→drawing and drawing→model quality framework, independent human/third-party holdouts, pass/fail metrics and unambiguous input levels are in [AI evaluation](docs/quality/AI_EVALUATION.md). Provider calls also obey [engineering data exposure](docs/security/DATA_EXPOSURE.md): external account availability is not permission to transmit full project geometry.

## 15. Human interface and navigation

### 15.1 Shell

- Large central 3D camera/viewport using WebGPU, CAD selection and model interaction.
- Upper menu with **File, Edit, Tools**; contextual operation ribbons for Sketch, Model, Assembly and Drawing modes.
- Left docked tab area (as applicable): **Feature History**, **Component List**, **Positioning Constraints / Mates**; additional parameter and diagnostic views.
- Bottom status/information bar: solver status/DOF, constraint conflicts, regeneration progress/errors, current selection, units, working/version state and running AI tasks.
- Parameter Manager table and context-linked Inspector/property editor, AI task/review panel and drawing sheet workbench.
- User-customizable panels. Adapt Game Engine's docks, multiple Inspectors, pin/lock-focus and drag/focus lessons where useful, subject to Engineer UX tests; do not import Game Engine's semantic hierarchy wholesale.

### 15.2 Camera and interaction

Offer familiar SolidWorks-like navigation: orbit, pan, wheel zoom, fit-to-view, front/top/right/isometric/normal-to, orthographic/perspective, view cube and keyboard/menu discoverability. Freeze exact mouse/keyboard mapping in E1 after usability review; make it configurable and ensure drag-to-move sketch entities/components does not unexpectedly orbit the camera. Selection filters: vertex, edge, face, body, component, sketch element, feature and datum.

### 15.3 Work modes, not file types

Model mode highlights sketch/feature actions; Assembly mode highlights instances/mates; Drawing mode shows sheets/views/cotations. An instance may be edited or geometry created in assembly context; a part document may include component instances. Switching modes changes workbench/layout, not the underlying type or authority of the document.

### 15.4 Error and accessibility behavior

Every error visible in a toast/status view has structured causal detail and recovery steps. Sketch colors alone are insufficient: textual status and icons must identify DOF/conflicts. Unsaved state, unresolved versions, stale drawings, missing imported data and model-proposal changes are explicit. Inspection changes focus on completed selection/drag, avoiding loss of drag targets.

---

## 16. Persistence, security and operational behavior

### 16.1 Local data

All core CAD operations work offline after installation. Provider calls are explicit network opt-in. Projects live in authorized local roots managed through Platform. Do not embed provider/GitHub secrets or machine paths in portable documents. Import/export stays within approved paths with cancellation/size limits and reviewed overwrites. Original foreign files remain accessible/unmodified.

### 16.2 Files and transactions

Use one writer/lease per document, stale revision checks, atomic temp-write/replace or equivalent crash-safe staging, validation before commit, recoverable snapshots, explicit Save/Discard/Cancel on close and operation receipts for uncertain outcomes. Versions/drawings/dependency resolutions are committed consistently; partial subobject writes cannot create an apparently valid saved revision. Reopen after crash must reconcile possible persisted-but-unacknowledged writes rather than blindly replaying operations.

### 16.3 Local service boundaries

Authenticated loopback endpoints, origin/session checks, product-scoped permissions, bounded worker jobs and no arbitrary process execution from project files. Headless AI access uses explicit project/session scope and same capability checks. Separate read-only queries, local mutations, Apply, export and external publication permissions.

### 16.4 Supply chain and licensing

Pin exact dependency versions, integrity hashes and tested Platform SDK source; maintain third-party notices/build/replacement instructions for OCCT, PlaneGCS and other libraries. Avoid incorporating GPL solver code without an explicit license compatibility decision. Preserve MIT source attribution and third-party obligations. Prepared Windows distribution must not ship credentials, personal projects, unlicensed vendor binaries or hidden build dependencies.

---

### 16.5 Engineering design/IP boundary

Engineering metadata, model parameters, exact geometry, drawings, imports and captures are separately classed data. An externally connected model never gains implicit access to all project content: users select Local, Remote Restricted or Remote Full exposure profiles with explicit task-scoped approval, preflight preview of outgoing classes, auditable receipts and safe redaction where possible. No provider-call fallback may silently change an offline/local-only task into an external upload. Imported PDFs/STEP text and model output remain untrusted data. Enforce this in the shared domain tool permissions and provider transport boundary; see [data exposure contract](docs/security/DATA_EXPOSURE.md).

## 17. Nonfunctional acceptance contracts

| Area | Rule / evidence |
| --- | --- |
| Correctness | Valid B-Rep and constraint/mate solve states with typed errors; measured tolerances and independent reference fixtures |
| Determinism | Same inputs, pinned kernel/solver and declared tolerance profile reproduce equivalent semantic results; document acceptable numeric variations |
| Responsiveness | Sketch drag, selection, camera and moderate regeneration have measured budgets; freeze targets with hardware tiers at E0, not invented FPS |
| Resource limits | Bounded worker memory/time, file size, topology complexity, tool responses and cancellation; report rather than corrupt on limits |
| GPU | Actual WebGPU hardware rendering acceptance distinct from Null/software tests; identify adapter/device fallback and failures |
| Availability | Core CAD usable offline; provider disconnection cannot delete local work |
| Portability | Native document and published versions reopen in supported installation without absolute old paths |
| Compatibility | Versioned document migrations/recovery, Platform IPC/SDK checks, older document read and safe refusal of unknown formats |
| Security | Loopback auth, sandboxed project roots, scoped agent capabilities, no leaked credentials or unapproved external publication |
| Accessibility | Mouse+keyboard paths, visible textual diagnostics independent of color, focus-safe drag/selection |
| Evidence | Current exact commit/environment/test results, failure logs, known limitations and no conflation of fixtures with real GPU/model |

Define named hardware/document/agent acceptance profiles in E0 and keep their datasets versioned. Do not turn arbitrary planning numbers into fake contractual guarantees.

---

### 17.1 Quantitative gates, not unfalsifiable promises

E0 must publish versioned hardware/browser/OS profiles, shape-scale and document-complexity profiles, named geometry fixtures and independent oracles, solver residual and tolerance definitions, selection/drag/regen/HLR/PDF time/memory limits, operation cancellation ceilings and result classifications (pass/fail/unsupported/indeterminate). Calibration is allowed before baseline freeze; after freeze, weakening a failing criterion requires a reviewed scope/ADR change. No milestone may be declared accepted on adjectives such as "moderate", "accurate" or "responsive" alone.

A CAD shape can be geometrically equivalent without byte-identical B-Rep or face ordering. Equality checks must distinguish geometry, topology/lineage, semantic references, dimensions and editable history. Retest supported old native documents and published historical versions across pinned runtime upgrades.

## 18. Development Generations and Milestones

### 18.0 Organization

Seven **Generations** group dependency-aware, independently verifiable **Milestones**. Milestone IDs `E0.M1`, etc. are Engineer-specific; they do not rename Platform P0–P5 or Game Engine M19–M40. Each milestone ships evidence appropriate to its type: research spikes need executable reference experiments, ADR and negative proof; domain slices require reproducible commands, persistence and headless conformance; UI slices need editable human demos; agent slices need deterministic tool parity and separate real-provider evidence. Do not invent features or fake UI just to satisfy a checklist. Missing fundamentals block dependent milestones; a later stage does not retroactively certify earlier claims.

Do **not** begin the next dependent Milestone solely because code compiles. For each slice: plan → implement → run positive/negative/lifecycle checks → inspect human workflow → exercise equivalent typed tools → record metrics/risks → owner review → either accept or produce redesign ADR with corrected downstream dependencies.

### Generation E0 — Architecture feasibility, evidence and Platform integration

**Goal:** close high-cost uncertainties **before** freezing native schema and extending feature breadth. This Generation is a proof of compatible authoritative geometry, 2D/3D constraints, topology, document identity, transactional tools, drawings and Platform integration. **Exit:** owner-reviewed integrated E0.M7 vertical proof and go/no-go ADR, not a renderer demo. The accepted MVP feature scope remains unchanged.

#### E0.M1 — Platform product contract, repository and runnable shell
- **Deliver:** repo/CI scaffolding, ADR register and requirements traceability, real Platform descriptor/adapter, lifecycle create/open/status/save/close with a **provisional** minimal document envelope and direct/Hub startup; no frozen CAD schema yet.
- **Verify:** current accepted Platform API contract; unknown/incompatible format, stale revision, busy session, failed process and unauthorized location do not write; direct and hosted paths actually launch; source/SDK version recorded.
- **Depends:** published supported Platform contract; no unmerged provider PR assumption.

#### E0.M2 — Exact kernel, 2D sketch solver, topology and numerical proof
- **Deliver:** bounded OCCT/Wasm-or-native and PlaneGCS-or-alternative experiments; exact additive/subtractive extrusion, revolve, boolean, STEP, sketch solving, selection/semantic face lineage and topological naming strategy; license/build feasibility and numeric/tolerance/scale draft.
- **Verify:** stable-or-actionably-lost face/edge reference under upstream parameter edits, split/merge and feature reorder; valid/nonmanifold/near-degenerate cases; 2D DOF/conflict/drag; independent B-Rep/volume oracle; memory/deadline/cancel; explicit kernel/solver ADR and license evidence.
- **Depends:** E0.M1.

#### E0.M3 — Spatial mate-solver feasibility
- **Deliver:** separate prototype for rigid-component 6-DOF transforms, grounded instance, coincident/concentric/distance/angle-type relations on datum references, rank/redundancy/conflict diagnosis, constrained pointer-like motion and singularity detection. Define unsupported tangent/width cases before full assembly work.
- **Verify:** independent 2- and 3-body fixtures; feasible, redundant, inconsistent and singular assemblies; drag constrained and fully fixed states; no silent retarget or partial commit; cancellation resource bounds; solver selection ADR.
- **Depends:** E0.M2's exact-reference and unit contracts.

#### E0.M4 — Native document, cross-document dependencies and version graph
- **Deliver:** **provisional-until-validated then versioned** schema for definitions, instances/occurrence paths, parameter/feature graph, drawings, semantic selectors, external document/definition refs, revision/recovery snapshot/immutable version/publication distinctions, dependency manifests, portable storage and atomic transactions. Resolve logical-artifact vs physical package topology.
- **Verify:** create/save/reopen/copy/relocate; missing/changed external definition; stale/corrupt/symlinked/locked/partial writes preserve original; immutable snapshot identity and reproducible dependency closure; migration/old-reader refusal; no reliance on absolute paths.
- **Depends:** E0.M1–E0.M3 and approved topology/version model ADR. E0.M2/E0.M3 proofs **precede schema stabilization**.

#### E0.M5 — Shared CAD command bus and typed agent tool contract
- **Deliver:** domain commands, typed JSON input/output contracts, stable semantic context, explicit effect/permission classes, compact bounded queries, receipt/error taxonomy, isolated proposals, review diff, expected-revision/stale handling and human Apply via accepted Platform review primitives.
- **Verify:** same primitive model operation through manual/headless command paths; replayable deterministic agent script; stale, unauthorized, cancelled, unknown tool/version and rollback cases never change committed document; no provider required for conformance.
- **Depends:** E0.M4, accepted Platform tools/AI contract.

#### E0.M6 — Exact drawing, WebGPU CAD picking and security/performance proof
- **Deliver:** minimal exact B-Rep orthographic/HLR/vector PDF route; semantic dimension reference; WebGPU CAD viewport, face/edge/instance picking on actual hardware, Null-vs-hardware labels; authenticated local service and IP/provider exposure preflight; versioned quantitative acceptance profiles.
- **Verify:** vector strokes/text/page size against independent checks; changed model invalidates dimension; picking matches exact semantic selection and drag modes; limits/latency/memory measured on named devices; network-disabled and external-exposure-denied fixtures pass.
- **Depends:** E0.M2, E0.M4–E0.M5.

#### E0.M7 — Integrated end-to-end proof and go/no-go
- **Deliver:** one real portable document implementing sketch constraints → B-Rep solid → dependent face feature → dimension update/regeneration → second definition/instance → one spatial mate → saved revision/reopen → associative vector drawing → deterministic proposed edit/diff/review/Apply. Recorded risk status and redesigned downstream milestones if any fundamental assumption fails.
- **Verify:** preservation or explicit safe failure of every reference and change, independent geometry checks, stable version/dependency state, headless/manual equivalent operations, rollback/crash tests and actual WebGPU evidence. Publish signed-off acceptance corpus and quantitative E0 baseline; request owner **Go / Redesign / Stop** decision.
- **Depends:** E0.M1–E0.M6.

### Generation E1 — Parametric sketch and first real solid

**Goal:** An editable, fully/under-constrained sketch drives a precise solid; the model survives reopen and can be controlled by AI tools.

#### E1.M1 — Workbench, camera, selection and datums
- **Deliver:** central WebGPU view, menu/status/tree/Inspector skeleton, CAD navigation, selection filters, base planes/axes and click/drag modes.
- **Verify:** mouse/keyboard select geometry, orbit/pan/zoom without stealing entity drag, fit/orthographic views, source-highlight and fallback device errors.
- **Depends:** E0.M7.

#### E1.M2 — Sketch primitive creation/editing
- **Deliver:** sketch planes, points, lines, circles and rectangles, selection/edit/delete, construction geometry and validated persistence.
- **Verify:** manually and through typed tools create/reopen identical sketch with stable IDs; reject invalid geometry; editing cannot corrupt saved shape.
- **Depends:** E1.M1, E0.M5.

#### E1.M3 — Sketch solver, driving/reference dimensions and drag
- **Deliver:** coincidence/horizontal/vertical/fixed/length/radius/diameter and foundational relationships, status/DOF/conflict reporting, blue/black/red indication, constrained drag.
- **Verify:** fully defined rectangle at origin, freely dragged underconstrained circle, intentional redundant/conflicting constraints with exact error; reference dimension cannot drive.
- **Depends:** E1.M2, E0.M2.

#### E1.M4 — Parameter Manager v1 and expression engine
- **Deliver:** global/component parameters, safe typed unit expressions, dependency graph, cycle/error handling and table-to-feature navigation; corresponding agent query/edit tools.
- **Verify:** equation controls sketch geometry, changing one variable updates dependent dimensions, cycle/unit mismatch rejected atomically, persisted expressions survive reopen.
- **Depends:** E1.M3.

#### E1.M5 — Exact extrusion and regeneration loop
- **Deliver:** closed-profile detection, additive B-Rep extrusion, feature/history entry, regeneration and geometry status, first physical property queries.
- **Verify:** sketch → exact solid → change parameter → regenerate, volume/face query correct; invalid profile/failed boolean preserves last-good state; human and agent both create.
- **Depends:** E1.M3–E1.M4, E0.M7.

### Generation E2 — Early end-to-end AI/CAD feasibility

**Goal:** Prove **both directions** of model/drawing communication on controlled simple geometry before broad CAD feature investment. This is not final moderate-complexity acceptance.

#### E2.M1 — Semantic geometry and bounded visual evidence
- **Deliver:** stable geometry/feature/parameter queries, selected-face/edge context, targeted viewport capture, provenance and bounded results.
- **Verify:** agent identifies same model features/nominal dimensions as direct API; context limits, invalid IDs, stale capture and no-browser headless path behave correctly.
- **Depends:** E1.M5.

#### E2.M2 — Minimal associative drawing/vector pipeline
- **Deliver:** one sheet, basic model-linked orthographic view, accurate HLR/projection, measured/driving dimension binding and true vector PDF prototype.
- **Verify:** simple extrusion with a supported inner-loop through-hole **or**, if E1 has not proven nested profiles, a solid without drilled features yields exact dimensions and vector strokes/text; fixture must not rely on E3 cut tools. Parameter edit regenerates view; stale dimension warns.
- **Depends:** E2.M1, E0.M6.

#### E2.M3 — AI model-to-drawing vertical proof
- **Deliver:** agent tool workflow for selecting drawing orientation/views/cotations with isolation, diff, evidence and human Apply.
- **Verify:** controlled simple part → consistent PDF and associated sheet, edits are reviewable; cancelled/stale proposal cannot apply; compare deterministic fixture vs real-provider behavior separately.
- **Depends:** E2.M2.

#### E2.M4 — AI drawing-to-model vertical proof
- **Deliver:** small normalized drawing-evidence schema, bounded extraction of vector drawing and optional multimodal input, editable sketch/extrusion proposal and reprojection check.
- **Verify:** specified simple orthographic drawing → editable parametric solid with measured source references; ambiguous view/absent dimension produces question/uncertainty, not invented shape.
- **Depends:** E2.M1–E2.M3.

### Generation E3 — Complete MVP sketch/feature modeling breadth

**Goal:** Model moderately complex mechanical parts robustly with dependency edits, patterns and exact export.

#### E3.M1 — Extended sketch entities and constraints
- **Deliver:** arcs, polygons, trim/split, mirror and sketch patterns; tangent, concentric, equal, symmetry, parallel, perpendicular, angle and other type-appropriate sketch constraints.
- **Verify:** mixed arcs/lines, trim with dependent constraints, DOF/conflicts/drag and persistence; both manual and semantic edit paths.
- **Depends:** E1.M5.

#### E3.M2 — Feature cuts, revolve, mirror and patterns
- **Deliver:** cut/extrude, additive/subtractive revolve, mirrored features and linear/circular feature patterns with dependency-aware identities.
- **Verify:** shaft, flange and hole-array parts regenerate on dimension/count edits; invalid axis, reference and boolean fails safely.
- **Depends:** E3.M1.

#### E3.M3 — Finishing operations and multibody handling
- **Deliver:** bounded fillet/chamfer, feature suppression, multiple bodies, safe feature-order dependency checks and in-place edits.
- **Verify:** moderate bracket with fillet, repeated holes and multibody operations; deletion/suppression impacts visible, last-good geometry safe.
- **Depends:** E3.M2.

#### E3.M4 — Parameter/feature dependency diagnostics
- **Deliver:** full parameter table scope, feature parameter binding, trace dependents, typed error explanations, undo/redo and version-aware update impact.
- **Verify:** edits propagate through feature DAG, cycles/missing references rejected, undo restores shapes/dimensions, agent gets compact causal explanation.
- **Depends:** E3.M3.

#### E3.M5 — STEP interoperability v1
- **Deliver:** bounded exact STEP import/export, units/orientation, source preservation, translation report and reimported-body support.
- **Verify:** independent CAD fixtures round-trip valid B-Rep within calibrated tolerance, unsupported history marked absent, malformed file/timeouts cancelled with no write.
- **Depends:** E0.M2, E3.M3.

#### E3.M6 — Part production acceptance
- **Deliver:** editable sample parts, headless + browser regression suite, current acceptance matrix and measured performance budget.
- **Verify:** end-to-end Project B; save/reopen, parameter changes, **E0.M4 recovery and immutable data snapshots (not E4 published Latest/Pinned)**, geometry volume/area and independent imported/exported comparison.
- **Depends:** E3.M1–E3.M5.

### Generation E4 — Component composition, versions and assemblies

**Goal:** The unified document supports realistic parts/assemblies and version-safe external/internal dependencies.

#### E4.M1 — Definitions, instances and hierarchy
- **Deliver:** in-document component definitions, repeated instances, nested assembly groups, in-place part modeling and component tree.
- **Verify:** multiple instances share one definition and keep independent placements; edit a definition updates valid consumers, not unrelated snapshots.
- **Depends:** E3.M6, E0.M4.

#### E4.M2 — Spatial mate solver foundation
- **Deliver:** ground/fix, coincident, concentric, parallel, perpendicular, distance and angle mates with component DOF, strict reference handling.
- **Verify:** over/underdefined assembly diagnosis, constrained move/rotate, unsolvable mate rejection and no silent geometry-reference retargeting.
- **Depends:** E4.M1, E0.M2–E0.M3.

#### E4.M3 — Remaining mate and motion behavior
- **Deliver:** tangent and width mates, responsive free motion, 3D selection/picking modes and spatial diagnostics.
- **Verify:** width centered between datum planes, tangent cylindrical/surface cases in declared bounds, fully fixed vs free components draggable as expected.
- **Depends:** E4.M2.

#### E4.M4 — Versions, Latest/Pinned and safe auto-updates
- **Deliver:** immutable component/assembly published versions, Latest/Pinned resolver, effective dependency snapshots, preview/validation and version comparison.
- **Verify:** new published component automatically updates valid Latest working consumers; Pinned unchanged; broken mate blocks update; historical assembly reconstructs old dependency set.
- **Depends:** E4.M2, E0.M4.

#### E4.M5 — Interference, physical assembly properties
- **Deliver:** bounded exact interference and clearance check, materials/density, mass/center of mass/inertia aggregate, missing-material warnings.
- **Verify:** overlapping solids detected, touching distinguished, repeated instances mass counted correctly and absent density never yields fabricated mass.
- **Depends:** E4.M3–E4.M4.

#### E4.M6 — Assembly acceptance
- **Deliver:** editable sample reducer/bracket assembly, mate/version/update history, headless tools and user-visible diagnostics.
- **Verify:** Project C full flow; nested/reused components, free moves, bad mate, Latest and Pinned, save/reopen, conflict rollback, exported evidence.
- **Depends:** E4.M1–E4.M5.

### Generation E5 — Manufacturing drawings and mature AI workflows

**Goal:** Complete target drawing features and full moderately complex bidirectional AI acceptance; prioritize engineering correctness over visual polish alone.

#### E5.M1 — Sheet formats, views and presentation
- **Deliver:** A0–A4 portrait/landscape, title block, orthographic/projected/isometric views, scale/layout and consistent visibility/HLR.
- **Verify:** correct vector geometry, page dimensions, multi-sheet persistence and model/version association for parts and assemblies.
- **Depends:** E2.M2, E4.M6.

#### E5.M2 — Sections, annotations and dimension association
- **Deliver:** section plane/hatching, center/hidden marks, driving/reference dimensions, notes, labels and revision-linked failure warnings.
- **Verify:** section reveals internal geometry; linked dimensions follow parameter edits; orphan/ambiguous references are flagged, not falsely displayed.
- **Depends:** E5.M1.

#### E5.M3 — BOM/balloons and PDF production export
- **Deliver:** assembly BOM item/name/code/quantity/material/effective-version, linked balloons, editable fields, printable vector PDF.
- **Verify:** quantities match actual resolved instances, version pin shown, text/linework remain vector (not raster image), PDF opens at correct sheet sizes.
- **Depends:** E5.M2, E4.M4.

#### E5.M4 — AI model → moderate drawing completion
- **Deliver:** broad feature/face/parameter context, multi-view/cut/dimension plan generation, ambiguity/unsupported reporting, proposal review, PDF validation.
- **Verify:** Project D on predefined moderate part plus holdouts; correct measured dimensions, complete needed views and valid PDF; tool/context/real-model evidence separated.
- **Depends:** E5.M1–E5.M3, E2.M3.

#### E5.M5 — AI moderate drawing → parametric model completion
- **Deliver:** vector/raster drawing evidence extraction with capability detection, feature planning, human clarification, rebuilt editable model, reprojection/difference report.
- **Verify:** Project E on independent drawings; resolved geometry/dimensions and editable history, no invented critical unspecified dimensions; ambiguous case blocked/clarified.
- **Depends:** E5.M2–E5.M3, E3.M6, E2.M4. Run independently of E5.M4 after shared drawing/tool contracts are stable; E6 integrates both AI directions.

### Generation E6 — MVP closure, reliability and delivery

**Goal:** Convert the vertical slices into one supported, reproducible Windows-first product without weakening earlier acceptance.

#### E6.M1 — Cross-document/version and regeneration hardening
- **Deliver:** invalid/stale ref repair UX, resource limits, crash/reopen recovery, migrations and versioned deterministic regression corpus.
- **Verify:** rerun E0.M4 cross-document dependency/missing-source tests plus interrupted save, stale AI proposal, failed Latest update, corrupt cache and kernel-version mismatch; all preserve previously accepted integrity. This is hardening, **not first discovery** of external-reference semantics.
- **Depends:** E4.M6, E5.M5.

#### E6.M2 — Performance, device and accessibility verification
- **Deliver:** explicit hardware tiers, real WebGPU tests, fallback diagnostics, responsive drag/viewport benchmarks, keyboard/status accessibility and bounded headless workers.
- **Verify:** report exact devices/files/times/limits, distinguish GPU/Null and external model/fixture evidence; no hand-waved performance claims.
- **Depends:** E6.M1.

#### E6.M3 — Platform packaging and compatibility
- **Deliver:** prepared product artifacts, descriptor/adapter, pinned published Platform SDK, side-by-side installation/upgrade/rollback, relocated Windows launcher and documentation.
- **Verify:** install into fresh relocated folder, host/direct startup, create/open/edit/save/close/reopen, incompatible version refusal, rollback unchanged documents; no secrets or user files packaged.
- **Depends:** E6.M1–E6.M2.

#### E6.M4 — Full five-project human and agent acceptance
- **Deliver:** A–E demo corpus, reproducible tests plus manual review script, final feature/agent coverage matrix and known-limit report.
- **Verify:** all five projects pass on specified hardware/runtime/provider profiles; human and agent actions converge through domain commands; independently sourced drawing tests included.
- **Depends:** E6.M3.

#### E6.M5 — Release and MVP closure decision
- **Deliver:** tagged compatible release, final design/ADR/status/changelog, verified hashes, installer/project guides, exact CI/hardware/model evidence and maintenance backlog.
- **Verify:** every required milestone and acceptance gate passes with no unreviewed data-loss/semantic-correctness blocker; owner explicitly accepts scope and outstanding operational limits. No automatic declaration from historical test counts.
- **Depends:** E6.M4.

### 18.1 Roadmap control rules

- A Milestone is **planned / in progress / blocked / review candidate / accepted**; do not count completed code without its acceptance evidence.
- Generations contain dependencies, but **redesign is allowed**. If OCCT/PlaneGCS/topology/AI roundtrip spikes fail, update ADR, master requirements and downstream milestone plan before proceeding. Keep the business goal unchanged unless the owner approves scope revision.
- Maintain a current `IMPLEMENTATION_STATUS.md` and `AI_HANDOFF.md` once coding begins, each referencing exact commit, completed tests, known failures and next authorized milestone. This master remains intent; status files report reality.
- Any added MVP feature requires explicit owner decision and a revised acceptance/delivery dependency map; do not silently expand scope.

---

### 18.2 Three decision horizons (not alternate MVPs)

1. **Validated foundation (E0):** prove kernel, topology, 2D/3D solvers, document graph, typed tools, exact drawing and Platform contract coexist; redesign if not.
2. **Useful extensible CAD (E1–E3):** editable parametric parts and bounded initial AI/drawing proofs are real and recoverable; **not** the approved full MVP.
3. **Owner-approved complete MVP (E4–E6):** assemblies, Latest/Pinned, comprehensive drawings, interoperability and both moderate AI workflows pass independent acceptance.

Milestone count is not an effort estimate. Maintain critical-path, risk burn-down and explicit resource estimates **after** E0; do not invent dates. E2's early AI proof is intentionally narrow. E5 AI directions may progress independently once shared drawing/tool contracts exist; E6 integrates and validates both.

### 18.3 Go/no-go risk gates

False-positive topology resolutions, nonreproducible historical versions, uncontrolled solver divergence, cross-document corruption, dimensionally incorrect drawings, unapproved external data exposure or manual/agent command divergence **block** dependent feature breadth. A reviewed ADR and owner-approved requirement/fixture/roadmap change are necessary before any scoped substitution. No quiet downgrade of exact geometry or document safety.

---

## 19. MVP end-to-end acceptance projects

Each project has a fixed saved source, task brief, named input complexity profile, nominal expected geometry/units, independent measurement oracle, permitted tolerances, expected negative cases, browser demonstration, headless tool trace and reproducible outcome. Assign requirement IDs and exact versioned fixture manifests to each case. Weakening a fixture to pass a failing test requires owner-reviewed profile revision. Calibrate quantitative tolerances and complexity limits at E0; record them in fixture manifests and never adjust merely to pass a failing run.

### Project A — Sketch behavior

Fully constrain a dimensioned rectangle/circle arrangement, demonstrate blue→black status, intentionally add redundant/conflicting constraints (red + explanation), drag an underconstrained entity without violating remaining constraints; modify driving/reference dimensions and undo/reopen. No arbitrary point must be pre-constrained.

### Project B — Moderate parametric part

Create a bracket/flange with at least several dependent sketches, additive/subtractive features, hole pattern, revolve or curved feature where applicable, material and named equations. Recalculate after changing nominal dimensions; ensure correct volume, measured references, stable feature relations, native save/reopen, STEP export/reimport and readable failure if a dependent feature becomes invalid.

### Project C — Constrained multi-component assembly

Reuse definitions as multiple instances; position using coincident/concentric/distance/angle/width or other appropriate mates; ground one component; observe remaining DOF/movement; detect interference; compute assembled mass with materials; publish a part version, prove Latest/Pinned semantics, reject broken update, reopen historical effective assembly. Produce correct BOM source data.

### Project D — AI drawing from existing moderate part

Target an **engineering draft for human review**, not an automatically released fabrication drawing; the model cannot invent datum/fit/finish/tolerance intent. Score measured dimensions, view sufficiency and source association separately with versioned provider profiles. Give agent a known native model, no hand-entered drawing dimensions. It queries geometry/parameters, selects appropriate orthographic/isometric/section views, constructs A-series sheet and valid annotations/title block; emits true vector PDF. Validate each displayed dimension against model truth, check no stale/orphaned dimensions, require human review and retain exact tool/capture/evidence trace.

### Project E — AI model from independent moderate drawing

Separate vector/raster cohorts and complexity levels. Projections may underdetermine 3D geometry; clarification or abstention is the correct result for ambiguous drawings. Score editable history, exact solid equivalence, evidence lineage and cost independently. Supply independently prepared vector/raster technical drawing with declared view conventions and sufficient dimensions. Agent extracts evidence, asks about missing critical data where needed, produces editable feature-based model and reprojection/measurement comparison. Run an intentionally ambiguous negative case. A coincident-looking image alone cannot pass; verify geometry, dimensions, editing behavior and provenance. Test at least one external/provider-independent fixture to prevent same-renderer self-validation bias.

### Shared acceptance

After every project, close/reopen, compare immutable versions, test stale/failed operations, verify manual vs tool parity, and ensure no unintended files/credentials/external writes. Do not accept an AI task solely because it issued tool calls or produced a plausible picture.

---

## 20. Engineering process and milestone closure

### 20.1 Definition of Ready

For each milestone before code: requirement IDs, bounded scope, concrete acceptance fixtures, domain API/schema updates, dependencies, failure/security risks, performance profiles where applicable, manual flow, equivalent headless/agent flow, rollback/recovery behavior, owner-visible demo and a non-scope list. If missing, research/specify first.

### 20.2 Definition of Done (risk- and type-specific)

Apply each clause **when the milestone exercises that capability**. An E0 kernel spike needs reproducible reference experiments, failures and a reviewed ADR, not a fictitious production Inspector. An E1 sketch UI slice must prove actual interactive editing and persistence, not mock output. Any exception lists omitted capabilities, their later gate and owner approval.

1. Tested real domain behavior or reproducible technical experiment, not empty wrappers or compiler-only declarations.
2. Positive, negative, lifecycle, stale-revision and cancellation/partial-failure tests.
3. Exact geometry/constraint/reference validation and persistence roundtrip wherever domain mutation or storage is in scope; experiments explicitly report tested and unsupported cases.
4. Human UI and typed tool operations use the same authoritative command path once the slice exposes them; E0 first proves equivalent headless/direct commands.
5. Executable proof for experiments; editable demo and documented manual acceptance steps for interactive slices.
6. Upstream Platform contract/installation regression where relevant.
7. Actual WebGPU/renderer evidence separately attributed if viewport changes.
8. AI fixture evaluation and real-model evaluation separately attributed when a milestone requires them.
9. Updated design/ADR/status/handoff/changelog, current exact commit and tests, known limitations.
10. Explicit owner review of a milestone before it is declared accepted.

### 20.3 Pull-request and release discipline

One scoped branch/PR per milestone or coherent sub-slice, with reviewed ADR if interfaces change. Never force-push or rewrite main/recovery refs to conceal failures. Do not merge just because an earlier SHA was green. Compare exact final commit CI, user acceptance and published artifact integrity. Pin compatible Platform release/provider before consuming; do not rely on sibling checkout, moving main or unmerged experimental PR contracts. Preserve licensed third-party notices and security reviews.

### 20.4 Evidence file template

Each milestone report records: objective; exact product/Platform/kernel/solver versions and commit SHAs; OS/browser/GPU profile; commands/tests/case counts; passing/failing/blocked flows; screenshots or vector reference artifacts; native/fixture vs real-provider evidence; numerical tolerance results; data migration/recovery tests; owner decisions; remaining risks; whether next milestone may proceed.

---

## 21. Risks, experiments and architecture decision gates

| Risk / invalid assumption | Earliest gate | Required proof or response |
| --- | --- | --- |
| Parametric B-Rep silently retargets faces or edges | **E0.M2** | Split/merge/reorder tests and valid/ambiguous/lost selector states; no false-positive remap |
| OCCT/Wasm memory, correctness, license or native worker unsuitable | E0.M2 | Independent B-Rep fixtures, limits and kernel/packaging ADR |
| 2D solver rank/DOF/conflict/drag insufficient | E0.M2 | Independent degeneracy fixtures, solver/license ADR |
| 3D spatial mate solver unstable, especially during constrained drag | **E0.M3** | Grounded/under/overconstrained, singular and motion fixtures; safe fail/rollback |
| Unified document, publications and cross-document references inconsistent | **E0.M4** | Immutable dependency closure, relocation/loss, crash/stale tests |
| Runtime upgrade changes historical geometry/lineage | E0.M4/E0.M7 | Pinned provenance and old-document/equivalence verification |
| Manual/agent commands diverge or proposals leak writes | E0.M5 | Tool schema conformance, replay, stale/unauthorized rollback |
| WebGPU picking mismatches exact CAD geometry | E0.M6 | Real-hardware semantic face/edge selection evidence |
| PDF is raster, dimensionally wrong or stale | E0.M6/E2.M2 | Independent HLR, vector stroke/text and dimension checks |
| Sensitive engineering data leaves device without task permission | E0.M5–E0.M6 | Exposure profiles, offline/denial tests and audit receipts |
| AI invents ambiguous geometry or manufacturing information | E2.M4/E5.M4–M5 | Independent holdouts, correct abstention and verified model/drawing differences |
| Proprietary migration loses history/metadata | E3.M5/future | Per-field fidelity and source preservation; no unsupported recovery claims |
| Platform provider SDK stays experimental or incompatible | E0.M1/E2.M3 | Pin accepted Platform release; model capability-detect; no duplicate secrets |

Required supported bounds/thresholds are frozen in versioned acceptance profiles at E0.M6 and reviewed at E0.M7. Unresolved technical choices include: kernel/bridge and license, 2D/3D solvers, persistent selector algorithm, physical storage, numeric profiles, Platform SDK, exact CAD picking/HLR/PDF, security data exposure, hardware limits, STEP supported subset and source-translator licenses. Close each with evidence and an ADR; these are not preapproved implementation selections.

---

## 22. Deferred roadmap and extensibility

Architectural hooks only in MVP; implementation deferred unless explicitly reapproved:

- Proprietary native translators for SolidWorks, Inventor, Fusion 360, NX and version-specific CAD formats; full constraint/feature/drawing/history recovery and AI-assisted reconstruction.
- Rich configurations/families/design tables and variant BOM management.
- Advanced surfacing, sheet metal, specialized mechanical features, threads/fastener libraries, weldments, gear tools and manufacturing process design.
- Full manufacturing standards, advanced GD&T/PMI, tolerancing, drawing revision workflows, inspection plans and parts-catalog tooling.
- Simulation/FEM, kinematics, dynamics, CAM, topology optimization, generative design and manufacturing integration.
- Large distributed assemblies, advanced external references, PLM/PDM/ERP integration, cloud synchronization, concurrent collaborative editing and marketplace.
- Cross-product workflows with Game Engine/Math Lab through explicit exchange contracts, never by imposing one universal scene/document schema.

---

## 23. Agent implementation handoff

### 23.1 First action for any coding agent

1. Read **this entire master** and relevant versioned contracts in §2.4, plus current `README.md`, `IMPLEMENTATION_STATUS.md` and `AI_HANDOFF.md` (when created).
2. Check real current Engineer branch, GitHub issue/PR state and exact Platform/Game Engine versions; the historical baselines in `2.3` are not current truth forever.
3. Read the linked Platform product/AI/ownership contracts before changing integration; read Game Engine docs only for relevant patterns and behavior.
4. Identify next unaccepted milestone and its prerequisites; do not implement unscheduled downstream features or reclassify deferred features as required.
5. Write a scoped work plan with acceptance cases and an architecture decision proposal for any nontrivial unresolved interface.
6. Implement on an appropriate branch; do not overwrite user data, protected refs or existing milestones.
7. Run tests and real UI/headless acceptance; capture precise results, failures, numeric evidence and limits.
8. Update the repo's current status/handoff/milestone report, request owner review, and only then mark milestone accepted.

### 23.2 Decision precedence

Current explicit owner decision > this master (until revised) > accepted milestone ADR > current versioned public Platform/Engineer executable contracts > implementation. Existing Game Engine behavior is **reference only**, never authority over Engineer native design. If conflict arises, stop the affected work, report exact divergence and request an ADR/owner scope decision. Do not silently sacrifice user-visible requirements, correctness, recovery or security to keep moving.

### 23.3 Initial implementation request

Start with **E0.M1**. Produce a real Engineer product adapter conforming to the accepted Platform product lifecycle, a **provisional** minimally persisted document and headless/browser startup proof. Do not freeze full native CAD schema before E0.M2 topology and E0.M3 mate feasibility. E0.M7 is the architecture go/no-go gate before feature breadth; avoid unsupported B-Rep/AI capability claims.

### 23.4 Scope change procedure

For a discovered limitation: record observed evidence and user-visible impact; list alternatives/tradeoffs; propose smallest reversible correction; update dependency/acceptance criteria and relevant ADR with owner approval; keep existing accepted tests and user project compatibility. The MVP functional list is frozen in this v0.1 direction; redesigning its implementation is allowed and encouraged when proof shows a fault.

---

## 24. v0.2 architecture hardening and decision ledger

### 24.1 Adopted v0.2 changes — functional MVP scope unchanged

1. Prove topological lineage and 2D numerical behavior before native schema freeze.
2. Prototype 3D rigid mate solver and constrained motion in E0, ahead of full assemblies.
3. Model external/internal definition IDs and immutable dependency closure from the start.
4. Separate working revision, recovery snapshot, immutable version, publication and effective Latest/Pinned resolution.
5. Preserve published model/drawing reproducibility across kernel and document upgrades.
6. Define local browser/service semantics, exact CAD picking and bounded renderer reuse.
7. Formalize typed semantic API, agent replay, model capability matrix and human Apply.
8. Protect engineering IP with explicit per-task provider data-exposure profiles.
9. Classify drawings as geometric correctness vs engineering draft vs future manufacturing release.
10. Benchmark AI with independent vector/raster cohorts, ambiguity rejection and editable geometry proof.
11. Reorganize E0 into seven high-uncertainty proofs; correct E2 drilled fixture and E3 snapshot ambiguity; permit independent E5 AI paths and type-specific DoD.
12. Add maintained ADR, geometry, data/version, tool, quality, traceability, AI-evaluation and security contracts linked in §2.4.

### 24.2 Technical decisions deliberately unresolved until E0 evidence

Exact kernel, solvers, licenses, tolerances, native physical format, selector representation and version lineage, publication ordering and compatibility policy, supported 3D mate surface classes, SDK/provider capabilities, HLR/PDF toolchain, STEP profile, exposure defaults and hardware performance budgets. Capture results in ADRs and versioned fixtures, with owner approval of material changes.

### 24.3 Status and change control

This is **master v0.2.0**, not a software release or milestone acceptance. Future changes synchronize this master, specialized contracts, requirement-to-test traceability, milestone dependencies and agent handoff. Approval requires executable evidence; prose alone proves no implementation.

---

**Master-design closure note:** v0.2 retains the approved MVP and strengthens falsifiable architecture gates. CAD features, numeric results and provider capabilities remain planned until measured milestone evidence exists.
