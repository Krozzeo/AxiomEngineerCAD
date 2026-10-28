# Axiom Engineer CAD

Local-first, browser-operated parametric mechanical CAD and engineering-documentation product in the Axiom family, designed from the outset for both human users and AI agents.

> **Status:** Foundational design approved; implementation has not started. No functional CAD capabilities are claimed yet.

## Start here

**[Master Design Document v0.1](MASTER_DESIGN.md)** is the canonical product specification, including:

- Approved MVP requirements, exact geometry and unified document architecture.
- Sketch and assembly constraints, parametric features, variables/equations and drawing requirements.
- Per-component versions, Latest/Pinned dependencies, interoperability and future native CAD migration.
- Human/AI semantic command and review contracts.
- Seven development Generations (E0–E6), each divided into independently verifiable Milestones.
- Five end-to-end acceptance projects, numerical/security/UX risks and implementation-agent instructions.

Coding agents: read [AGENTS.md](AGENTS.md) and the full master before modifying source.

## Axiom family

- [Axiom Platform](https://github.com/Krozzeo/AxiomPlatform) — Hub, local services, lifecycle, accounts, shared AI/SDK.
- [Axiom Game Engine](https://github.com/Krozzeo/AxiomGameEngine) — reference editor, WebGPU and semantic-agent patterns; not a parametric CAD kernel.
- [Axiom Engineer CAD](https://github.com/Krozzeo/AxiomEngineerCAD) — this independent product and its CAD domain.

The master intentionally distinguishes **approved requirements**, **candidate implementations** and **features deferred beyond the MVP**. Implement the current accepted milestone rather than treating this document as evidence of existing features.

License: MIT; third-party dependencies retain their individual licenses.
