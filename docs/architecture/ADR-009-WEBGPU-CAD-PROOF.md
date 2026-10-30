# ADR-009 — WebGPU CAD selection proof

Status: Experimenting, E0.M6, 2026-10-30; owner acceptance pending. Requirements CAD-R010/022/023. No MVP scope change. Uses original Engineer renderer/camera code and the unchanged exact kernel; no Game Engine scene/mesh authority or new runtime dependency.

## Choice and alternatives

Use a small WebGPU renderer with depth-tested color and r32uint ID attachments. CPU ray selection or the previous Canvas preview cannot prove actual GPU/semantic correspondence. A large scene-engine dependency would obscure this narrow experiment; broad workbench/camera customization stays E1.M1. See [W3C WebGPU](https://www.w3.org/TR/2026/CRD-webgpu-20260915/).

The shared kernel recipe produces the exact shape. OCCT same-domain simplification supplies display faces only after volume/area equivalence checks; current supported axis-plane/hole roles are uniquely resolved. Transient kernel hash collisions and duplicate roles refuse. Actual tessellation group→exact face→producer role maps generate a revision/content-bound selection manifest. IDs and triangles are never saved as reference identity. Curved-face area centroids are explicitly labeled; only planar faces advertise a plane normal.

GPU triangles and line geometry emit a depth-tested integer ID. Readback searches at most 3.1 pixels around the pointer. The server validates manifest, document hash/revision, entity class and supported exact role before returning semantic identity, definition-local measurements, occurrence path and rigid transform. Repeated occurrences share a definition but have distinct paths. The manifest is invalidated on any model revision; no cross-edit hole-face lineage or arbitrary topology acceptance is claimed.

Select / Orbit / Pan are explicit modes; selecting or dragging in Select does not change the model or orbit. Top/front/right/isometric and wheel zoom operate an orthographic camera. Full sketch/component dragging, configurable bindings, perspective, view cube and general assemblies remain E1/E4.

## Evidence and bounds

`tests/proof.test.mjs`, `tests/browser-proof.mjs`, `npm run test:hardware`: real Windows NVIDIA GeForce GTX1650, driver32.0.16.1692, Chrome156.0.8078.74. WebGPU adapter vendor nvidia/turing and isFallbackAdapter=false, real rendered/read-back face/edge/two repeated instance picks, top/bottom and front/back occlusion. CDP records physical devices separately; secondary Microsoft software adapter is not counted as NVIDIA proof. The headless hardware harness enables `--enable-unsafe-webgpu` and does not force a software backend. CI's missing/software device is explicitly reported and does not substitute for physical evidence.

Actual `device.destroy()` verifies device-lost handling; it does not simulate every driver reset. An explicitly unavailable navigator.gpu proves CPU drawing/export remains usable. Named profile and measured wall times are in [E0.M6 profile](../quality/E0_M6_PROFILE_V1.json); this is an experimental bounded baseline, not universal FPS/VRAM or device support. Worker RSS is a measured postcondition, not an OS memory quota.

Bounds: primary extrusion/through-hole plate, <=8 direct local occurrences, position components within ±500mm, supported normalized rigid rotations. External/nested native occurrence rendering, general CAD surfaces and ambiguous references refuse. Prior source/consumer and spatial labs remain available. No native schema change; broad rendering and immutable-version integration remain E0.M7/E1 gates.
