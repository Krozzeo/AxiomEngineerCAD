# Engineer handoff — E0.M1

Read AGENTS.md, the master in full, IMPLEMENTATION_STATUS.md and docs/milestones/E0_M1_REPORT.md. Current work is on `engineer/e0-m1-foundation`, based on design commit `9b3c972872c224be164811954116dea1a5d3138f`.

E0.M1 implements only the provisional lifecycle foundation and is a review candidate, not owner-accepted. Tests use the exact installed Platform 0.1.12 source; production code imports public SDK files/lease/loopback. The browser test starts the direct CLI and actual host/Hub with disposable roots, no user's profile or provider accounts. Run `npm ci --ignore-scripts`, `npm run check`, then install the pinned Playwright Chromium and run `npm run test:browser`.

Tested implementation source: `7095daca0d861dccb6f7c5055b985ca9b50eec8b`. Public push was rejected by automatic permission review; ask the owner for explicit permission before publishing this payload to Krozzeo/AxiomEngineerCAD. Do not bypass through another GitHub tool. No PR or remote CI is claimed.

Do not advertise version 0 as the final CAD format or treat the metadata workbench as a renderer. No kernel, topology, solver, AI or drawing capability exists. Before E0.M2, obtain owner review of E0.M1 and propose measured kernel/2D/topology experiments and license analysis. Do not stabilize schema until E0.M2/M3 proof.

Known limits: bounded session-local operation receipts, no automatic stale-lease recovery, no crash/power-loss acceptance, no schema migration. Browser reconnection only targets the same live authenticated service. Direct close releases resources; hosted close is managed by Platform. Sources/imports and actual geometry are outside this slice.

Never use real provider credentials in tests or include user paths/project contents in evidence. Preserve all previous design requirements and protected sources. Remote CI/PR/owner acceptance are separate from local tests; inspect exact final delivery commit.
