# E1.M1 — Model workbench (0.1.0)

Date:2026-10-31. **Review candidate**; owner accepted the E0 measured baseline and requested E1/0.1.0. [Owner Go](../architecture/E0_OWNER_GO_2026_10_31.json). This first E1 delivery covers E1.M1, not all of E1 or the full MVP. No main merge implied.

## Actual behavior

The default editor now centers the real WebGPU view, with File/Edit/View/Tools menus, source-linked History/Components/Mates tabs, Inspector, current selection/units/solver status and reference planes/axes. History displays actual dependencies in topological order; readable labels are presentation derived from source types. Selecting a rendered entity highlights its owning source. Inspector presents exact area/length/volume/point and occurrence/provenance details; no unknown material mass is fabricated.

Vertex/edge/face/body/component/feature/datum filters use one validated current semantic manifest. Eight named box corners come from actual B-Rep edge endpoints; display triangle vertices and circular seams are not silently promoted to stable CAD identity. Depth-writing points prevent rear-corner retargeting. New paged ReadOnly workbench.inspect and headless selection.inspect tools bring the catalog to21; stable target IDs/roles/path and source revision/hash are independent of transient pixel IDs. Agent results match actual human selection without a live GPU requirement.

Canonical XY/XZ/YZ planes and X/Y/Z axes are available even in a new empty native0 project, without converting or saving new CAD data. Camera, reference visibility, projection, selection and panel changes do not alter native bytes/revision. The current editor supports CAD/trackpad navigation presets, focused keyboard, fit, normal-to, standard views, perspective/orthographic and adaptive GPU buffers. Camera drag cancellation restores its start state. A Select-mode entity drag does not orbit or edit a component; actual geometry dragging belongs to subsequent milestones.

Existing proof/lab/review/native/drawing controls remain under Tools → Engineering diagnostics. Current GPU geometry display retains E0 supported plate/direct-local-occurrence bounds; arbitrary/external/nested scenes report unsupported rather than omitting geometry as a success. Their native source graph/diagnostics remain available. The current A4 template still describes the primary plate, not an authored assembly drawing.

## Owner test

1. In Platform install/activate experimental0.1.0, choose **Load Demos → E1.M1 Model Workbench**. The exact model builds automatically. A new manually created project instead opens empty with its canonical frame.
2. Select a face in the model: Inspector shows exact data and History highlights its source. Change filter to Vertices/Edges/Bodies/Components/Features/Datums and inspect the relevant entity. The Inspector dropdown and tree provide keyboard alternatives.
3. In Select mode, left drag does not orbit. Middle drag orbits; Shift+middle pans. Wheel zooms. Focus the canvas: F fit,1 Front,2 Top,3 Right,0 Isometric, arrows orbit,Shift+arrows pan,+/- zoom. Escape cancels an in-progress camera drag or clears selection.
4. Choose an XY plane in the tree, then **Normal to**. Try Projection → Perspective and return Orthographic. Tools offers Trackpad bindings (Alt+left,Shift+Alt+left). Typing in document properties does not navigate the view. View menu toggles tree/Inspector.
5. Components lists the actual cap occurrence; Mates lists its plane relation. Tools → Engineering diagnostics retains earlier parameter/proposal/history/PDF workflows. No new sketch-creation toolbar is advertised; E1.M2 adds that editing slice.
6. Edit Notes under Document properties → Apply properties → Ctrl+S. Close from Platform and reopen: document identity/model/notes remain, with no implicit native schema change.

## Evidence

115 domain tests (100 retained+15 workbench) cover empty/legacy no-write frames, actual B-Rep corners, all seven semantic classes, occurrence frames, wrong class/forged/stale identity, paged/source-safe queries, headless worker, HTTP authority, numeric projection/fit/mode oracles, identical in-flight read sharing/cancellation and actual old0.0.7 decoder compatibility. Browser evidence uses the real default/empty/Hub UI and separate physical NVIDIA/Chrome proof; unavailable/software/device-loss results stay explicitly labeled. Old57 numerical cases and independent5-PDF parsing/rendering remain regression gates.

Final local/domain/browser/hardware/package results and measured profile are captured in evidence/E1_M1 and E1_M1_PROFILE_V1.json. Exact final Windows/Linux CI, public ZIP hash/size and actual public Platform discovery/download/install/activate/demo proof belong to the delivery PR/immutable release. Only that verified package is an installable delivery; source/CI alone is not.

[Plan](E1_M1_PLAN.md), [ADR016](../architecture/ADR-016-E1-WORKBENCH.md). Existing native0/1 schemas, immutable history, original-preserving recovery, source/runtime/license pins and Local-only provider denial are unchanged. E1.M2–M5 remain planned; E1.M1 owner acceptance is pending.

Local final hardware proof passed on the recorded NVIDIA/Chrome device without unsafe-WebGPU flags, zero page errors. Current five vector PDFs passed independent pypdf/pdfplumber/PDFium parsing/rendering. Measured timing/resource samples are in [profile](../quality/E1_M1_PROFILE_V1.json); these are observed values, not hardware-independent latency guarantees.

The full local pinned-Chromium browser regression also passed with explicit unsupported-GPU classification and zero page errors. The relocated local-development package passed all57 retained numerical cases, native/review/PDF/history and installed workbench21-tool/7-class/no-write/reopen proof. Those development archive hashes are not the eventual public release hash; final delivery identifies the immutable experimental ZIP separately. Multiple editor views share/adopt only matching anchor/source/options; a different preview source invalidates visibly instead of silently retargeting.
