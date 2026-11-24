> E1.M4 implementation addendum (2026-11-01): [typed parameter/profile contract](PARAMETERS_E1_M4.md), [ADR022](../architecture/ADR-022-PARAMETERS-AND-SKETCH-WORKBENCH.md) and [review evidence](../milestones/E1_M4_REPORT.md). Native format remains 1; new profiles are explicitly refused by older readers. Current reviewed scope does not complete E3 or general extrusion.

# Native Data, Versions and References Contract

**Baseline:** Master v0.2.0. **State:** measured native1 foundation accepted for E1 progression by the2026-10-31 E0 Go; broader version/publication capabilities remain at their scheduled gates. **First decisive gate:** E0.M4 after topology and 3D solver proofs.

## 1. Logical user artifact vs physical storage

The user creates and saves a unified **Engineering Document**, with Model / Assembly / Drawing work modes. Internal storage may be a portable project directory and self-contained exportable package, a database plus portable package, or another experimentally validated form. No requirement mandates a physically monolithic binary file. The chosen format must support atomic recoverable saves, portability, schema migration, source preservation and correct offline reopening.

## 2. Entity graph and identity

| Object | Required identity and role |
| --- | --- |
| Document | Stable document ID independent of absolute file path; schema version, units and metadata |
| Definition | Stable definition ID; sketches, feature/dependency graph, exact geometry provenance, properties |
| Instance | Unique instance ID; definition reference, transform, occurrence path and effective version |
| Subassembly | Explicit grouping/hierarchy with cycle rejection and coherent occurrence paths |
| Sketch / feature / entity / constraint | Stable internal IDs and typed dependency references; geometric subelements use semantic selectors |
| Drawing / sheet / view / annotation | Stable IDs, model/assembly target and effective source revisions |
| Parameter / equation | Stable ID, explicit namespace/type/unit, dependency DAG |
| Imported source | Untouched attachment, checksum, translator/version, conversion fidelity and provenance |
| Revision / recovery snapshot / immutable version / publication | Separate typed lifecycle entities, never one ambiguous generic "version" |

A definition can be instantiated repeatedly without cloning authoritative geometry. Instance transforms are local to occurrence frames. Identity of a referenced geometric subelement must survive safe regeneration or produce a typed ambiguous/lost state; kernel face-array ordering and WebGPU selection buffers are not persistent identities.

## 3. Cross-document dependency resolver

A reference to another document carries:
- source document ID and definition ID (never a path as identity);
- policy Latest or Pinned and optional declared channel;
- pinned requested immutable version if applicable;
- effective resolved immutable version and resolution receipt;
- source locator hints, checksum/provenance, availability/compatibility state;
- consuming definition/occurrence path and reference provenance.

A missing/moved/offline source preserves the last verified effective state while reporting a visible unresolved dependency. Never invent, silently choose a new definition, silently retarget a face or mutate historical publications. Cycles among documents/definitions are rejected before commit. Version resolution is independent of the transport or the UI mode.

## 4. Current Main version series (owner revision2026-11-24)

ADR033 and Master section6 supersede former publication/branch consumer policy. Each file has one editable Main and ordered retained version identities. + archives Main and creates its copy as the new Main. Promotion preserves the former Main. Named node identity differs from immutable content identity; snapshots remain checksum-verified. Source history uses the recoverable series sidecar plus immutable objects. Old branch/publication data remains readable historical evidence, not a current publication requirement.

Latest follows source Main; Pinned selects any retained version. Per-instance choices can share identical immutable bindings without coupling later choices. Bindings retain source identity, logical node ID, effective content hash/snapshot and relative locator. Valid updates resolve exact references and native geometry. Broken relations require explicit disable-or-retain-for-repair choice; invalid native geometry is still rejected.

Deleting a used version warns with its consumers and records its successor above the deleted row. Deleting Main chooses the newest survivor; the sole Main is protected. Current working consumers resolve successor chains and acknowledge replacement once. Archived assembly closures remain unchanged and their immutable data is not physically erased.

