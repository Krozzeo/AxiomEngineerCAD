# E0.M2 experimental geometry libraries

The Engineer source remains MIT. The following **unmodified, separately loaded** dependencies retain their own licenses. They are experimental adapters, not final kernel/solver selections. Reverse engineering needed to debug modifications of these LGPL libraries is permitted; no product restriction removes that right.

| Library | License / source |
| --- | --- |
| replicad 1.2.0 | MIT; Steve Genoud; npm integrity in package-lock; upstream sgenoud/replicad, package gitHead 6ef8ae10f7cb708ec34c74b37f3be255c3c2dbc8 |
| replicad-opencascadejs 1.1.0 | LGPL-2.1-only; package LICENSE retained; build configuration source e4b05f67dc4e2393a876ce8c5064a9c93db05bf1 in sgenoud/replicad |
| opencascade.js build bridge | LGPL-2.1 with OCCT exception; taucad/opencascade.js ebd263f15337b440b391492af073662707e86482; LICENSE and LICENSE.OCCT-Exception in corresponding source |
| Open CASCADE Technology V8_0_1 | Open Cascade SAS and contributors, LGPL-2.1 with OCCT exception; b8f597c677811d1f9f4d8a97f5ae2825c0353a42; source license and exception retained in archive |
| @salusoft89/planegcs 1.3.0 | FreeCAD contributors, Miroslav Šerý / Salusoft89; package metadata says LGPL-2.0-or-later, its LICENSE/source headers specify LGPL-2.1-or-later. Distribute under the included LGPL-2.1 terms; upstream source 9d26baef0b240fe0eef4186d4e5e5e66ec3620b7 includes patched GCS C++/bindings and build recipes |
| RapidJSON / FreeType build inputs | Immutable versions in the bridge's DEPS.json; preserve their upstream licenses in the corresponding source archives. PlaneGCS's Dockerfile specifies its Boost/Eigen system-header build dependencies; preserve source notices and do not claim an independently rebuilt binary was tested. |

## Sources included with each prepared installation

The production build runs `node scripts/fetch-corresponding-source.mjs` before preparation. It downloads complete immutable archives listed in source-manifest.json, verifies their SHA256, and includes them under `node_modules/.axiom-corresponding-source/` inside the ZIP. `sources.json` records exact URLs, bytes and hashes. This includes the kernel source, bridge/build patches, wrapper configuration, solver source/bindings and upstream dependency recipes. No network is needed to read those sources in an installed package. Archives are compressed source material, not executable product code.

For a source checkout, run the same script to retrieve the pinned material. Docker/Emscripten are needed only to rebuild/modify the libraries, not to run the prepared product. Rebuild the bridge using its pinned DEPS.json/Dockerfile and the replicad custom single-threaded configuration. PlaneGCS's archive includes Dockerfile, CMakeLists.txt, binding generator, C++ sources and original FreeCAD source commit in planegcs/commit.txt. Upstream commands and toolchain requirements are in those archives; Engineer has **not** independently reproduced the npm binaries bit-for-bit. Kernel/buildchain provenance comes from upstream published source and pinned package integrity, with this limitation recorded for review.

## Replacement and relinking

Wasm and JS are not embedded into Engineer code, encrypted, signed shut or bundled/minified together. Replace the compatible single-threaded `node_modules/replicad-opencascadejs/dist/replicad_single.js` and `.wasm`, or `node_modules/@salusoft89/planegcs/dist/planegcs_dist/planegcs.js` and `.wasm`, with your rebuilt matching module. Run the direct CLI or register your own prepared local installation in Platform. Keep public module exports and adapter ABI compatible. Do not overwrite immutable published assets; modified installations are not certified as the original tested build.

No claim of license review acceptance or universal binary compatibility follows from successful geometry tests. ADR-001/002 remain review proposals until owner signoff.
