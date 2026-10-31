# Axiom Engineer CAD

Local-first, browser-operated parametric mechanical CAD and engineering-documentation product in the Axiom family, designed from the outset for both human users and AI agents.

> **Status:** E0.M7 integrated foundation experiment (0.0.7); owner Go / Redesign / Stop pending. Exact HLR/vector A4 output, GPU face/edge/component selection and denied sharing preflight are executable within a bounded profile. Full CAD/drawing editors, real AI model workflows and remote dispatch remain planned.

## Install milestone builds from Platform

Every completed review milestone is delivered as an experimental prepared installation. In Platform 0.1.12+, open **Installations → Add installation → Axiom Engineer CAD → Refresh**, select the published experimental build, download/install and activate. Then create an Engineer project. Source PRs and passing tests alone are not installable publications. See [milestone delivery](docs/MILESTONE_DELIVERY.md) for the publication and verification gate.

**New integrated demo:** install0.0.7, choose **Load Demos → E0.M7 Integrated Foundation Lab → Build from model**. Change Thickness15, Apply driving dimension, Save and rebuild. Review/Apply a scripted width60 proposal, rebuild and inspect drawing. Source Retained1 previews original40/depth10 read-only; Working model remains current60/depth15 after reopen. [Test steps](docs/milestones/E0_M7_REPORT.md), [owner gate](docs/architecture/ADR-012-INTEGRATED-E0-GATE.md). New profiles require0.0.7; old documents remain readable unchanged.

For the earlier drawing/GPU demo install **0.0.7**, choose **Load Demos → E0.M6 Drawing & GPU Lab → Build from model**. Select Faces/Edges/Components and standard views; choose **Drawing → Download vector PDF**. Change width through the expandable reviewed-command panel, rebuild and compare the source-linked dimension. Unsupported/software GPUs are labeled; CPU drawing works without GPU. [M6 report](docs/milestones/E0_M6_REPORT.md), [measured profile](docs/quality/E0_M6_PROFILE_V1.json).

For the earlier review demo choose **Load Demos** on installation **0.0.7**, open **E0.M5 Review Lab**, choose **Run local scripted proposal → Validate proposal → Review changes**, inspect the changes, confirm and **Apply & Save**. The scripted agent uses actual scoped local tools; it is not a real AI model. Manual dimension changes use the same command and require Save. See [E0.M5 evidence](docs/milestones/E0_M5_REPORT.md) and [tool catalog](docs/contracts/SEMANTIC_TOOLS_V1.json).

For a guided native-data test choose **Load Demos** on installation **0.0.7**, then open **E0.M4 Native Version Lab**. Edit Notes → Apply properties, **Validate current content → Create immutable version → Save document**. Select an older version and **Restore as new revision**; history stays intact.

The companion **E0.M4 Source Plate** demonstrates a real external definition. Change width in its geometry lab, build/keep, then validate/create version/publish/save. In the consumer choose **Check source updates → Validate candidate → Adopt validated candidate → Save**. Missing sources preserve the embedded effective snapshot; Pinned never auto-follows. The earlier spatial/geometry demos remain in expandable panels.

Legacy projects stay unchanged until **Convert to native v1 → Save document**, which keeps their original bytes in a backup. The historical basename remains for Platform compatibility; formatVersion1 is the decoder discriminator. Keep project files, recovery journals and original backups when copying a study. Native snapshots carry the verified dependency closure for offline reopening. See [native storage ADR](docs/architecture/ADR-006-NATIVE-STORAGE.md) and [version resolver ADR](docs/architecture/ADR-007-NATIVE-VERSION-RESOLVER.md) for exact tested bounds.

## Run the E0.M7 lab

Requires Node.js 24+. Install the integrity-locked Platform SDK:

```sh
npm ci --ignore-scripts
npm start -- --root .local/projects --create first-study --name "First engineering study"
```

Open the authenticated editor URL printed in the terminal. Edit Name/Notes, choose **Apply properties**, then **Save document**. Pending fields must be applied or reset before saving. Direct sessions provide Save/Discard/Cancel on close. To reopen:

```sh
npm start -- --root .local/projects --open first-study
```

The saved file is `project.engineer-provisional.json`, reserved format ID `axiom.engineer-document`, legacy version **0** (markers E0.M1–M3) until explicitly converted to native version **1**. It is not the final CAD schema or `.axcad` package. Keep existing documents; incompatible formats are refused without modification.

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

Tests use temporary projects and a disposable Platform profile, never your saved accounts. Browser artifacts are written to `test-results/`. They check lifecycle/UI behavior and the bounded exact-kernel/solver corpus, with separately labeled M6 hardware/PDF evidence; no general CAD acceptance. [Current implementation](IMPLEMENTATION_STATUS.md), [handoff](AI_HANDOFF.md), [milestone plan](docs/milestones/E0_M6_PLAN.md), [evidence](docs/milestones/E0_M6_REPORT.md), [third-party notices](THIRD_PARTY_NOTICES.md).

After abrupt termination, inspect identity/revision and the lease owner before recovery. This build never automatically deletes Platform stale leases. Once ownership is available, its verified journal offers explicit original-preserving checkpoint recovery. Unknown schema/runtime is refused. Do not blindly repeat an operation whose result is unknown.

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
