# E3.M4 — Dependency diagnostics, formulas and directed chamfer / 0.3.10

The owner requested M4 alongside these refinements. Main/stable remain 0.2.6. Candidate evidence, experimental delivery, owner acceptance and manufacturing release are distinct. Publication requires complete frozen-head Windows/Linux native/browser/independent PDF acceptance plus actual public Platform installation and hardware GPU execution.

## Current demo and manual checks

Only **E3.M4 Dependency Workbench** is advertised. Historical demos are explicit regression fixtures; previous user projects are preserved. The part retains the three-body M3 bracket, bores, fillet, cylinder and cone. Its chamfer starts in Distance and angle mode (1 mm, 30 degrees). A natively verified immutable initial version is retained for comparison. Initial volume is **16272 - 6/sqrt(3) + 291*pi = 17182.73936057949 mm³**, three bodies.

1. Open Parameter Manager. Document and part scopes, evaluated values, unit inference and source navigation remain editable. The feature dimension table now includes actual finishing amounts/angles, pattern count/spacing, extrusion/revolve limits and datum offsets/angles, rather than a misleading Depth row for every feature.
2. Trace dependents of **DesignSize**. The list includes FinishRadius, ChamferSize, HoleSpan, LocalCheck and their feature consumers, with the causal path/reason. Switch Sources/Dependents; choose the retained initial version to read that immutable source graph. Current document revision and source version are reported; historical reads never modify MAIN.
3. Change DesignSize from 40 mm to 30 mm. Before Enter, use **Preview update impact**. It lists direct/dependent source effects without committing. Exact geometry is checked by the ordinary mutation worker on commit; the source-only impact is not a shape-validity guarantee. Apply with Enter; the three bores move closer and the conditional fillet becomes R1. Undo/Redo must restore both source and exact shape. For the untouched demo, 30 mm gives **16308 - 3.375/sqrt(3) + 282*pi = 17191.980571153807 mm³**.
4. Try `doc.FinishRadius` as the DesignSize expression. The cycle must report a named causal chain and preserve the previous source/model. Try `Missing + 1 mm` and an incompatible angle/length expression; each must give a typed explanation without writing. Escape discards a row draft.
5. Add a scalar parameter with `SIN(30) + COS_rad(PI())`: expected -0.5. Type SI or RO to see blue function suggestions among parameter suggestions. Selecting a function inserts its parentheses with the caret inside. Enter validates the finished expression. Parameter names and function names remain distinct.
6. Edit **edge-chamfer**. Name then Selection lead the Inspector. The edge label is simply Edge/Circular Edge; internal identities remain server-owned. Hover a table row: that row and its specific Model entity highlight; leaving restores the active table feedback.
7. Toggle **Distance and angle** / **Two distances**. New chamfers default to 1 mm and 45 degrees, or 1/1 mm. Existing legacy symmetric chamfers retain the same geometry through the 45-degree default. Reverse switches the supporting adjacent face, so asymmetric results visibly swap sides. Enter updates preview; only Apply commits, Escape/right-click cancels.
8. In the first distance field try `ROUND(2,0)`. Preview uses a scoped ordinary parameter on an isolated candidate. Apply retains that formula; changing a referenced parameter regenerates it. Parameter Manager exposes the source expression and binding. Cancel must not create parameters in MAIN. Save/reopen must retain formulas, chamfer mode/direction and reference identities.

## Mathematical conventions (owner confirmed)

Safe bounded grammar, not JavaScript or Excel execution. Uses decimal points, comma-separated arguments, explicit multiplication, existing units (mm/cm/m/inch, deg/rad), arithmetic, comparisons `< <= > >= = == <> !=`, TRUE/FALSE and nested functions. Namespaces remain Name / doc.Name / local.Name / dim.Name. Comparisons require compatible units. Boolean results are scalar 0/1; logical tests accept dimensionless zero/nonzero values.

`IF(test, trueValue, falseValue)` evaluates only the chosen branch. All source references in both branches are still resolved and traced, so an inactive missing reference or dependency cycle is rejected. The chosen result must match the target units; a later branch change cannot silently change a bound field's units.

