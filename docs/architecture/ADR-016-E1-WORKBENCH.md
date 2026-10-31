# ADR-016 — E1 workbench, reference frames and selection

Status: **Review candidate for E1.M1**. Date:2026-10-31. Software0.1.0. E0 owner Go is recorded separately in [decision](E0_OWNER_GO_2026_10_31.json). Requirements CAD-R001/003/006/008/009/010/022/023; Master15/E1.M1. Approved MVP scope unchanged.

## Decision and alternatives

Evolve the existing exact renderer/selection worker into the central workbench; keep legacy diagnostic controls accessible under Tools → Engineering diagnostics. Use the same proof session/atomic document/review authority. A second mesh-only modeling view would split selection truth; a new scene framework would introduce an unmeasured dependency. This milestone adds presentation and bounded read queries, not a new native document schema or general feature editor.

Left tabs display actual source identities, topologically ordered feature dependencies, component occurrences and existing mates. Inspector selection links back to source nodes. Read-only workbench/selection tools and human GPU picks resolve the same semantic target: definition, producing feature, role and occurrence path. Pixel IDs are temporary and never saved. Feature/body picks refer to the current exact result, not arbitrary historical lineage. Only eight uniquely proven box-corner vertices are exposed from actual B-Rep edge endpoints; circular seam vertices are intentionally excluded rather than misnamed. Point rendering writes depth so coincident rear corners cannot replace visible front corners.

Canonical XY/XZ/YZ planes and X/Y/Z axes belong to the definition reference frame, with stable document-scoped IDs and explicit normal/direction in mm. Their wireframe extent is presentation only, and they do not add features to old/native0 documents. Empty projects show this frame without implicit conversion. No user-authored datum or sketch-plane editing is claimed yet. Solid display retains the accepted extrusion/cut/direct-local-occurrence bounds; unsupported external/nested/general scenes report limitations and preserve native data. The tree still exposes their source identities.

The view owns orthographic/perspective matrices, fit, standard orientations, normal-to a resolved plane, wheel zoom and viewport resize. Model dimensions/poses are unchanged by camera, layout or selection. Drawings remain exact CPU-generated vector output, not perspective screenshots. Read-only visual builds share only an identical live in-flight calculation (same anchor hash/source/options), retaining cancellation and revision checks. Automatic startup never launches over dirty/pending/busy/recovery state; explicit Build remains available when ready.

## Navigation candidate for owner usability review

Select mode: left click selects; a left entity drag does not orbit or edit the model. CAD preset: middle drag orbits; Shift+middle pans. Trackpad preset: Alt+left drag orbits; Shift+Alt+left pans. Explicit Orbit/Pan modes override left drag. Wheel or +/- zoom; F fit;1 Front,2 Top,3 Right,0 Isometric; arrows orbit,Shift+arrows pan; N normal-to; P projection; Escape cancels an active camera drag by restoring its starting camera, otherwise clears selection. Canvas must have keyboard focus; typing elsewhere does not navigate. Ctrl+S uses the existing guarded Save. File/Edit/View/Tools menus and tree/select controls offer discoverability. Two presets and panel visibility apply to the current editor; durable per-user layout/docking remains later work.

## Evidence and compatibility

15 workbench domain cases extend100 retained tests. Real default/empty/Hub browser flows, exact seven-class hardware selection/occlusion, keyboard/mode separation, source highlight, agent semantic-query parity, save/reopen and device unsupported/lost behavior. Actual prior0.0.7 source decoder reopens the new demo unchanged;0.0.6 refusal of M7 profiles remains intact.21 tools now include cad.workbench.inspect.v1 and cad.selection.inspect.v1, both ReadOnly with existing scope/revision/receipt/budget guards. No provider transport/credentials or native schema changes; all pins/licenses remain.

Exact counts, measured hardware/camera/pick latency, reports, fixture identity, package and final public-install proof belong to the E1.M1 report/profile and exact delivery PR/release. Browser software/unsupported results never substitute for the physical GPU run. Full sketch creation/constraints/expressions/extrusion are E1.M2–M5, not hidden behind disabled toolbar stubs here. E1.M1 owner acceptance remains pending.
