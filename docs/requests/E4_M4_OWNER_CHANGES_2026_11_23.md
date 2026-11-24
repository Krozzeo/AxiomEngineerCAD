# Owner request map — E4.M4

Owner requested these corrections with E4.M4 and clarified that motion must stay
fluid for direct Model dragging as well as Move component. In the follow-up choice,
the owner selected **group the motion session**: confirm on exiting Move, saving or
starting another edit; Undo reverts that complete session.

| Request | Implementation | Focused evidence |
| --- | --- | --- |
| Part edit opens Manager Features and Features ribbon | component/edit-context activation | M4 actual Model-picked edit |
| Absolute Rotate initializes current angles | current pose to XYZ Euler fields | M4 numerical/UI cases |
| Stop dragging on release | release seals gesture, later pointer moves ignored | M4 direct drag with immediate post-release movement |
| Avoid per-move revisions/load | sequence-checked temporary MotionSession, one native confirmation | native multi-stage/save/Undo; two actual drags, one revision |
| Components relation menu/selection/double click | shared mate row, stable selection DOM, Edit/Delete | M4 component relation walkthrough |
| Mates row selection/component menu | shared outline and component menu without New group | M4 tree walkthrough |
| Default collapsed relation branches | explicit per-branch expansion state | M4 initial and newly created Fixed branches |
| Center relation glyphs | shared inline-flex centering | real inspector screenshot |
| Reverse applicable mate direction | M4-spatial profile, native signed/orientation equations | inverse domain cases and read-only reverse preview |
| Drag during Mate | shared motion path and reference rebind after confirmation | actual Model drag during construction |
| Apply / Done / Cancel | repeated authoring and explicit finishing | actual Apply remains open, Done closes |
| Reduce CPU, use GPU where suitable | affected solver island/worker, immutable GPU transform buffers | measured local solver fixture and actual GPU dispatches |

Milestone scope additionally includes published versions, Latest/Pinned and safe
validated updates. Known limits and the demo route are in E4_M4_VERSIONS.md.
