# Workspace restructuring progress

2026-11-16. Branch `engineer/project-workspace`, version0.4.1, based on delivered0.4.0 `cc3b6f26f21729e94acab2b757440befe7b02171`. User request: docs/requests/PROJECT_WORKSPACE_2026_11_16.md. ADR029 authorizes independent native files/project container. Main/stable remains0.3.13; no stable merge requested. Not yet a new delivery or E4.M2 acceptance.

## Implemented

- Manager Components→Features switch, actual current part heading, Group label, highlighted Exit component, shared Sketch/component Exit edit bar.
- Project folder/catalog with independent native1 files, open sessions/tabs, empty new projects, stable Platform lease/project identity, document+context scoped requests, fresh Save/Discard/Cancel decisions and project-wide layout.
- Actual Game Engine Project browser at fc2613243f0e52623dc053de5d9bd0796e4e7024, MIT attribution. Folders, breadcrumbs, inline creation, open/close/X/delete/explorer, native exact-derived isometric thumbnails, Project selection highlighting instances, drag insertion.
- Cross-file insertion uses verified effective snapshots, source/owner document identity and namespaced scene model keys. Rejects direct/indirect recursion. Working source refresh validates candidates and retains last-good data on failure. Historical snapshots remain unchanged. External in-place edit binds the source document, displays the parent assembly transiently and refreshes its working dependency on exit.
- Component Model/Entire Part/Hide/Reveal, matching render/picking/reference visibility, ghost rendering of other occurrences during edit.
- Separate Insert/Move inspectors, open-file selection table, multiple component selection, Translate/Rotate and Absolute/Relative icons, repeated Enter/Apply, free pointer drag, local Group creation/reordering/reparent with world pose preservation, large rightmost Cancel and operation highlights.
- Versions Left panel, immutable validated archives, native retained roots, branch DAG/checkout/main promotion/deletion, read-only historical previews without overwriting live work, three-way merge and explicit conflicts. Recovery restores unsaved work on failed save and refuses corrupt archive payloads.
- File catalog journal completes authorized create/move/trash after interruption; stale revisions fail before writes. Source paths forbid traversal/reserved files/hardlinks/symlinks. Delete uses recoverable trash. AI settings/token usage and GitHub destination project-scoped; history/proposals/journals part-scoped. Pending GitHub publication retains source document identity.
- Version-owned 0.4.1 **E4.M1 Project Workspace** demo: Base/Pin/Assembly native files, two Pin instances, open tabs, reserved project-working dependencies. Previous M1 demo preserved as explicit historical regression fixture.

## Focused evidence

- tests/project-workspace.test.mjs: independent file/session/save/reopen, path/delete guards, interrupted catalog recovery, shared project preferences with isolated history.
- tests/project-components.test.mjs: exact source-file insertion, repeated definitions, source identities, working refresh, recursion/stale document rejection, in-place transient scene and parent refresh.
- tests/component-motion.test.mjs: reparent world pose/order, absolute and local-relative transforms.
- tests/version-branches.test.mjs: immutable archives, independent merges, overlapping/order conflicts, failed save restoration and corrupt archive denial.
- Real Platform/Chrome/NVIDIA `.axiom/project-components-ui-extended-3.log`: Insert twice, Move, active inspector/Enter path, external in-place bar, ghost buffer and Exit edit passed.
- Real current demo `.axiom/project-demo-versions-ui.log`, test implementation `tests/browser-project-workspace.mjs`: current Load Demos, separate files/tabs/thumbnails, source selection highlight, external shared exact operation preview, source changes at both occurrences, retained native versions unchanged, repeated motion and Left Versions/read-only old geometry/current restoration passed. Included in complete browser suite.
- Full native run `.axiom/workspace-full-native-final.log`:354/354 passed. Final affected-domain/Platform/source-owner checks `.axiom/workspace-final-focused.log`:16/16 passed. Current demo additionally verifies actual free pointer drag and Group reparent world-pose preservation (`.axiom/current-demo-drag-groups.log`).

## Remaining before delivery

Complete exact-commit CI is still required. Local native suite `.axiom/workspace-native-freeze.log` passed355/355. Complete local browser run8 reached the separated-sketch regression and exposed a stale selection race; the focused replacement now passes with document-revision-bound sketch views and explicit stale-view denial (`.axiom/embedded-sketch-revision-bound.log`). Full sketch interaction/navigation/Convert Entities passes (`.axiom/sketch-interactions-workspace-3.log`). Current demo, including editing the second occurrence and correct Origin hover, passes (`.axiom/current-demo-right-context.log`). Legacy workbench/docking/embedded/interaction assertions passed; its first focused wrapper failed only because the wrapper report lacked criteria, now corrected. Dock controls are retained when Project/Versions content mounts, fixing layout restore. Native/source save/close and queued-context tests pass (`.axiom/workspace-close-source.log`). Source is ready for freeze; do not add more feature scope.

Then freeze complete source/docs/version, run required Windows/Linux/native/browser/PDF/STEP/performance acceptance on the exact PR head, publish immutable experimental0.4.1 through pinned Platform tools and verify public Platform discovery/install/activation/launch with actual GPU. Do not call source-only work delivered. No new PR/push exists yet at source freeze. Queued HTTP actions now revalidate the document/context at execution (negative test `.axiom/queued-contexts.log`), and saving a consumer saves dirty working sources first (`.axiom/workspace-save-closure.log`, `.axiom/workspace-causal-save-final.log`). In-place source editing opens its own source tab. No more feature scope should be added before freeze; diagnose only observed failures. Old PR22/release remains immutable.

M2 general mates and assembly drawings remain future scope. Legacy solver recipes with no occurrence/body identity mapping are refused by free motion instead of bypassing their mates. Ambiguous edits inside repeated shared groups require entering their shared context.

Local root: work/AxiomEngineerCAD. Python UTF-8/LF; Git `-c safe.directory=* -c core.autocrlf=false`; Node child Git absolute `C:/Program Files/Git/cmd/git.exe` on Windows. sources/ read-only. No subagents authorized. Preserve existing files and releases; no main merge authorization.
