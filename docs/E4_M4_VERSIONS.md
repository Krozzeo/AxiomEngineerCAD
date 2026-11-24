# E4.M4 — Published versions and safe component updates (0.4.5)

Scope: immutable published component/assembly versions, Latest/Pinned resolution,
effective dependency snapshots, update preview/comparison/validation and historical
reconstruction, plus the owner's assembly interaction corrections. See ADR032 and
the owner request map. Source is a candidate until exact-head acceptance and real
public installation have passed; matching delivery evidence is recorded externally.

## Current demo

Load Demos offers **E4.M4 Versioned Assembly** only. Existing projects and prior
edited demos remain untouched. The project contains Base, Pin and Assembly files.
The first pin follows the published Pin through Latest; the second is Pinned to
publication1. Base retains its live project-working link. The base is fixed, the
first pin has one spin freedom, and the second starts free.

1. Open Versions. Component versions lists each source, policy, retained effective
   version and update state. Published versions is distinct from working revisions
   and from branches in the retained version tree.
2. Edit Pin in context, change its extrude depth from20 to25 and finish the feature.
   Working edits alone do not update published links.
3. In Versions, choose Publish current version, or select a retained history node
   and Publish selected version. The publication is immutable and its source is saved.
4. Exit component editing. Latest shows the new source shape; Pinned keeps depth20.
5. Change the Pinned row's policy or chosen publication. Preview validates and shows
   changed feature IDs and the effective dependency set; MAIN remains unchanged.
   Apply update adopts only that still-current candidate.
6. A missing reference or inconsistent mate produces a blocked update and retains
   the former effective snapshot. Historical versions keep their former closure.

Source publication refreshes valid open Latest working consumers. Closed consumers
resolve on opening. It does not overwrite historical assemblies or automatically
save consumer working edits. Missing sources remain distinguishable from valid
retained snapshots. Source resolution for this UI uses project-registered files.

## Motion and Mate corrections

Direct Model dragging and Move component share temporary motion. Several completed
drags retain the same MAIN revision and avoid native geometry rebuilds. Release
locks the pointer target; subsequent mouse movement does not extend the drag.
Exiting Move, Save or another edit confirms one grouped revision/Undo step. Cancel
of an in-flight drag restores that gesture; previously completed staged moves remain
part of the session. Discarding the document does not write them to disk.

Absolute rotation fields show the current XYZ Euler angles. Both motion paths can
run while Mate is being constructed, respecting permanent constraints. Preview uses
a reduced worker solve and GPU rigid transforms; confirmation uses native validation.

Mate has centered relation icons and a reverse-direction icon for applicable plane/
axis, signed distance, angle and tangent relations. Point-only constraints and Fixed
do not present a meaningless direction. Apply commits a relation and leaves an empty
selection ready for the next; Done commits the ready relation and closes (or simply
closes an empty operation); Cancel drops only the uncommitted proposal.

Relations in Components and Mates use the same selected outline as component rows,
support Edit/Delete context actions and double-click editing. Component rows in Mates
reuse the component context menu without New group. All mates, its relation branches
and part relation children initially collapse. Entering part edit opens/focuses
Manager Features and the Features ribbon, including selection from Model.

## Verification and boundaries

Focused cases: `e4-m4-motion.test.mjs`, `e4-m4-versions.test.mjs`, registered
`browser:versioned-assemblies`, plus affected M3/M2 neighbors. The actual browser
walkthrough checks release stopping, no rebuild per drag, grouped revisions, current
rotation, drag during Mate, tree interactions, reverse preview, contextual focus,
human publication/Latest/Pinned/preview Apply and native-preserving GPU failure/reload.

No collision avoidance, arbitrary-surface tangency or global convergence guarantee
is added. GPU display transforms do not replace native geometry or numerical authority.
Main/stable remains0.3.13; this milestone does not authorize merging or stable release.
