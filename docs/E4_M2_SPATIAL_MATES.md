# E4.M2 — Spatial mates and workspace refinements (0.4.3 candidate)

Candidate frozen on `engineer/e4-m2-spatial-mates`, based on immutable delivered0.4.2. Main/stable remains0.3.13. Full exact-head Windows/Linux validation, experimental publication and actual public installation are required before delivery.

The complete owner request is retained in `requests/E4_M2_OWNER_CHANGES_2026_11_22.txt`. ADR030 records the native mate contract and current analytic bounds.

## Implemented paths

- Depth-clipped exact mesh thumbnails; previews requested for closed files from their saved native documents.
- Project tree divider in revisioned project layout, keyboard/drag resizing, dock-aware fixed-grid tiles with a40px minimum.
- Shared context bar styling; sketch bar replaces component bar while editing; Exit sketch at the right.
- Shared selection ownership across Project, Model and Manager, Escape/blank clearing, hover-operated component View submenu with distinct active state.
- Entire part rebuilds reference indexes; blank Manager context includes New group across its whole empty area.
- Groups created inside the common parent; native world placements retained. Supr supports groups with a child-deletion confirmation.
- Manual axis translation/rotation gizmo, multiple components, absolute/relative orientation, single release transaction.
- Insert component first in Assembly, selected/hovered source rows, part-only operation availability.
- Copy/paste occurrences and deep local groups with explicit source-document identity, including cross-file placement and cached dependencies; Project paste makes an independently identified native part with a numbered filename.
- Filename-only inline edit, unchanged-name no-op, drag suppression during text editing, open-file path/name and working-consumer updates.
- Edit component selection operation when nothing is selected.
- Ground/fix and native typed mates, per-component/global DOF, strict reference resolution, contradictory/redundant diagnosis and constrained motion.

## Current demo

Load **E4.M2 Spatial Mates**. The Base is fixed. One Pin is coaxial to the Base origin and has a6mm plane offset, leaving one spin DOF. The other Pin is free with six DOF. Mates shows the two retained relations and component diagnostics. Historical M1 fixtures remain separate from the production demo catalog.

Focused native checks cover occurrence references, exact cylindrical face axes, fixed relative frames,0°/180° angle endpoints, constrained spin, infeasible motion, lost/redundant/contradictory mates and verification. Actual Chrome/NVIDIA UI checks cover all stages in `tests/browser-e4-m2.mjs`: native diagnostics, Entire part references, selection clearing, blank Manager context, manual axis translation/rotation, fix/release/rejected motion, mate authoring/removal, closed thumbnails, splitter persistence, filename-only edits, disabled part Assembly controls, rename propagation, clipboard instances/files, nested grouping/group Delete and the shared component/sketch bar. Prior M1 workspace hardware regressions also passed. A full366-test native check passed before the final organization-frame regression was added; that new targeted case passed separately. Complete exact-head Windows/Linux CI, full browser regression and public installation remain pending.

## Focused recovery checks added during integration

A completed background thumbnail may refresh Project while a filename is being edited. The inline editor retains its actual DOM/input and text selection; delayed rename resolves the current row rather than a detached preview row. The same M2 owner walkthrough passed on actual Chrome/NVIDIA and explicitly labelled Windows SwiftShader.

Clipboard identity includes the source assembly document and exact occurrence paths. Cross-file pastes cannot select a same-named destination occurrence accidentally. Pasting an internal leaf part into Project extracts that definition, creates a new native document identity and uses its part name. Typed identity remapping preserves feature/parameter types and immutable dependency snapshots. Native document import rebinds local mate references; fixed pair frames and0°/180° endpoints have direct regression coverage.

## Frozen candidate verification

The13 focused native M2 tests pass, including exact cylinders, fixed relative frames, angle endpoints, import identity, file rename/copy, internal leaf extraction, cross-file component copies with colliding source/destination IDs, nested organization and retained group frames. Actual hardware and explicitly labelled software M2 walkthroughs pass. Full local browser regressions and complete exact-head Windows/Linux CI remain the publication gate. Delivery evidence is associated externally with the accepted commit, without a self-referential source commit.
