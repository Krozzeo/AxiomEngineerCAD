# ADR027 - Refine new additive solids and keep source references stable

New additive extrusions explicitly record refined topology. Use the existing exact boolean builder history to resolve caps through refinement; verify material volume and surface area against the unrefined result, validity and one closed connected solid. Existing feature records keep their original topology so persisted face/edge witnesses and historical versions are never silently retargeted. Changes that invalidate an exact witness still require explicit repair. Older strict readers refuse the new optional refinement field.

Display and picking omit identified coplanar/smooth internal divisions and cylindrical seams. Semantic geometry remains available for independent verification of existing references. True profile boundaries and circular center references remain selectable.

External Snap uses current verified source geometry and stores only used implicit targets. Hover is coalesced and does not materialize entities. Single-source driving constraints are refused; mixed constraints must act on local geometry. Radial drag is a temporary goal through the same constraint solver.

A Depth draft reuses the searchable measurement control and previews the same atomic extrusion/binding reducer used by Apply. Serialize preview transitions, retire obsolete work, and preserve Cancel/Apply draining. Numeric replacement unbinds only the affected depth; other parameter targets are retained.

See [0.1.12 scope](../milestones/E1_M5_CONSOLIDATION_0_1_12.md).
