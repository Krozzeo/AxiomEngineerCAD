# ADR-002 — PlaneGCS 2D experiment and independent diagnostics

Status: **Experimenting / review proposal**. E0.M2; CAD-R004/R023.

Evaluate unmodified @salusoft89/planegcs 1.3.0 Wasm. It supplies an actual FreeCAD-derived numerical solver, DOF and conflict/redundancy tags. SolveSpace is not embedded; its licensing/distribution is a different choice. A newly written unconstrained numerical solver would need much broader validation. No 3D solver reuse is implied.

The probe admits points, lines, circles, coordinate/horizontal/vertical/coincidence/distance/radius relations with literal mm values. Numerical residuals and a separate finite-difference Jacobian/rank calculation cross-check regular local configurations. A collapsed distance fixture returns SingularOrIndeterminate and no asserted DOF. Rank thresholds are probe values, not proof over arbitrary singular mechanisms. Failed solve retains input geometry; consistent redundancy is distinct from conflict.

Observed wrapper caveat: passing a non-driving radius introduced an auxiliary free parameter (reported DOF 4 versus geometric DOF 3). The domain therefore measures reference dimensions **after** solving, never adds them as driving equations or unconstrained solver parameters. The explicit reference fixture proves radius 99 cannot move a radius-4 circle and the reported geometric DOF remains 3. Do not silently omit this regression.

Temporary drag constraints target a free circle center; permanent radius remains 4, and the temporary targets are removed before remaining DOF is reported. A fixed point rejects drag without movement. This is pointer-like bounded solving, not the complete E1 interactive sketch tool. Input reference/type/size/nonfinite checks happen before numerical calls.

Original license, corresponding C++/binding source, FreeCAD source pin and rebuild/replacement material accompany prepared packages. Solver choice remains open to measured redesign. See E0_M2_REPORT.md and legal/GEOMETRY_DEPENDENCIES.md.
