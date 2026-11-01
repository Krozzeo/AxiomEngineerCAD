# ADR021 — Parametric sketch relations and integrated editing

Status: implementation in progress under the owner's E1.M3 request. This extends the approved native feature graph, not the native envelope or Platform SDK.

Use a new strict sketch data profile, E1.M3-sketch/1, within the existing sketch-primitives feature type. M2 profiles remain unchanged until an explicit upgrade command; previous readers reject unknown profiles safely. Store constraints with stable IDs and entity/point-role references. Compile these references to bounded pinned PlaneGCS inputs in the existing isolated worker; temporary pointer targets never become permanent constraints. Reference dimensions are independently measured and excluded from driving equations. Report source constraint IDs rather than opaque compiled IDs. Derive local mobility from the constraint Jacobian, not a display flag.

Rectangle tools create four independently selectable lines with preset corner coincidences and horizontal/vertical constraints. No monolithic rectangle is introduced into the parametric profile. Migration preserves the old rectangle identity on its first line and records the operation in the normal revision/undo flow; the original immutable content remains reproducible.

Sketch editing projects world geometry through the same presented camera frame as Model. Pointer positions intersect the authoritative support frame. The renderer remains visible; smooth camera alignment and existing navigation remain shared. UI visibility preferences do not suppress domain regeneration. One selection controller owns Inspector context, including semantic endpoint/midpoint/center and constraint selection.

Undo/Redo restores working content through validated revision-checked commands. History is bounded and session-local, new edits clear redo, stale external mutations invalidate history, revisions advance monotonically. Immutable versions/publications and receipts are retained; undo does not undo a publication or rewrite saved history. Save/reopen remains an explicit independent operation.

## Implemented bounds and repair semantics

M3 accepts at most 64 source entities and 128 source relations per sketch, within the existing 16-sketch/native/worker limits. Solver inputs are compiled internally; this does not change the retained E0 64-primitive experimental profile. Paged source/diagnostics queries avoid unbounded source dumps. Pointer previews exceeding the compact result budget are explicitly unavailable; final constrained commit still uses the full source and normal validator.

Conflict/missing relations are retained as repairable working source with last-good coordinates; their status is Inconsistent/LostReference, never a solved sketch claim. Rendering and verification independently require stored coordinates to satisfy permanent relations whenever a sketch is reported solved. Downstream general extrusion remains E1.M5 and must reject unsolved profiles. Lost participants remain visible in relation diagnostics and can be removed/replaced explicitly.

Canonical Origin/planes/axes are derived definition-frame display entries, not deletable mathematical coordinate systems. Delete removes that Manager/display entry; View → Restore reference entries restores it. No sketch support is silently detached. Custom reference geometry authoring remains at its planned gate, as permitted by the owner.

Up to eight completed command jobs remain addressable by job ID for concurrent frontends; authority and revision checks are unchanged. Bounded UI retries apply only after an explicit pre-dispatch ResourceLimit rejection, preserving the original context; accepted/unknown writes are never replayed. Trusted local input supersedes an older panel-sync response that was awaiting source reads. No renderer/UI state is native geometry authority.

Sketch tool/selection state has its own ordered stamp, independent of camera updates. A camera update cannot republish an older sketch selection as a newer user action. Numeric/creation completion is also a local view change; delayed source reads cannot erase it.

Endpoint drag temporarily anchors the opposite endpoint at its source position while projecting the dragged endpoint onto permanent relations. That anchor is discarded, and PlaneGCS is solved again without pointer targets before reporting permanent DOF/redundancy. Segment drag uses two translated pointer targets. This avoids reporting a temporary drag anchor as a permanent fixed relation.

Hide/Reveal and canonical display-entry deletion persist in a bounded, document-bound `.engineer-visibility.json` sidecar with independent CAS revision, ordinary-file/link checks and human-only endpoints. Frontends broadcast only the updated preference revision and reload authoritative preferences; detached Model views follow Manager visibility actions. Native revisions and immutable content are unaffected.

Save waits for an already-running sketch diagnostic/preview read under the existing adapter queue, then repeats the expected-revision check and all pending/Main-job/disk-CAS guards. Preview coordinates never enter the saved document. This removes an intermittent busy response when another frontend finishes refreshing Inspector.
