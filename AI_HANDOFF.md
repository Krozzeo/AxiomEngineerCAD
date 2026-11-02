# Engineer handoff — E1.M5 editing recovery / 0.1.7

Read AGENTS.md, the full MASTER_DESIGN.md and the contracts relevant to any next change. Current branch: `engineer/e1-m5-editing-recovery`, based on delivered 0.1.6 / d6bab409a319d3fa9a65531bfb2dc74fd79e7bdc (PR14). Owner requested the corrections in [scope](docs/milestones/E1_M5_UX_0_1_7.md); this is not E2 authorization or milestone acceptance. Preserve previous immutable builds and all user files.

## Current implementation

[ADR024](docs/architecture/ADR-024-SKETCH-EDIT-ROLLBACK-AND-RECOVERY.md) explains source/execution separation, compatibility and receipts. `src/commands/execution.mjs` projects explicit suppression plus a temporary edit rollback in dependency order. CommandSession owns the human edit checkpoint/lifecycle and passes rollback scope to actual command/proof workers; immutable contents verify independently. Finish revalidates the downstream chain; failed finish remains editable. Save validates without leaving the editing view. Cancel restores source as a new revision. The proof manifest checks rollback context as well as source hash.

Feature enable/disable uses the shared reducer and common proposal authority. Bindings owned by a deleted feature are removed atomically; consumers still need dependency repair. Sketch-plane orientation is optional and versioned through strict source validation. Camera yaw/pitch/roll, projection, rays, smooth alignment, F8 reversal and same-session panels use the same orientation basis.

`soft-drag.mjs` treats the opposite endpoint as a preference: if it removes all permitted selected-endpoint motion, solve with only permanent relations. `sketch-dimensions.mjs` implements focus/Back/existing dimensions and explicit overdefinition choice. Automatic units use `unitMode: auto`, canonical mm/radians and degrees for scalar-to-angle binding; inferred canonical context survives unbinding. Parameter creation solves only changed/actually affected sketches. Token completion is a custom safe list, not a whole-expression datalist replacement.

Human exact operation preview is a bounded proof-build candidate validated through registered extrusion input schemas and the actual reducer/kernel. It never changes MAIN/history and cannot create source references or export artifacts. Apply cancels outstanding preview then performs the normal revision-checked mutation. Locked depth navigates to the expression row.

Receipt capacity is 10000 as explicitly requested; there is no eviction or unbounded-memory claim. Only transient busy errors retry. Reused operation IDs still return the original receipt or reject changed inputs. 51 tools; SDK/kernel/solver pins unchanged.

## Verification and delivery work

- Full domain run: 213 passed; latest targeted recovery suite: 12 passed, including an added consumed-sketch conflict guard. Run the final complete suite for the final exact count.
- `tests/browser-editing-recovery.mjs` covers actual primitives, failed finish/repair, midpoint-constrained endpoint drag, three support flows/orientation, dimension hover/focus/Back/overdefinition/edit/move, automatic parameters/bindings/completion, preview, suppression, deletion and visibility.
- `verifyRecoveryProjectUI` must wait for Hub's Closed state after a tool-driven close before clicking Open, then verifies Save/Reopen and display preferences. The asynchronous Hub catalog cannot be treated as updated in the same turn as manager.close.
- Historical browser tests now use the actual New Sketch support/orientation workflow and explicit overdefinition dialog. Existing camera/separate-window/native/review/PDF/authorization assertions remain required. Hosted-camera failures report parent/child state rather than being blindly rerun.
- Final domain/browser/physical GPU, five independent PDFs, relocated ZIP, exact-head Windows/Linux PR CI, experimental publication and genuine public Platform0.1.13 discovery/install/launch are still delivery gates. Follow AGENTS10 without asking again for already authorized milestone publication. Do not claim delivery from a branch or local package alone.
- `scripts/check-editing-ui.mjs` is a focused development harness; ENGINEER_HARDWARE=1 uses actual Chrome/NVIDIA without forced software flags. Its fixtures/temp directory are test-owned. The full browser suite also includes the recovery flow.

Previous delivered 0.1.6: exact PR CI 41471021481; publication 41472653262; immutable ZIP SHA256 `8cf8f71986af61bc74c24f7ef3c04021e50aff45df89bfc21fedb4c23b6eedd6`, 99,876,907 bytes; actual public Platform0.1.13/NVIDIA/five-PDF proof exists in the task delivery records. Owner reported bugs after that review delivery; no E1.M5 acceptance is implied.

## Remaining product boundaries

The M5 demo is the only production demo for this release; historical fixtures are separate. Proven extrusion caps are supported sketch faces; arbitrary side-face lineage is not silently guessed. One connected part/up to eight additive extrusions remains the declared geometry profile. General feature breadth, assembly and drawing editors and real-provider AI remain at their scheduled gates. No stable/main merge is authorized by experimental delivery alone.
