# ADR028 — Production acceptance, native copies and STEP protocol selection

Status: E3.M6 experimental candidate; owner acceptance pending. Existing kernel/solver/Platform pins and main/stable are unchanged. This is an additive implementation of the approved E3.M6 part acceptance scope.

Fresh empty v0 projects are converted only in isolated candidates until import Apply. STEP exports use native STEPControl_Writer with actual AP203/AP214/AP242 transfer configuration; schema metadata is checked against the resulting file, not edited afterward. Native input keeps source bytes unchanged and forks editable graph/snapshots into the live project identity with native revalidation and new bound hashes. Original publications are not copied as destination publications. Existing destination snapshots remain immutable. Native import is human-only and revision checked; cancellation and invalid input retain committed source.

A primary definition can optionally carry a user-named material and densityKgM3. Exact shape volume produces nominal mass in kg. Older strict readers reject this extension rather than silently dropping it. The material is user-defined metadata, not a certified engineering database. No new kernel, solver or assembly/version publication policy is introduced. QA reader dependencies remain separate from product distribution.

See E3_M6_PRODUCTION.md, native and browser M6 cases, measured performance JSON and independent STEP reports. Primary writer parameter mapping: https://github.com/Open-Cascade-SAS/OCCT/blob/master/dox/user_guides/step/step.md .
