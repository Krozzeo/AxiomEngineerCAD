# E4.M1 project workspace — 0.4.1

Owner-requested structural extension after 0.4.0. Main/stable is unchanged. This document describes the candidate; installation and exact CI evidence must be recorded separately before claiming delivery.

## What changes

A project contains independent native part/assembly files. Saving a consumer also saves dirty working sources first; discarding a source refreshes its working consumers. Project reuses the actual Game Engine browser, with folders, inline creation, exact model-derived isometric thumbnails, open/close/delete/explorer actions and drag insertion. Tabs switch the actual working document, preserving unsaved edits and separate Undo/Redo. A new project is empty until its first part is created.

Components supports Model/Entire Part/Hide/Reveal, transparent surrounding geometry during in-place editing, an Exit edit bar, shared source-file updates, Group creation and drag reorganization. Assembly has separate Insert and Move operations, icon motion modes, repeated Apply/Enter, free-component pointer dragging and a rightmost Cancel. Selected construction buttons remain highlighted.

Versions is a separate Left panel with immutable snapshots, branch ancestry, historical read-only preview, creation/checkout/main promotion/deletion and verified three-way merges with explicit conflicts. Histories stay outside the native working snapshot limit, and preserve the existing native1 format.

## Demo checks

1. Load **E4.M1 Project Workspace** from the 0.4.1 installation. The Project panel contains `Assembly.engineer.json` and a Parts folder with Base and Pin. Three part tabs are open. The assembly shows a base and two pins.
2. Open Parts. Select Pin once: both instances highlight. Double-click it: the Pin tab opens its own features. Switch back to Assembly; return directly from Components to Features and check the Assembly heading.
3. Double-click a Pin instance in Components. Check the Pin heading, Exit edit bar, highlighted Exit component and transparent other geometry. Edit the Pin extrusion; its preview appears at both occurrences. Apply and Exit edit: both pins update while their placements stay independent.
4. In Assembly → Move component, select one pin, Translate/Relative X=5 and Enter. Repeat Enter; only that occurrence moves. Try Rotate and Absolute modes. Cancel closes the inspector. Free pins can also be dragged in Model.
5. Right-click a component: compare Model, Entire Part, Hide and Reveal. Model hides its datums/sketches; the solid remains. Create a Group from the Components context menu and drag an instance into/out of it, confirming its world position stays unchanged.
6. Open a source part in Project, then Assembly → Insert: only other open project files appear. Insert another Pin, or drag its Project thumbnail to Model. Inserting Assembly into itself, or creating an indirect recursion, is rejected.
7. Create → New version opens Versions. Create a baseline, edit/save a piece and create a second version. Double-click the baseline: it is read-only. Exit the version tab to return to current work. Create a branch, vary a dimension and merge it; conflicting changes require explicit resolution.
8. Close a dirty part tab: test Cancel, Save and Discard. Reopen the project from Platform: the project identity stays stable, each part retains its own history and open tabs are restored.

## Boundaries

Free component motion does not add the E4.M2 general mate system. Unsupported legacy solver placements are refused rather than bypassing their mates. Assembly drawing breadth and project-wide multi-file GitHub publication remain separate work; existing individual native publication keeps its validation rules.
