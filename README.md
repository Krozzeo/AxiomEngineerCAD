# Axiom Engineer CAD

Local-first, browser-operated parametric mechanical CAD and engineering-documentation product in the Axiom family, designed from the outset for both human users and AI agents.

> **Status:** Foundational design approved; implementation has not started. No functional CAD capabilities are claimed yet.

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

The v0.2 design review moved the highest-risk feasibility questions into Generation **E0.M1–E0.M7** before freezing native schema and building broad CAD features. The functional MVP remains unchanged. These are specifications and test plans, **not implemented functionality**.

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
