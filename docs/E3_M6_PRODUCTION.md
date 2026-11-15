# E3.M6 — Production part acceptance and exchange corrections

Candidate 0.3.12, PR19. Main/stable stay 0.2.6. E3 closure and M6 owner acceptance remain pending. This is a reviewable CAD part acceptance profile, not a manufacturing release or general assembly implementation.

## Owner corrections and root cause

Fresh projects use the legacy empty v0 envelope. M5 STEP preparation dereferenced native.graph before conversion. Existing tests imported into already converted documents, so they missed the fresh-project path. STEP preparation now creates an isolated native copy of that empty envelope. Analyze/preview remains read-only; only Apply commits conversion and import. New command and actual Platform Create-project browser tests cover this exact precondition.

File → Import / Export now select native Axiom or STEP. STEP import reports the actual FILE_SCHEMA and detected AP203 / AP214 / AP242 (other schemas are explicitly identified). Export selects AP203, AP214 or AP242 and MM/CM/M/INCH. A direct exact OCCT writer configures the selected protocol before constructing its translation model, checks the produced schema and preserves world placement. No STEP header relabeling. AP203/AP214/AP242 are verified in fresh isolated writer processes and in an independent native CAD reader. The owner's specific SolidWorks file was not supplied; equivalent independently generated AP214 fixtures are tested, without claiming live SolidWorks acceptance.

Native export retains the actual native envelope, editable history, parameters and immutable snapshots. Native import is an editable copy into the current project identity: it replaces working content only on Apply, remaps drawing-local snapshot references and independently revalidates copied snapshots before generating their bound hashes/evidence. Current destination immutable versions/publications are preserved. Original source publications remain in the original file; import does not republish them under a new identity. Input files are never rewritten. Import supports Undo/Redo; undoing a first import retains the now-native empty envelope when immutable snapshots have been copied. Native files are bounded to 2 MiB and existing combined snapshot bounds remain enforced. Corruption, unsupported source profiles or lost references fail without source writes. STEP limits from ADR013 remain unchanged. Native import is human-only; STEP retains existing isolated proposal authority.

Default datum visibility is semantic: Origin is visible; its canonical planes/axes are hidden. Newly created independent planes/axes are visible. New coordinate-system origins are visible and their children hidden. Explicit saved Hide/Reveal choices and the global reference visibility toggle remain authoritative. Drawing, picking and Manager state use the same default rule. Selected/preselected hidden references still have temporary feedback.

## M6 demo and manual review

Load Demos advertises only **E3.M6 Production Part**. Existing user projects remain untouched; historical acceptance fixtures are generated explicitly outside that catalog. The demo reuses the exact finishing bracket corpus, including its curved inspection bodies, additive/subtractive history, hole pattern, fillet/chamfer, five sketches and named equations, now with a nominal user-defined material and retained immutable versions. It is a multi-body test part, not an assembly.

1. Open the demo. Parameter Manager DesignSize starts at 40 mm. Change to 30 mm: HoleSpan follows, FinishRadius changes from 2 to 1 mm and ChamferSize from 1 to 0.75 mm. Undo/Redo and save/reopen retain geometry and existing snapshots.
2. Document properties → Part material exposes a custom name and density in kg/m³. The demo uses 2700 kg/m³ as a user-defined nominal value, not a certified material database. Mass is exact B-Rep volume × density, converting mm³ to m³. It appears with volume in the material status. A changed material does not alter geometry.
3. Export a native document and STEP AP214. Create an actual new project from Platform. Before any modeling, only Origin is shown. Import the original M5 source, current exported part and an independently generated AP214 file with defaults; Analyze displays protocol/units and exact preview, Cancel preserves empty source, Apply commits.
4. Switch Import to native: STEP-specific options disappear. Preview is isolated, Apply replaces working content and preserves this project's identity. Verify editable parameters, copied retained versions, Undo/Redo and save/reopen. Source file bytes remain unchanged.
5. Create an absolute reference plane, an axis and a coordinate system. Clear selection and move the pointer away: plane and axis remain visible, coordinate origin remains visible, its six children remain hidden. Hide/Reveal remains explicit and persistent.

Initial exact volume: 16272 − 6/√3 + 291π mm³. At DesignSize 30: 16308 − 6×0.75²/√3 + 282π mm³. Material mass = volume × 2700×10⁻⁹ kg. This independent analytic expression includes the equation-driven asymmetric chamfer.

## Acceptance and measured bounds

`tests/m6-production.test.mjs` verifies fresh legacy/native STEP previews for all three protocols, exact volume/area/mass, parameter propagation, native copy identities/snapshots, corruption rejection and interrupted atomic save/recovery with immutable version preservation. `tests/m6-exchange-commands.test.mjs` uses real human command envelopes and Undo/Redo, including a fresh project with imported snapshots and agent denial. `tests/browser-e3-m6.mjs` uses actual Platform Create, file dialogs and downloads, production edits/save/reopen, default reference rendering and native import.

`scripts/export-step-qa.mjs` emits 36 protocol/unit round trips, including the production part. `scripts/verify-step.py` independently checks validity, SHA/bytes, volume, area, mass center, bounds and solid count through QA-only native OCCT 7.9.3. It is not shipped in the application. Existing Windows/Linux native/browser/PDF and public installation/GPU gates remain mandatory.

`scripts/measure-production.mjs` records five warm regenerations, three fresh-process native validations and worker lifetime peak RSS. Profile budgets: warm p95 < 5000 ms; cold p95 < 20000 ms, retaining the actual worker deadline. Initial local Windows/Node24.21 measurements: warm p95 292.6 ms; cold p95 1068.5 ms; peak RSS about 247 MB. CI measurements are stored per OS; these are environment-specific measurements, not universal hardware promises or an OS memory quota.

Final exact-head CI, immutable publication and actual public Platform installation evidence belongs in delivery artifacts and PR metadata. This source report does not claim those gates passed before they run.
