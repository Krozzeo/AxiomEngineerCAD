# Development with bounded context and focused diagnosis

## Start and scope

1. Run `npm run context`; read the compact brief and relevant contracts. Check current code and authoritative upstream state when it affects the task. Reuse unchanged verified context; do not repeatedly fetch immutable metadata while waiting.
2. Map each owner request to its module, observable result and smallest meaningful verification. Separate product failures from stale test assumptions. Keep implementation, validated evidence and owner acceptance distinct.
3. Return compact tool results: outcome, current commit, failing case, relevant excerpt and full report path. Batch independent reads, avoid entire catalogues/logs, and expand only for a concrete question. Approximately 1,000–1,500 tokens is a context target, not a license to omit a required contract.

## Implement and diagnose

- Edit the affected functions and run focused cases plus neighbors. Use one hypothesis and a bounded reproducer for each observed failure. Confirm the reproducer's preconditions, actual status/revision and failure before claiming a fix.
- Await observable completion, such as persisted visibility or a presented revision. Do not conceal failures with longer sleeps, skipped assertions or fabricated geometry/GPU results.
- Keep speculative improvements in the backlog. After a fix passes, broaden/repeat checks only for changed code, a failure or an unresolved concern.
- Keep full logs and failure artifacts on disk. The task summary carries new evidence and unresolved work, not the complete investigation history. Report actual token usage only when exposed; tool-output size is a separate proxy.

## Freeze and deliver

Finish version declarations, documentation and contracts before freezing a candidate. Then run complete acceptance on that exact PR head. A real failure justifies another candidate; cosmetic evidence edits should not repeatedly restart it. Final workflow/publication evidence belongs in artifacts associated with the accepted commit, without a self-referential documentation commit.

`check.yml` runs the complete Windows/Linux matrix for PRs and main integration, checks out the exact head and cancels obsolete acceptance runs per PR/ref. Branch pushes and publication tags do not duplicate acceptance. There is no docs-only success shortcut under the trusted acceptance name. The pinned publication verifier still requires a successful exact-commit PR run for experimental tags and the current open same-repository PR head. Publication concurrency remains protected and immutable.

Keep one tested prepared artifact through build, verification and publication. Actual public discovery/download/hash/install/activate/launch remains mandatory for a completed CAD milestone. Select the installed feature/critical smoke scenarios by impact; changes to kernel, solver, native persistence, references or rendering justify broader evidence. Preserve required numerical, security, independent PDF and physical GPU proofs; partial checks cannot be relabeled as full acceptance.

One delivery per coherent owner-requested batch. Process-only changes do not themselves complete a CAD milestone or require a new CAD product version. Do not merge main or publish stable without authorization.

## State and measurements

`PROJECT_STATE.json` is the compact index of reviewed intent, last delivered build, owner status and evidence links. Update it when those facts change. Handoff and implementation reports should link to authoritative records and remove completed items from pending lists. Confirm live CI/release state when needed rather than trusting an old snapshot.

For comparable deliveries, record full acceptance runs, repeated reads/truncated outputs, failure stage, and implementation/diagnosis/validation/publication time separately. Record tokens when available without inventing per-phase usage. Initial targets: 1–3 full acceptances per delivery and a measured reduction in token use; these are objectives, not guaranteed savings. A budget overrun calls for more focused context/diagnosis, never an incomplete delivery or bypassed gate.