| Functions | Convention |
| --- | --- |
| IF; AND, NAND, OR, NOR, XOR, XNOR; NOT | IF takes 3 arguments, NOT 1; other logical functions are variadic. XOR uses odd parity; XNOR its complement. |
| ABS, SIGN | ABS preserves quantity dimensions; SIGN returns -1/0/1 scalar. |
| COS, SIN, TAN, COT, SEC | Numeric arguments are degrees. Typed angles are converted using their canonical radians. |
| ACOS, ASIN, ATAN, ACOT, ASEC | Numeric result in degrees. ACOT uses the 0–180 degree branch. |
| COS_rad, SIN_rad, TAN_rad, COT_rad, SEC_rad | Numeric arguments are radians. |
| ACOS_rad, ASIN_rad, ATAN_rad, ACOT_rad, ASEC_rad | Result is a typed radian quantity, suitable for an angle binding. |
| COSH, SINH, COTH, SECH; ACOSH, ASINH, ACOTH, ASECH | Dimensionless arguments/results, no angle conversion. `_rad` aliases have exactly the same hyperbolic meaning. |
| ROUNDCEIL, ROUNDFLOOR, ROUND | `(value, decimals)`, preserve dimensions; decimals integer -12…12. Ceil/floor use mathematical ceiling/floor; ROUND breaks half ties away from zero. |
| DEGREES, RADIANS | DEGREES reads numeric radians or typed angle and returns numeric degrees. RADIANS reads numeric degrees or typed angle and returns typed canonical radians. |
| EXP, LN, LOG(value, base), LOG10 | Dimensionless; real-domain checks, positive log argument/base and base not 1. |
| FACT | Nonnegative integer, within the evaluator's bounded finite numeric domain. |
| POWER(value, power), SQRT | Preserve calculated dimensions; dimensional powers require bounded integer exponents, SQRT even dimensions. |
| PI(), RAND() | PI is pi. RAND returns a stable scalar in [0,1), derived from retained expression and parameter identity; never changes solely on regeneration, Save, reopen or upstream value edits. Editing its expression can change it. |

The pre-existing lowercase `sin`, `cos`, `tan` continue to require a typed angle (for example `sin(30 deg)`), preserving old documents and equation curves. Lowercase abs/min/max/sqrt remain supported. New requested function spellings and `_rad` variants appear in the shared autocomplete catalogue. Parser length/token/depth, numerical magnitude, dimensional and native parameter bounds remain validated; this is not an unlimited symbolic or complex-number engine. Singular/invalid domains fail closed with the parameter/function chain in the explanation.

## Native authority and source compatibility

`dependency.inspect` is paginated and read-only, with kind/id/direction and optional retained versionId. Results carry documentRevision, sourceVersion, root and causal via/reason paths. `parameter.impact` dry-runs the shared source reducer, returns typed errors or paged affected sources, and explicitly reports `exactGeometryValidated:false`. No version bytes or model state are changed by either query; normal expected revisions and agent grants still apply.

One typed feature-field registry serves queries, bindings and dependency traces. Existing parameter targets are preserved. Inline operation/sketch-pattern `valueExpressions` and driving-dimension `valueExpression` create/update scoped ordinary parameters atomically in the same candidate as the operation. Cancelled/failed previews never mutate MAIN. Explicit bindings, units, missing references and dependency cycles remain validated; parameter deletion requires removing direct/inline users first. Literal unbinding freezes the current evaluated value, not a stale original field. Full exact geometry revalidation and existing WorkingHistory own Undo/Redo, not a second UI history stack.

Directed chamfers persist **E3-finishing/2** with mode, radiusMm (first distance), distance2Mm, angleDeg, reverse, optional typed parameter IDs and exact edge targets. The pinned replicad/OCCT distance-angle/two-distance builders operate on both verified adjacent faces of each current edge. Reverse switches the selected adjacent face; the default face is chosen deterministically from exact geometry, not pixels. Unsupported/ambiguous adjacency or impossible distances fail without replacing valid geometry. Legacy E3-finishing/1 retains symmetric semantics. Older strict readers reject the new profile. Old readers also reject unsupported formula syntax or new typed target fields rather than silently ignoring them.

Initial M4 demo retention uses the existing createVersion plus actual native verification; there is no fabricated immutable evidence. Source graph comparison is version-specific, not an E4 cross-project Latest/Pinned feature. Universal topological lineage, variable-radius fillets and a general spatial datum solver remain outside this batch. STEP interoperability remains E3.M5.

## Verification map

- `m4-formulas.test.mjs`: every requested function/variant, independent numeric oracles, unit preservation, lazy IF/static dependencies, safe syntax, domains and stable RAND.
- `m4-finishing.test.mjs`: exact asymmetric and distance/angle prism volume oracles in both directions; scoped formula persistence/propagation and atomic rejection.
- `m4-dependencies.test.mjs`: real session read-only traces/impact, typed missing/cycle diagnostics, full feature field queries, exact shape propagation and Undo/Redo, unchanged immutable history.
- `browser-m4.mjs`: physical row hover, short labels, both chamfer modes/reverse, blue function autocomplete, atomic inline formula Apply, source-only impact, retained-version trace, cycle rollback, exact Undo/Redo and Save/Reopen.
- Retained native/browser/security/review/sketch/reference/drawing suites plus independent PDF checks remain required on Windows/Linux. Actual public Platform discovery/download/hash/install/activate/launch and hardware GPU are final delivery gates, not inferred from a source branch.
