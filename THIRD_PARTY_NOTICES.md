# Third-party notices

- **Axiom Platform 0.1.12**, Krozzeo, MIT. Runtime SDK source pinned to `6d240845cd77eb1879738d32c9f2b8fcfd7297c5`; archive integrity is retained in package-lock.json. Its LICENSE is distributed inside node_modules/axiom-platform. Only public exports are used by the production product.
- **Playwright 1.56.1 / playwright-core**, Microsoft, Apache-2.0. Development/browser acceptance dependency; preserve their LICENSE, NOTICE and ThirdPartyNotices files if distributing them. Browser binaries are separately downloaded testing tools and are not product assets.

E0.M2 additionally evaluates replicad (MIT), separately loaded OCCT/Wasm and PlaneGCS (LGPL; see [full geometry notices, sources and replacement instructions](legal/GEOMETRY_DEPENDENCIES.md)). Their original licenses remain in installed packages and complete corresponding-source archives are included in prepared deliveries. No 3D assembly solver, proprietary vendor translator or AI model is bundled.
