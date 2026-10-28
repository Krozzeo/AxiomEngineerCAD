# Native Data, Versions and References Contract

**Baseline:** Master v0.2.0. **State:** architecture specification; physical schema/encoding/version not yet accepted. **First decisive gate:** E0.M4 after topology and 3D solver proofs.

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

## 4. Version semantics

- **Working revision:** an editable committed state with monotonically advancing causal revision and expected-revision write validation.
- **Recovery snapshot:** durable crash/recovery checkpoint; not publication.
- **Immutable version:** content-stable state with identity, dependency manifest and reproducibility metadata.
- **Published version:** immutable version admitted to the Latest resolver on a declared branch/channel.
- **Drawing revision:** documentation state independently revised but referring to explicit effective model/assembly versions.
- **Configuration:** parameter/suppression variant, not a historical version. MVP supports one active configuration but keeps data-model identity extensible.

Latest is a **candidate update** in a working consumer, never a background destructive rewrite. The resolver must select a uniquely ordered compatible published version. If ordering/channel/compatibility is ambiguous, return a pending/conflict state; E0.M4 must establish policy design, E4.M4 implements complete product behavior. Pinned never moves automatically. Historical published assembly/version retains the entire effective dependency closure, including drawing/BOM model sources.

## 5. Publication and atomicity

Document writes require a writer lease, expected revision, operation ID, integrity validation, staged durable storage and a receipt. Reject inconsistent/cancelled/stale/unauthorized updates. A crash after persistence but before acknowledgment is reconciled using operation receipts, never blind replay.

A publication captures immutable dependency closure, feature/parameter/source metadata, document/shape/schema provenance and supported runtime/kernel/solver/translator attribution. For multi-document changes, require either a tested coherent multi-resource transaction or explicit staged publication with partial/pending states and safe recovery. Single-document atomic replace is not sufficient to guarantee cross-document atomicity.

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
