# ADR-015 — Provisional lifecycle shell and Platform pin

Status: **Proposed / exercised**, pending owner review. Date: 2026-10-30.
Requirements: CAD-R001, lifecycle parts of CAD-R008/CAD-R022. Gate: E0.M1.

## Context and choices

Engineer needs real lifecycle evidence before selecting a kernel or freezing a native CAD schema. Platform 0.1.12 already recognizes `axiom.engineer-cad` and accepts declared format versions, including 0. Its official-local adapter supplies authenticated loopback browser startup and scoped project lifecycle. A separate product process can import public file, lease and loopback primitives without copying Platform sources.

Use Node 24+ ESM with a dependency on the exact published Platform commit `6d240845cd77eb1879738d32c9f2b8fcfd7297c5` and SHA512 integrity in package-lock. Use a minimal HTML/CSS/JS metadata workbench; no framework or kernel decision is implied. Alternative: freeze v1 now (rejected as contrary to E0 sequencing); use a sibling source checkout (rejected as unreproducible); copy the SDK (rejected as competing infrastructure).

Experiment with a version-0 JSON envelope named `project.engineer-provisional.json`. It is deliberately bounded to identity, revision and metadata, with a mandatory experimental marker. Both direct CLI and Platform call the same adapter; all committed mutation and disk writes are serialized. Browser requests require session bearer, exact host and same-origin request. Only direct sessions may close themselves over HTTP; hosted closing is controlled by Platform. Pending fields cannot be silently saved as though already applied.

## Consequences and limits

This is an E0.M1 implementation choice for review, not acceptance of ADR-006 or native v1. No `.axcad` package, CAD shape, snapshot, publication or migration is promised. Preserve provisional sources when a future converter is designed. No credentials or AI transport are exposed. There are no provider calls or remote project transmissions. Production SDK imports are limited to public exports; tests access provider internals only to run conformance against its actual host.

Platform is MIT; its LICENSE remains in the pinned dependency. Keep THIRD_PARTY_NOTICES.md. Existing ADR-001–014 stay pending. Evidence and exact implementation commit are indexed in the milestone report and IMPLEMENTATION_STATUS.md. Acceptance: pending owner signoff.
