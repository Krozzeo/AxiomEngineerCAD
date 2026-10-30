# ADR-008 — Shared semantic tools and human Apply

Status: **Experimenting**, E0.M5 review candidate, 2026-10-30. Owner acceptance pending. Master v0.2; no foundational scope change or new dependency.

## Problem and alternatives

Manual editing and automation must produce the same exact, validated document. A separate agent mutation path would duplicate geometry, unit and reference rules. Simulated clicks provide neither typed context nor reliable replay. Reimplementing generic review and journaling would duplicate Platform authority. This experiment therefore uses one Engineer reducer and numerical worker, with the accepted Platform 0.1.12 tools, changes and task-journal exports. General feature editing and real provider integration remain deferred.

## Executable decision

`src/commands/catalog.mjs` registers 17 tools and strict versioned envelopes; the checked-in [catalog](../contracts/SEMANTIC_TOOLS_V1.json) records schemas, effects, units, limits and unsupported capabilities. The server binds actor, project, session and grant independently of submitted JSON. Ordinary human controls and typed tools use the same `domain.command` reducer and real before/after native/kernel checks. Length quantities support mm/cm/m/inch, count uses scalar; canonical measurements retain explicit units. Semantic IDs and producer roles replace mesh indices. Literal imported names/notes are data.

Human session authority and explicitly granted local agent tokens are separate. Agent grants permit ReadOnly/LocalProposal, never MAIN mutation or Apply. Revocation cancels owned pending work. Grants expire with the session and are never journaled. Local exposure refuses RemoteRestricted/RemoteFull and external effects before any dispatch; no provider adapter is enabled by this milestone.

Proposals capture clean saved native MAIN, content hash/revision, effective dependency versions and actual source identity/byte stamps. Commands update only an isolated copy and private task journal. Real native/kernel validation generates full SDK diff chunks and before/after evidence. Human review must retrieve every page. A changed command invalidates that review. Apply requires the current SDK review hash, exact proposal revision, expected MAIN/dependencies and explicit `ApplyAndSave`; it rechecks source stamps and commits one atomic native revision. Manual MAIN commands change the working document and require ordinary Save.

Operation IDs are bound to actor/grant and immutable input fingerprints. Repeated identical requests return their initial receipt; completion is queried separately. Changed input cannot reuse an ID. Accepted work is not a successful numerical result. Receipts separate accepted/completed/rejected/failed/cancelled outcomes and recovery errors.

## Persistence, failure and limits

SDK TaskJournal stores bounded proposal records under `.engineer-review/`; ordinary-file, link and size checks precede access. Authorization and review approval are never restored. Pending proposals reopen suspended. Before Apply, history is checkpointed as Applying. Native WAL/recovery and durable operation ID decide whether a primary write committed; a later journal failure reports persisted state and reconciles on reopen instead of applying twice. Unknown/invalid records refuse or suspend; source/proposal cancellation never rolls MAIN backwards. Keep review history alongside native primary/journal/backups when copying a study.

Bounds: 16 KiB input/response, 25 rows/page, 256 KiB candidate, 8 retained proposals, 8 commands/proposal, 16 journal records, 64 diff rows and 256 in-session receipts. One isolated worker at a time; inherited 20-second/default worker and memory/output checks apply. RSS is a measured postcondition, not an OS-enforced quota. Exhaustion returns a bounded failure; this is not unlimited production history.

## Evidence and compatibility

[E0.M5 report](../milestones/E0_M5_REPORT.md): 17 new semantic transaction tests, 71 total, actual Hub/browser proposal/review/Apply/manual/reopen, retained 29 kernel/2D and 28 spatial cases. Tests include actor/scope/effect forgery, unknown schema, units/nonfinite/ref failures, paging, replay, stale MAIN/source/review, cancellation/revocation/shutdown, pre-write failure and post-commit journal reconciliation. Package verification additionally executes the installed HTTP tools, first exact extrusion, agent proposal, human review and durable Apply/reopen.

Native schema remains format1. No third-party pin changes, implicit migration or historical snapshot rewrite. Existing M1–M4 documents/demos remain supported within their existing bounded capabilities. No general sketch/feature editor, real model quality, remote exposure, drawing/vector output, GPU or manufacturing release claim. Publication/CI and owner acceptance are separate gates. ADR-011's broader remote exposure decision remains pending E0.M6.