## 5. Atomicity and compatibility

Keep writer leases, expected revisions, scoped operation identities, checksums, cancellation and stale-base protection. Series/document changes use a recoverable pending record around atomic native save and sidecar replacement. Multi-document updates remain staged with explicit pending decisions; do not claim global atomicity.

E4.M5-version-binding/1 adds logical source nodes, deleted-version notices and bounded pending decision metadata. E4.M5-spatial/1 adds disabled relations and explicit Conflict/MissingReference diagnostics. A disabled or explicitly unresolved relation does not participate in the valid solver subset; its geometry is never silently retargeted. Older profiles remain accepted; older readers must safely reject extensions they cannot interpret. Kernel/solver pins are unchanged.

## 6. Historical shape reproduction

A published design must remain verifiable after application/kernel upgrades. The chosen implementation may pin runtime interpretation, preserve exact verified B-Rep state as a historical baseline, store checksums/geometric signatures or combine approaches, but must prove history reconstruction. Shape volume equality alone does not imply surviving face/edge lineage. Kernel upgrade may trigger compatibility check, migration/repair or safe refusal; no unreviewed silent schema migration.

Caches (meshes, thumbnails, derived vector projections) are non-authoritative and regenerable. Old native documents are tested for read/rollback; source data is preserved if a migration is unsupported. Incompatible upgrades require backup/consent and tested rollback.

## 7. Required negative fixtures

1. Reopen a copied/moved package without absolute path dependency.
2. External referenced definition missing, relocated, replaced or incompatible.
3. Two instances share one immutable definition but retain distinct transforms.
4. Latest publishes a compatible update, then an incompatible mate update; prior effective state remains valid.
5. Pinned does not auto-follow; published historical assembly and BOM remain unchanged.
6. Multi-document cycle is rejected.
7. Corrupt bytes, partial write, process crash, stale revision and unknown schema preserve original work.
8. Change kernel/schema version; check historical geometry/lineage or explicitly refuse.
9. Attempt deletion of referenced version/definition; block or require explicit resolved migration.
10. A drawing revision changes independently and never silently rebinds to a newer unapproved model version.

**Acceptance:** E0.M4 proves graph identity, local snapshots, missing-source behavior, transactional storage and format mobility; E4.M4 proves full Latest/Pinned publication semantics; E6 retests migration/rollback and broad assembly/drawing compatibility. No implementation is claimed yet.

References: [Master §§5–6](../../MASTER_DESIGN.md#5-unified-engineering-document), [Geometry contract](GEOMETRY_CONSTRAINTS.md), [ADR register](../architecture/ADR_REGISTER.md).

## E0 Go and E1.M1 evidence update2026-10-31

[E0 decision](../architecture/E0_OWNER_GO_2026_10_31.json) accepts the measured baseline for progression. E1.M1 [ADR016](../architecture/ADR-016-E1-WORKBENCH.md) adds UI/ReadOnly context, not native data mutation:15 workbench cases plus100 retained, actual default/empty/Hub UI, seven-class physical GPU picking and focused navigation, headless selection parity, unchanged-document/prior0.0.7 reader compatibility, current package/public install checks. Existing native0/1 schemas and E0 corpus inputs remain unchanged. General sketch/feature creation, arbitrary topology/drawings and full mature requirement acceptance remain at their scheduled gates.

## E4.M1 local components addendum

Native1 definitions/instances now support parametric histories in each local definition, repeated/nested occurrence rendering and in-place editing. A transient definition context never rewrites the document root or retained snapshots. Features and associative references remain owned by their definition; global validation and exact per-definition verification precede commit. Full occurrence paths distinguish picks while stored part feature references remain definition-local. Removing an instance preserves its shared definition; cycles and deletion of referenced definitions reject atomically. Older readers may safely refuse secondary-definition sketches they do not support. Published dependency update policy remains E4.M4. See [component scope](../E4_M1_COMPONENTS.md).
