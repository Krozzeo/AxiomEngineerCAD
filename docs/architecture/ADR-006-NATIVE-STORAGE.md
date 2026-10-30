# ADR-006 — Versioned native graph and recoverable JSON storage

Status: **Experimenting / review proposal**, E0.M4, CAD-R005–008. E0.M2 was owner validated; progression after the delivered E0.M3 was authorized. This implements a tested version-1 foundation, not acceptance of every future CAD feature encoding.

## Representation and alternatives

Choose a portable JSON engineering document with embedded content-addressed versions, dependency snapshots and bounded source attachments. Retain `project.engineer-provisional.json` as a compatibility basename so existing Platform registrations remain valid. Content explicitly distinguishes `formatVersion:1` from the unchanged legacy format0/E0.M1–M3 readers. The basename is not the format discriminator. SQLite/project-folder blobs and a self-contained `.axcad` archive remain alternatives for larger datasets; no final binary container or extension is claimed.

The v1 graph contains stable definition, feature, parameter, instance, drawing/sheet/view/note and source IDs. Instance identity/occurrence path differs from definition identity and transform. Internal definition/feature/parameter cycles and in-use missing references are rejected. Source bytes are canonical base64 plus length/SHA256/translator/fidelity metadata; no imported feature reconstruction is inferred. Literal typed parameters and drawing source bindings are storage foundations, not an expression engine or drawing renderer. Implemented feature payloads are the shipped geometry/spatial probes and proven semantic producer references; unsupported new types require a versioned decoder/schema change.

Top-level legacy probe fields are validated compatibility projections of primary native feature payloads; they cannot disagree with the graph. Human UI and headless commands use one authority. Graph drafts have sequenced buffers and captured revisions: invalid/stale drafts block Save until applied or reset.

## Storage protocol

1. Check lease/authorization, expected revision, pending work and current primary bytes.
2. On legacy conversion, preserve the original byte stream in a content-named exclusive backup.
3. Write a bounded `.recovery.json` journal containing validated base/next documents, hashes and operation identity, using Platform's fsync/temp/rename primitive.
4. Recheck primary bytes, atomically replace the primary, synchronize directory metadata where supported, then acknowledge the save.
5. Keep the journal as a durable checkpoint/receipt, separate from immutable versions and publications.

The Node [file synchronization contract](https://nodejs.org/docs/latest-v24.x/api/fs.html#filehandlesync) and pinned Platform `atomicJson` inform this protocol. It proves process-termination consistency at the tested boundaries, **not universal hardware power-loss durability**. Windows may not support directory fsync; no stronger filesystem guarantee is invented. Multi-document publication/adoption is explicitly staged, not globally atomic.

Read/detect never repairs files. A matching next hash reconciles a persisted save without acknowledgment; matching base or corrupt/diverged primary reports RecoveryRequired. Explicit recovery chooses a verified base/next checkpoint, preserves current original bytes in an exclusive backup, and writes a new monotonically advancing revision. Unknown schema/runtime is refused without fallback migration. Links, hardlinks, corrupt journals, changed bytes and out-of-root source paths are denied. Immutable version checksums are integrity evidence, not signatures or hostile-editor authentication.

Platform still owns its writer lease. Engineer never automatically removes stale leases. Crash tests terminate an actual writer child at prepared/replaced durable boundaries; whole-host crash ownership must still be reconciled under Platform's explicit stale-lease policy. Recovery once ownership is available is tested through the actual editor/Hub. This distinction is intentional, not an assertion that a storage test proves host-process recovery.

## History and reproducibility

Version IDs hash canonical content containing metadata, authoritative graph, effective dependency snapshots/local drawing-model closure, exact kernel/solver profiles and validation evidence. Npm integrity and creator product/build provenance are retained. Publication and recovery receipts are separate records. Versions are append-only; restore creates a new working revision and never rewrites prior content/publications. No garbage collector/deletion is accepted in this bounded release.

Before version capture/adoption, the cancellable isolated worker validates graph/reference closure, regenerates actual kernel geometry and spatial probes, checks independent analytic oracles, compares historical numeric/semantic evidence under the pinned profiles, and resolves bounded semantic face/edge roles. Ambiguity/loss is never a successful attachment. Runtime/profile changes are explicitly refused; no second kernel or arbitrary proprietary history reconstruction is claimed.

Bounds: 2 MiB serialized document, 5 MiB journal, 12 retained versions, dependency depth4, 16 definitions/64 parameters/features/instances, 8 dependencies, four <=32 KiB source attachments, 256 expanded occurrences, and <=32 native verification geometry/solver operations. Worker deadline/RSS admission limits remain from M2/M3. These are experimental foundation bounds, not frozen final E0.M6/MVP limits.

Evidence: [native integration/crash tests](../../tests/native.test.mjs), [browser source/consumer/recovery flow](../../tests/browser-native.mjs), [milestone report](../milestones/E0_M4_REPORT.md). Rollback: legacy original backups remain readable by 0.0.3; native v1 requires 0.0.4+. Do not overwrite an old project with an incompatible conversion or drop unsupported entities. Owner review is required before final container/schema acceptance.
