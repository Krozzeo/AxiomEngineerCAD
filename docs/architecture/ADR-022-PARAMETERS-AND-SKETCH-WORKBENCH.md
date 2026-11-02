# ADR-022 — Scoped equations and responsive sketch workbench

Date: 2026-11-01. State: implementation decision for owner-requested E1.M4 review; no foundational kernel/solver change. Supersedes neither ADR021 nor immutable older documents.

## Source and scope

The owner requested E1.M4 plus the attached dimension/selection/Sketch Manager interaction changes. MASTER v0.2 E1.M4 supplies scoped expressions and table/source navigation. The requested principal line/point/circle relations are an explicit early subset of E3, without arcs, trim, patterns or a general sketch extrusion claim. CPU/Wasm remains authoritative; the accepted Platform SDK and exact-kernel/solver pins stay unchanged.

## Decisions

Typed parameters use `E1.M4-parameter/1`, explicit document/component scope, a bounded recursive parser with unit dimensions and a derived dependency DAG. No JavaScript evaluation, scripts, filesystem access or network functions. Values/dependencies are derived and rechecked when reading. Bind only existing driving sketch dimensions and the bounded primary geometry probe. Changing expressions applies all dependent values and solves the actual sketches before one atomic revision. MAIN and proposals share the reducer, independent geometric verification, stale/dependency/lease checks, cancellation and history. Old readers refuse these profiles without writing; old source versions remain immutable.

`E1.M4-sketch/1` adds typed relations and persisted UV dimension placement. Rectangles remain independent line segments plus relations. Semantic endpoints/midpoints/centers and dimension participants retain stable source IDs. Reference dimensions are measurements, never solver drivers. Coordinates are editable only where the independent constraint Jacobian reports freedom. Bulk edits form one Undo action. Lost references remain explicit repair states.

A persistent same-origin browser worker previews the pinned planeGCS solver off the main thread. It receives only bounded current sketch data; it cannot write source or receive session authority. Preview is solved geometry, not unconstrained pointer approximation. On release it stays visible through the authoritative typed command and actual exact verification. GPU renders tessellated geometry/selection; it does not become the numerical authority. Preview timing excludes cold Wasm initialization and is reported separately from release-to-revision latency.

The pinned Emscripten binding lazily generates a method caller for some conflict/redundancy paths. Do not enable JavaScript `unsafe-eval`: browser diagnosis falls back to the same typed Node solver diagnostics, with paged constraint/entity/mobility projection. Valid warm drag uses the browser worker. Conflict/indeterminate movement remains refused. CSP permits only the required Wasm compilation and same-origin workers.

A bounded, document-scoped child process reuses loaded exact kernel/solver runtime across mutually exclusive proof/command/diagnostic jobs. It recomputes actual source each time, caches no proof or B-Rep, validates request/reply identity, enforces deadlines/output bounds and terminates on abort/error/session close or idle expiry. Heap limit is a V8 limit, not an OS RSS quota; reported RSS is process lifetime peak. Credentials are scrubbed.

The pinned GCS proportional constraint ignored the ratio in an isolated measured fixture. Equal line/circle circumference therefore uses exact auxiliary right-triangle equations (angle atan(2π)), with an independent circumference residual and source DOF cross-check. No dependency patch or visual substitute. Drag removes temporary source endpoint anchors only; permanent auxiliary fixed origins survive the source-DOF recheck. A browser-worker solve-and-drag fixture covers nine principal relation families under the shipped CSP.

References, sketch feedback, dimensions and GPU uniforms use the same presented camera snapshot before command encoding. This also prevents replacing feedback buffers after encoding. Separate panels use independent camera ownership stamps and sketch-selection stamps, so delayed peers cannot interrupt local alignment. Explicit aligned normal requests reverse direction while preserving screen up. Replacing a verified scene preserves an active camera animation; only initial automatic fitting without an active sketch or explicit user navigation cancels it. This prevents asynchronous builds from another frontend stopping alignment mid-flight. A deterministic browser regression refreshes the scene during a normal animation.

## Evidence and limits

Tests cover expression bounds/units/scopes/cycles, actual solver residuals and mobility, target ownership, old-reader refusal, reviewed agent proposal parity, cancellation/stale rollback, worker restart/expiry, real pointer edits/physical dimensions and installed save/reopen/Undo/Redo. Hardware and public-install evidence are collected for the final commit externally; review publication is not owner acceptance.

Only lines, points and circles are supported. Circle-circle tangent is external. Equal curve length supports the implemented line/circle combinations. Signed x/y dimensions are intentional. A reference face must resolve uniquely and be planar. The current demo binds sketch dimensions and the retained probe separately; general sketch-to-extrusion regeneration starts in E1.M5.
