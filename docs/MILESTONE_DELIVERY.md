# Milestone installation delivery

Owner requirement (2026-10-30): every new completed Engineer Milestone must have a prepared experimental release discoverable, installable and runnable from Axiom Platform so the owner can test it. Publication is authorized as part of milestone delivery. It does not approve merge, stable release or the milestone itself.

## Delivery gate

1. Update product/package version when appropriate; pin source, Platform SDK and dependency integrity. Keep the review PR open.
2. Pass Engineer acceptance on the exact PR head, including Windows/Linux domain and browser tests.
3. Prepare the Windows x64 ZIP with Platform's pinned tooling and production dependencies. Publish `axiom-release.json` with size/SHA256 and full commit/PR/acceptance-run provenance.
4. Validate the extracted relocated package and actual lifecycle before publication. Candidate build jobs have read-only permissions; only the pinned-tool publisher has release-write permission.
5. Verify public metadata and the real Platform discovery/download/hash/install/activation/open flow using an isolated profile. Report the version and install link to the owner, with limitations and explicit failures.
6. Never overwrite previous release assets/tags, fabricate CI IDs or call a source-only PR an installable delivery.

`.github/workflows/release.yml` uses pinned Platform 0.1.12 publication tools. Once on main, successful `Engineer acceptance` workflow completion publishes eligible open same-repository PR builds; accepted main commits can publish stable versions separately. Before the workflow is on main, bootstrap with `experimental-pr-<PR>-<full SHA>` pointing at that exact head **after its PR CI succeeds**. The tag-triggered workflow revalidates CI, current PR head and immutable publication identity. Do not merge merely to enable publication.

## Owner installation

In Platform 0.1.12+, open **Installations → Add installation → Axiom Engineer CAD → Refresh**. Select the published experimental build, download/install and activate it. Existing sessions can defer activation until closed. Create an Engineer project after the installation is active. An empty list or a discovery error must be diagnosed separately; no placeholder installation is created.

E0.M1 supports only metadata lifecycle in experimental document format 0. Installing its package does not add sketches, exact geometry, solvers or AI.
