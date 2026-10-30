# E0.M1 — Runnable lifecycle foundation

Status: implemented review candidate; owner acceptance pending.
Requirements: CAD-R001, initial lifecycle portions of CAD-R008/CAD-R022. This milestone does not accept those entire mature requirements.

## Scope and prerequisites

Use published Platform 0.1.12 at `6d240845cd77eb1879738d32c9f2b8fcfd7297c5`, API 0.1 / IPC 1. Runtime dependencies use the HTTPS commit archive and package-lock integrity. Production imports use only public SDK exports. Integration tests intentionally exercise the installed provider's actual host, client and manifest validator.

Deliver an independently runnable Node 24+ product, official-local IPC adapter, six required lifecycle methods, authenticated browser metadata editor, provisional persisted envelope and CI. Preserve the master E0 order. No kernel, solvers, geometry schema, AI tools or optional import/rename/demos capabilities are advertised.

## Acceptance cases

- Create in an authorized empty directory; detect without writes; open/status/save/close/reopen preserve identity and applied metadata.
- UI and headless metadata edits share the adapter queue, revision validation and Document implementation.
- Save/Discard/Cancel; unsent fields report pending state and block Save. Closing hosted sessions remains host-owned.
- Stale revision, external disk change, incompatible/corrupt input, foreign envelope, unauthorized origin/path, linked files, active lease and failed process/startup do not overwrite saved data or return false-ready.
- Retained operation IDs return the original outcome; conflicting reuse is rejected. Buffer reports use monotonic client sequence rather than consuming mutation receipts.
- Actual Platform host creates a child Engineer process and reopens it. Browser test also exercises Hub form/actions, direct CLI, save and pending fields, and zero page errors.

## Storage and recovery boundary

`project.engineer-provisional.json` uses reserved `axiom.engineer-document`, format version **0**, with an explicit `E0.M1` marker. It stores only stable document identity, working revision, name and notes. Unknown fields/formats are refused. Version 1 and a final container remain deferred to E0.M4 after E0.M2/M3.

The shared SDK provides exclusive leases and temp-write/fsync/rename. Failed writes retain dirty working state; external changes block replacement. Mutation receipts are bounded and session-local. Abrupt process death may leave the SDK lease: do not auto-delete an unknown/live lease. Full durable receipt recovery, power-loss testing, stale-lease recovery UX, historical CAD snapshots and migrations belong to E0.M4/E6. An uncertain result requires inspection of saved identity/revision before retrying, not blind replay.

## Human review

Use the README commands with a disposable project root. Edit/apply properties, save, cancel close, then close/reopen. In Hub, choose Engineer CAD, create a document, edit/apply, observe dirty status, Save, Close and Open. Review screenshots and the report. Owner acceptance is required before recording E0.M1 as accepted and advancing to dependent E0.M2.
