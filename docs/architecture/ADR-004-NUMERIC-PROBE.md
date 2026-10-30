# ADR-004 — Initial analytic numeric profile

Status: **Draft for measurement**, E0.M2; final profile acceptance E0.M6/M7. CAD-R002/R003/R004.

Canonical probe lengths are double-precision mm. Input mm/cm/m/inch conversion is explicit (1 inch = 25.4 mm). Revolution is a full 360-degree analytic case. Future mass units, general angular expression grammar, HLR and GPU-picking tolerances are not frozen here. No manufacturing tolerance is inferred from numerical error or screen rounding.

Declared probe checks: 1e-7 mm reference-length matching, max(1e-6 mm³, |V|×1e-8) analytic volume error, max(1e-5 mm², A×1e-8) area error, 1e-7 mm sketch residual, relative rank threshold 1e-7. Tessellation deflection 0.5 mm is solely presentation. These values are distinguished by purpose and remain measured draft bounds, not one epsilon or manufacturing guarantees.

The interactive profile admits finite dimensions 0.01–1000 mm, 1–4 separate holes and a regular supported sketch subset. Named corpus includes a 0.1 mm cube, nominal 40×30×10 mm prism, dimensional edit, exact inch/cm conversion, cuts, cylinder, half-overlap booleans and negative degeneracy. Expected analytic constants are independent of the kernel; also check B-Rep validity, solid count, surface area and lineage separately. Matching volume alone cannot pass topology or editability.

Each run reports actual errors, time, peak worker RSS, versions and unsupported cases. No speed guarantee, broad model-scale certification or bit-identical B-Rep claim. Known singular configurations return indeterminate rather than a fabricated DOF. See E0_M2_REPORT.md; freeze supported hardware/complexity only after E0.M6 measurements and E0.M7 review.
