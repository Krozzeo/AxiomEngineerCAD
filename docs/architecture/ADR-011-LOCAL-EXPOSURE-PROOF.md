# ADR-011 — Local default and minimized exposure preflight

Status: Experimenting, E0.M6, 2026-10-30; owner acceptance pending. Requirements CAD-R011/022/023. Retains E0.M5 Local default; no new provider transport, credential store or background network fallback.

## Decision

Local manual CAD, numerical workers, GPU rendering and drawing generation require no account/network. Proof/export routes authenticate the human session, expected revision/hash, declared input schema and local action. Separate agent grants cannot access them. Existing origin/host checks, authorized roots, writer lease, pending buffers, operation receipts, numerical limits and source-preserving recovery remain authoritative.

Explicit preflight selects exposure profile, provider/model **labels**, data classes and <=4 exact face IDs. Restricted previews include only the selected semantic faces or width parameter; no whole-document graph, attachments, mesh, B-Rep, tokens or machine paths. Drawing preview includes only sheet/dimension metadata and requires an image-capability hint. These labels/hints are previews, not broker-attested capabilities or grants. Actual provider enumeration, capability verification, credentials, consent and dispatch must use the accepted Platform broker in later AI work.

All remote transmission is disabled in this E0 experiment, including RemoteRestricted/RemoteFull. Choosing a preview profile never grants dispatch. Local returns empty outgoing context; all outcomes report allowed=false, externalTransmission=false and networkRequests=0. No fallback provider/upload occurs for an image-incapable target. This proves minimized/denied preflight, not successful remote-provider operation or consent persistence. Broad organizational policy and remote trust decisions remain later gates.

Before exposure preview or PDF preparation, append a bounded SDK TaskJournal record under `.engineer-audit/`: operation, actor, document, effect, profile/destination labels, classes, context byte count/hash and outcome. No raw engineering context or credentials are journaled. Ordinary directory/root/file/link/size checks apply. Audit failure blocks the operation; <=32 records, no automatic history deletion. Native primary is unchanged by preflight/build/export. Preserve audit folder when copying a review study.

## Adversarial evidence and limitations

Actual authenticated HTTP denies an agent bearer or hostile Origin for export, unknown fields/effects and false confirmation. Changed MAIN invalidates dimensions/picks/export; interrupted/cancelled jobs cannot publish late results. Hardlinked audit history refuses without overwriting the linked source. Literal title instructions are escaped SVG/PDF data with no execution or dispatch. Restricted face context omits unrelated metadata/bodies. Tests run browser core workflows with non-loopback requests denied and with WebGPU unavailable; CPU drawing remains usable.

Worker environment drops named credential variables, finite recipes and parent deadlines constrain compute; RSS is a postcondition. This is not an OS sandbox against a malicious same-user process, universal import security, arbitrary PDF/STEP parser hardening, or real provider/IP compliance certification. The product does not import PDF files in E0.M6; external PDF readers are QA only. E0.M7/E6 inherit these regressions and must not silently broaden exposure.
