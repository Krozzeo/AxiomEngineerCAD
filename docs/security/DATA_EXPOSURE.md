# Engineering IP, Provider Exposure and Agent Permission Contract

**Baseline:** Master v0.2.0. **Implementation:** pending E0.M5–M6. **Principle:** a user's model/drawing is sensitive engineering data; provider connection does not automatically grant project-wide data export, Apply or publication.

## 1. Data classes

| Class | Examples | Control |
| --- | --- | --- |
| Document metadata | Project name, definition names, versions, source provenance | Scoped read/query |
| Parametric semantics | Equations, measurements, constraints, feature graph | Explicit project/tool/context permission |
| Exact geometry | B-Rep, source STEP, point/curve/surface information | Explicit geometry-export context permission |
| Visual evidence | Viewport screenshot, selected face, drawing image/region | Explicit image-upload context permission |
| Original sources | Imported vendor CAD, raster/scanned drawings, annotations | Source-specific permission and untrusted input parsing |
| Credentials/personal paths | Provider tokens, auth/session, local absolute project paths | **Never included** in agent/provider payloads |

## 2. Exposure profiles

1. **Local:** no project content is sent to external providers. Local model/process calls stay within authorized local runtime; nonlocal transport attempts fail before dispatch.
2. **Remote Restricted:** owner explicitly authorizes selected data classes, entity IDs, view regions and provider/model for one task. Default transport includes only minimized selected context.
3. **Remote Full:** owner intentionally authorizes broad model context for one scoped task, with visible recipient/provider, data classes and audit receipt. It is **not** a permanent account-wide entitlement.

This contract requires an E0 ADR for default profile, UI/CLI consent persistence and local-provider trust boundary. Do not silently escalate when a model lacks vision/context. Query permission and network transmission permission are separate.

## 3. Required safeguards

- Preflight preview includes destination provider/model, network/local distinction, selected data classes, size approximation and reason for disclosure.
- Provider credentials live in Platform's existing broker; no token copies in Engineer project/source/tool responses.
- Tool scopes are per project/document/actor and effect class: read, local proposal, Apply, file export, external publication.
- Import PDFs, STEP metadata, title-block text, annotations and AI responses as untrusted data; none may override system permissions or issue instructions to execute shell/process/network actions.
- Enforce authorized roots and no arbitrary process execution on project open/import/agent tool call. Bound resource usage and record cancellations.
- Redact machine paths, credentials and unrelated drawings from model contexts, logs, screenshots, support exports and public benchmarks.
- Record redacted audit of who/what/when, policy used, remote destination, data classes and outcome; never log raw secrets.
- Offline core CAD and local-only agent operations remain usable without provider or network connection.
- Unsaved/stale/rejected proposal never exposes hidden committed geometry through a diff that bypasses user permission.

## 4. Mandatory negative tests

- Remote provider account exists but exposure profile is Local: request to send geometry/capture fails.
- Restricted scope grants one selected face; unrelated bodies/drawing data omitted.
- Image-incapable model does not trigger automatic screenshot upload or fallback to another provider.
- Malicious instruction embedded in drawing title block or STEP metadata is treated as data.
- Stale/unauthorized Apply or external file export is blocked with typed error and unchanged document.
- Project moved, external referenced file missing, path traversal/symlink and hostile imported source are rejected or safely diagnosed without unauthorized reads.
- Transport timeout/unknown outcome is reconciled by receipt, not silently retried with expanded disclosure.

**Acceptance:** E0.M5 includes typed effect/permission envelopes; E0.M6 demonstrates real denied/offline and preflight cases; E6 repeats package/runtime/security regression. Exact UI consent and organizational policy features may evolve, but these minimum boundaries cannot be silently dropped.

References: [Master §16](../../MASTER_DESIGN.md#16-persistence-security-and-operational-behavior), [Tool contract](../contracts/SEMANTIC_TOOL_API.md), [Platform AI](https://github.com/Krozzeo/AxiomPlatform/blob/main/docs/architecture/AI_CONTRACT.md).
