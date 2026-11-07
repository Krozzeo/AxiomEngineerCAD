import {DEFINITIONS} from '../commands/catalog.mjs';
import {check} from '../errors.mjs';

const pages = [
  {id:'reference', group:'Getting started', title:'Read only the section you need', text:'GET /v1/api/reference returns an index. GET /v1/api/reference?id=SECTION returns one chapter or command schema. Use stable command IDs as section IDs. The endpoint uses the same local editor authentication as /v1/cad/catalog.'},
  {id:'viewport', group:'Workflows', title:'Exact viewport, picking and PDF', text:'GET /v1/proof/catalog describes the human proof API. Start /v1/proof/build for the current document revision, poll /v1/proof/status, then read /v1/proof/result. Pass the current manifest and revision to pick or export. Use proposalId to preview a validated branch. PDF export requires the human session and a current MAIN or retained version.'},
  {id:'assistant', group:'Integrations', title:'AI Assistant and project settings', text:'The assistant inherits the connected Platform account. Set a per-project model and reasoning effort in Config. Chat sends text to the selected provider. Share current CAD context to permit semantic reads and isolated changes. Require confirmation controls plan execution; human review still controls Apply.'},
  {id:'github', group:'Integrations', title:'Publish a saved CAD snapshot', text:'Use Config GitHub to link a writable repository and branch through the Platform account. Review the saved project, revision and destination before publication. The reviewed branch head and snapshot hash must still match. Unconfirmed writes can be checked in publication history.'},
  {id:'start', group:'Getting started', title:'Sessions, authority and revisions', text:'Use GET /v1/cad/catalog to discover commands and GET /v1/cad/context to obtain the authenticated project, session, and revisions. POST /v1/cad/invoke with the context, operationId, traceId, toolName, toolVersion, capability, effectClass, and inputs. Omit effects from the context. A local agent grant uses /v1/cad/agent/* and allows ReadOnly and LocalProposal. MAIN and Apply require the human session. Poll /v1/cad/status?jobId=... for accepted jobs. Do not replay an uncertain write with a new identity.'},
  {id:'model-to-drawing', group:'Workflows', title:'Model to drawing', text:'Discover feature IDs with entities.list, inspect the extrusion, create an isolated proposal and call drawing.layout.set. Validate, inspect the diff and compare the branch before human Apply. An A4 layout currently supports a single XY extrusion and top/front views. Width requires top, depth requires front.', example:{producerId:'extrusion-plate',orientation:'landscape',views:['top','front'],dimensions:['width','depth']}},
  {id:'drawing-to-model', group:'Workflows', title:'Drawing to editable model', text:'In an empty native part, call drawing.evidence.inspect on the supplied orthographic SVG. If complete, call drawing.reconstruct in a proposal and validate its exact reprojection. Ask for a missing or conflicting dimension. The supported SVG profile is illustrated by /e2-m4-drawing.svg.'},
  {id:'review', group:'Workflows', title:'Isolated proposals and human review', text:'Save MAIN before capturing a proposal. Use proposal.create, then pass the proposal ID and current proposal revision on each isolated call. Validate, inspect every diff page and use the review hash for Apply & Save. A changed MAIN or proposal revision invalidates approval. An agent cannot apply or export.'}
];
const tools = () => DEFINITIONS.map(tool => ({
  id:tool.name, group:'Commands / '+tool.name.split('.')[1], title:tool.name, text:tool.description,
  schema:tool.inputSchema, effects:tool.effects, limits:tool.limits
}));

export function apiReference(id) {
  const sections = [...pages,...tools()];
  if (!id) return {schemaVersion:1, sections:sections.map(({id,group,title})=>({id,group,title}))};
  const page = sections.find(section=>section.id===id);
  check(page,'LostReference','API section was not found.');
  return page;
}
