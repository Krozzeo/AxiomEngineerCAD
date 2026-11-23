# E4.M1 — shared components and in-place modeling

Candidate 0.4.0 reuses the native1 graph. This source implements the M1 scope; complete exact-head acceptance and public experimental installation are mandatory before reporting delivery. Owner acceptance is separate. Main/stable remains 0.3.13.

## Delivered behavior in the candidate

A definition owns one parametric feature history; each instance owns its own rigid placement and owner definition. Repeated assembly groups expand into distinct occurrence paths with composed quaternion transforms. Each reachable definition regenerates once for the display; geometry, sketch and datum picks retain their complete occurrence path. One shared part edit updates every instance without cloning authoritative geometry. Unrelated definitions and retained immutable versions remain unchanged.

The existing sketch, feature, reference and material reducers execute in a transient definition context and restore the document root before returning. Exact regeneration filters the owned feature history; global parameters and their expressions are retained. Validation remains global, including IDs, feature ownership, cycles, normalized quaternions and dependency/version integrity. Edit rollback suppresses later features only in the edited definition. Operation previews use exact tool geometry positioned at every shared occurrence, while the rest of the assembly stays visible.

Revision-checked tools: `component.inspect`, `component.definition.create/remove`, `component.instance.insert/update/remove`. Model mutations retain existing human/agent authority, isolated proposals, numerical verification, atomic commit, history/undo and reviewed Apply. Agents cannot mutate MAIN or apply their own proposals. Removing an instance retains its definition; deleting the root or an in-use definition is refused.

## Demo review

1. Load **E4.M1 Shared Components** from the experimental installation. Model shows a base, two pins in repeated nested groups and an independent stop. Only this demo is advertised; historical fixtures remain in acceptance tooling.
2. Open Manager / Components. Expand the repeated Pin groups. Each contains an occurrence of Shared pin, backed by one definition.
3. Double click a Shared pin occurrence, or select it and choose Assembly / Edit component. Features now shows that definition. The context button changes to Exit component.
4. Double click the pin extrusion, change Depth and press Enter. The preview appears at both shared pin positions. Apply updates both pins; the independent stop/base stay unchanged.
5. Double click the pin sketch. Its plane/camera and pointer coordinates use the selected occurrence placement. Other components remain visible; only this part's downstream geometry rolls back. Create/edit sketch entities, then Exit Sketch and Exit component.
6. Assembly / Insert or manage components opens the component Inspector. Choose a definition and owner, position and XYZ rotation, then Insert instance. No feature geometry is copied. Select an existing occurrence in Components to update its local placement, reparent or remove it.
7. Create a Part or Assembly group definition by name, insert it, enter it and create a sketch/extrusion using the normal tools. Unused definitions remain listed and reusable. Delete unused definition refuses one that still has consumers.
8. Undo/Redo component changes, Save, close/reopen, and inspect retained Versions. The old saved snapshot preserves its prior geometry/hierarchy.

Placement fields are local to the selected owner. Moving a shared group instance affects only its subtree occurrence. Editing the group definition's child placements affects every occurrence of that group.

## Evidence and boundaries

`tests/e4-components-start.test.mjs`: analytic nested quaternion composition, independent placement/removal, cycle/identity/transform rejection and immutable snapshot preservation.
`tests/e4-components-modeling.test.mjs`: actual B-Rep volumes for two shared nested occurrences and an unrelated part, exact shared edit/preview, semantic paths, definition-local rollback and retained snapshot hashes.
`tests/e4-components-commands.test.mjs`: registered revision-checked commands, agent MAIN denial, atomic cycle rejection, read-only occurrence paging and undo without persisted-file mutation.
`tests/browser-e4-m1.mjs`: actual current demo through the Platform/editor, two-occurrence exact preview, Apply, in-place sketch world frame with other parts visible, reuse/placement insertion and screenshot.

Native1 resource bounds remain explicit and fail safely. This milestone adds local in-document sharing and grouping. Mates follow E4.M2; cross-component associative references and published Latest/Pinned consumers are not enabled by this in-place context. Assembly physical/interference checks and assembly drawing/export are later scope. Existing supported part drawings and historical foundation fixtures retain their previous paths. No manufacturing-release claim is made.

Final acceptance/release run IDs, immutable ZIP hash and actual public install/GPU proof belong in the delivery artifact tied to the accepted commit, avoiding a documentation-only rebuild after acceptance.
