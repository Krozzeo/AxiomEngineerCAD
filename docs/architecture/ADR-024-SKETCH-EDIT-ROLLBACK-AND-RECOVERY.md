# ADR024 — Sketch edit rollback, feature suppression and recovery

Status: implemented for owner-requested 0.1.7 review; validation and delivery evidence tracked separately. This corrects E1.M5 and brings forward explicitly requested suppression UX from E3. It does not authorize E2 progression or change kernel/solver/SDK pins.

## Source versus execution

The complete authoritative graph is retained. A pure execution projection removes explicitly disabled features and their transitive dependents. During a human sketch edit it also excludes features later in history. Literal source/schema validation still runs over the complete source. Actual sketch solving, B-Rep generation, support resolution and viewport picking operate on the enabled execution graph; immutable snapshots always verify independently without the working edit rollback.

Human-only, revision-scoped `sketch.edit.begin/finish/cancel` tools expose the same edit lifecycle used by UI. Begin captures the source checkpoint. Sketch commands advance working revisions and remain undoable; they do not require intermediate profiles to produce downstream solids. Finish revalidates the complete enabled chain before clearing the rollback; failure keeps the edit and its repair controls. Cancel restores the checkpoint as a new revision. Save validates the full chain and refuses invalid unfinished profiles without replacing disk bytes; a valid save retains the active editing view. Closing/discard uses existing Platform ownership and save decisions.

`feature.enable` persists an optional boolean `disabled` field on sketches/operations. Enabling does not clear explicit descendant disables. Exact regeneration in dependency order must pass before an enabled source change commits. Deletion removes target bindings owned by that feature, not the parameter itself. Consumers in the feature graph still require explicit dependency repair/deletion.

## Exact operation previews

The authenticated human proof-build API accepts a bounded registered extrusion operation. It validates the typed input and computes a temporary source candidate through the same reducer and exact kernel. Source, working revision, Undo and immutable versions remain unchanged. Preview selection cannot become a saved reference; exports/sharing reject preview artifacts. Apply cancels outstanding preview work then invokes the authoritative mutation; Cancel rebuilds working source. Bound depth is read-only but its unchanged value allows name/reverse edits.

## Units and compatibility

Automatic parameters carry explicit `unitMode: auto` and a canonical evaluated unit. Unbound scalar expressions remain dimensionless. Binding a scalar to length interprets it in mm; binding to angle interprets it in degrees and stores radians. Typed expressions retain their dimensional meaning. Simultaneous incompatible bindings fail atomically. An inferred unit remains a canonical context after unbinding/deleting the source operation, preserving other consumers. An explicit typed expression can infer a new unbound unit; an explicit scalar unit returns to dimensionless semantics. Only changed or actually affected sketches must solve for parameter edits; unrelated existing conflicts remain visible and repairable.

New sketch support orientation stores an optional validated normal reversal and right quarter-turn. Frame construction preserves handedness and exact source attachment. Existing documents omit these additions and remain unchanged; older strict readers refuse the new feature/parameter/plane fields rather than silently ignoring their semantics.

## Interaction and receipts

The opposite endpoint is a drag preference, not an unconditional permanent constraint. When it removes all permitted motion of the selected endpoint, use the source nullspace without that preference; permanent constraints remain unchanged. Dimension input receives keyboard focus and selected text; Escape/right-click undo one reference-selection step. Overdefinition offers explicit Keep driving / Reference / Cancel and preserves actual solver diagnostics.

Receipt capacity is 10000 as requested, preserving exact duplicate detection and rejection of changed inputs with reused IDs. Retries are restricted to transient busy errors, not exhausted-capacity or worker failures. No receipt eviction or blind write replay is introduced. The capacity remains a bound, not unlimited-memory storage.

## Evidence gates

Regression cases reproduce open/disjoint intermediate profiles, failed finish/repair without reopening, midpoint-constrained endpoint rotation/length, force/reference/cancel dimensions, actual token completion, automatic units, bound reverse preview, source-safe cancellation, suppression/re-enable, binding cleanup, visibility, save/reopen, stale/agent refusal and operation 10001. Exact-head CI, original-preserving compatibility, physical GPU UI, independent PDF regression and public Platform installation are required before claiming delivery.
