# E4.M5 — Assembly analysis and Main version series (0.4.6)

Owner scope: retained November24 request and ADR033. Implementation candidate; complete exact-head acceptance and public installation are separate gates.

## Current demo and analysis

Load Demos: **E4.M5 Assembly Analysis and Versions**. Base and three Pin occurrences include intentional positive-volume interference, contact and separation. Base has nominal steel density; Pins initially have no material, so total mass/COM/inertia are explicitly incomplete. Analysis → Assembly analysis computes exact B-Rep pair intersections and minimum distance. Set Minimum clearance, press Enter or leave the field. Pair rows highlight their occurrences. A clearance violation is distinct from touching or positive-volume overlap; analysis does not prevent motion.

Assign Pin material/density in Document properties (for example2700 kg/m³), return to Assembly and Analyze. Main-following instances update from the source; each positioned solid counts once. Reports use mm, mm³, kg and kg m². Inertia is about the assembly mass center, expressed in world axes, with the parallel-axis theorem. Overlapping parts remain separate physical occurrences; mass is not computed from a fused union. Supported bound:32 solid occurrences, native validated solids and source closures. Missing density never becomes a made-up mass.

## Versions walkthrough

1. Manager → Versions shows Main with its right-hand badge and the open version with its checked document icon. + freezes Main and makes its copy the new Main; saving alone does not create versions.
2. Select a row: Inspector edits Name/Description and lists working project consumers. Open a retained version read-only; toolbar Exit returns to Main. Make Main restores the selected content and preserves the former Main. Other rows remain ordered by creation time.
3. In Pin, create a save point, change extrude depth20→25 and return to Assembly. Latest follows Main without publishing.
4. Parameter Manager → Component versions selects Latest or any retained version. Select a row to highlight its occurrence. Enter or leaving the edited row commits. Another instance can keep its own selection. Status reports update/repair/source state rather than adding another Policy control.
5. Delete an in-use version by Inspector, context menu or Supr: confirm the usage warning. Consumers replace it with the recorded row above it and warn once. Deleting Main chooses the newest survivor. The only Main cannot be deleted. Historical archived dependency closures remain immutable.
6. When changing geometry loses mating references or creates conflicts, the dialog offers Disable affected relations or Apply and repair manually. Automatic Main following retains the last effective geometry until this decision. Grey/pause means disabled; green/bold plus red? means missing reference; red/bold plus red X means conflict. Edit or restore a valid source version to repair it. Both tree presentations share Enable/Disable and diagnostic styling. No-mate documents disable the Mates tab.

## Insertion

Insert Component lists project parts/assemblies with their icons, whole-row selection and bounded scroll. Version lists Latest first, followed by all source versions. Location chooses absolute assembly origin or one exact model/reference selection. This positions the occurrence only; it creates no relation. A point uses its position, a planar face its defined center, a straight edge its midpoint, a circular edge its center and other supported edges their endpoint. Instances keep their orientation. Copy/paste preserves the original choice. Project drag inserts Main-only sources directly, otherwise opens Insert with that source selected.

## API and compatibility

Authenticated scoped workspace/version/action supports create, open, exit, main, edit, delete and usage. Workspace/action supports component-version-set, component-version-ack, source-versions, source-catalog, mate-enable and assembly-analysis. Mutations require operation identity/current document/context/revision; confirmation candidates reject stale sources/consumers.

Agents use **cad.assembly.properties.v1**, ReadOnly, with projection summary (default), components or pairs and bounded paging. It uses the same native computation as the human analysis UI. GPU presentation is never a mass or geometry oracle.

Legacy immutable native data and branch archives are preserved; current UI exposes one version series. M5 profiles explicitly add disabled/diagnostic mates and version bindings. Project folder history sidecars are part of version persistence; no claim that a bare native geometry export contains the entire sidecar history. Kernel/solver/Platform pins are unchanged. Main/stable is not merged by this experimental delivery.
