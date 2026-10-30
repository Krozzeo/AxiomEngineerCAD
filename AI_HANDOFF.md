# Engineer handoff — E0.M2

Read AGENTS.md, MASTER_DESIGN.md in full, IMPLEMENTATION_STATUS.md, docs/milestones/E0_M2_REPORT.md and ADR-001–004 experiments. Branch engineer/e0-m2-geometry-proof starts at published E0.M1 a1958f378c524b65cf50212e92c53937bbc9f998. Owner authorized progression; acceptance and main merge remain separate.

Standing instruction: each milestone includes its public Platform-installable experimental package, exact passing CI, immutable ZIP/manifest and actual catalog/download/hash/install/activate/launch proof. See docs/MILESTONE_DELIVERY.md. Never stop at a PR or overwrite older assets. Match release/CI to the current exact head.

Software 0.0.2 adds the bounded isolated OCCT/PlaneGCS lab, 29-case corpus, CPU depth-buffer preview/face selection and version-owned E0.M2 Geometry & Sketch Lab demo through Platform Load Demos. Keep experiment records only the bounded recipe in provisional format 0 / E0.M2. Save/reopen requires an explicit rebuild. E0.M1 files remain readable; 0.0.1 safely rejects the newer marker. No final native schema or general CAD feature editor exists.

Run npm ci --ignore-scripts, npm run check, install pinned Playwright Chromium and npm run test:browser. Use disposable roots/profiles. For packaging run node scripts/fetch-corresponding-source.mjs after production npm ci; six immutable archives are cached in node_modules/.axiom-corresponding-source and included with licenses. Pin hashes in legal/source-manifest.json; never commit those large archives. Run the pinned Platform prepare-release.mjs and scripts/verify-package.mjs; this checks relocated lifecycle, source hashes and the actual packaged 29-case corpus.

Platform stays 0.1.12 at 6d240845cd77eb1879738d32c9f2b8fcfd7297c5. Do not replace with moving main/sibling sources. Geometry packages are exact locked versions. Worker cancellation/deadline kills the child; measured RSS postcondition is not an OS hard quota. Canvas is CPU, never WebGPU evidence. Split ambiguity/merge/import/kernel uncertainty must not silently retarget. No second kernel was executed; no independently reproduced bit-for-bit Wasm build is claimed.

Foundational ADRs remain Experimenting, not Accepted. E0.M3 is the next scoped 3D-mate feasibility milestone after owner review/progression. Do not freeze native schema until spatial-solver and reference/version graph evidence, or expand into E1 prematurely. Preserve old projects, immutable builds, protected sources and engineering-IP boundaries.
