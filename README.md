# Axiom Engineer CAD

Local-first, browser-operated parametric mechanical CAD and engineering-documentation product in the Axiom family, designed from the outset for both human users and AI agents.

> **Status:** E0.M1 lifecycle foundation implemented as a review candidate; owner acceptance pending. The runnable shell edits provisional document metadata. Exact geometry, sketches, assemblies, drawings and AI are not implemented.

## Run the E0.M1 foundation

Requires Node.js 24+. Install the integrity-locked Platform SDK:

```sh
npm ci --ignore-scripts
npm start -- --root .local/projects --create first-study --name "First engineering study"
```

Open the authenticated editor URL printed in the terminal. Edit Name/Notes, choose **Apply properties**, then **Save document**. Pending fields must be applied or reset before saving. Direct sessions provide Save/Discard/Cancel on close. To reopen:

```sh
npm start -- --root .local/projects --open first-study
```

The saved file is `project.engineer-provisional.json`, reserved format ID `axiom.engineer-document`, experimental version **0**, marker E0.M1. It is not the final CAD schema or `.axcad` package. Keep existing documents; incompatible formats are refused without modification.

### Through Axiom Platform 0.1.12

Add this prepared source installation's `platform/product.json` through **Installations → Add installation → local folder**, activate Engineer CAD, then create an Engineer project. Dependencies must already be installed. Alternatively, launch the pinned provider directly with disposable paths:

```sh
node node_modules/axiom-platform/services/local-host/cli.mjs --product platform/product.json --projects-root .local/hub-projects --settings-root .local/hub-profile --port 0 --open
```

Host and direct modes use the same document commands and exclusive lease. Hosted close is managed by the Hub. No account is required. The CLI above enables Platform's ordinary public release discovery; the product itself makes no external requests.

### Verify

```sh
npm run check
npx playwright install chromium --only-shell
npm run test:browser
```

Tests use temporary projects and a disposable Platform profile, never your saved accounts. Browser artifacts are written to `test-results/`. They prove lifecycle/UI behavior, not GPU rendering or CAD correctness. [Current implementation](IMPLEMENTATION_STATUS.md), [handoff](AI_HANDOFF.md), [milestone plan](docs/milestones/E0_M1_PLAN.md), [evidence](docs/milestones/E0_M1_REPORT.md), [third-party notices](THIRD_PARTY_NOTICES.md).

After an abrupt process termination, inspect saved identity/revision and the lease owner before recovery; this build does not automatically delete stale leases or implement migrations. Do not blindly repeat an operation whose result is unknown.

## Start here

**[Master Design Document v0.2](MASTER_DESIGN.md)** is the canonical product specification, including:

- Approved MVP requirements, exact geometry and unified document architecture.
- Sketch and assembly constraints, parametric features, variables/equations and drawing requirements.
- Per-component versions, Latest/Pinned dependencies, interoperability and future native CAD migration.
- Human/AI semantic command and review contracts.
- Seven development Generations (E0–E6), each divided into independently verifiable Milestones.
- Five end-to-end acceptance projects, numerical/security/UX risks and implementation-agent instructions.

Coding agents: read [AGENTS.md](AGENTS.md) and the full master before modifying source.

## Architecture and implementation contracts

The v0.2 design review moved the highest-risk feasibility questions into Generation **E0.M1–E0.M7** before freezing native schema and building broad CAD features. The functional MVP remains unchanged. These contracts specify future CAD behavior; consult IMPLEMENTATION_STATUS.md for actual evidence.

- [ADRs and architecture gates](docs/architecture/ADR_REGISTER.md)
- [Native engineering documents, external references and versioning](docs/contracts/NATIVE_DATA_VERSIONING.md)
- [Exact geometry, topological identity and 2D/3D solvers](docs/contracts/GEOMETRY_CONSTRAINTS.md)
- [Versioned semantic tools and safe agent Apply](docs/contracts/SEMANTIC_TOOL_API.md)
- [Numerical/hardware acceptance profiles](docs/quality/ACCEPTANCE_BENCHMARKS.md)
- [MVP requirement traceability](docs/quality/REQUIREMENTS_TRACEABILITY.md)
- [Independent AI engineering drawing/model evaluations](docs/quality/AI_EVALUATION.md)
- [Engineering IP and provider exposure boundaries](docs/security/DATA_EXPOSURE.md)

## Axiom family

- [Axiom Platform](https://github.com/Krozzeo/AxiomPlatform) — Hub, local services, lifecycle, accounts, shared AI/SDK.
- [Axiom Game Engine](https://github.com/Krozzeo/AxiomGameEngine) — reference editor, WebGPU and semantic-agent patterns; not a parametric CAD kernel.
- [Axiom Engineer CAD](https://github.com/Krozzeo/AxiomEngineerCAD) — this independent product and its CAD domain.

The master intentionally distinguishes **approved requirements**, **candidate implementations** and **features deferred beyond the MVP**. Implement the current accepted milestone rather than treating this document as evidence of existing features.

License: MIT; third-party dependencies retain their individual licenses.
