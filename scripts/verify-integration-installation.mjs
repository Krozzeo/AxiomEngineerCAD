import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export async function verifyIntegrationInstallation(host){
  const installation=host.manager.catalog().installations.find(i=>i.productId==='axiom.engineer-cad');assert.ok(installation);
  const {jobId}=await host.manager.installations({action:'load-demos',installationId:installation.id});let job;
  for(let i=0;i<240;i++){job=host.manager.catalog().demoJobs.find(j=>j.id===jobId);if(job.state!=='running')break;await new Promise(r=>setTimeout(r,250));}assert.equal(job.state,'completed',JSON.stringify(job));
  const entry=host.manager.catalog().recents.find(p=>p.name==='E0.M7 Integrated Foundation Lab'),before=JSON.parse(await readFile(entry.path)),version=before.native.versions[0].id;
  const execute=data=>host.manager.execute({operationId:randomUUID(),...data});let session=await execute({action:'open',productId:entry.productId,path:entry.path});
  const url=new URL(session.editorUrl),token=new URLSearchParams(url.hash.slice(1)).get('token');
  const api=async(path,data)=>{const r=await fetch(url.origin+'/v1/'+path,{method:data?'POST':'GET',headers:{Origin:url.origin,Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify({operationId:randomUUID(),...data}):undefined});assert.equal(r.status,200,await r.clone().text());return r.json();};
  const invoke=async(name,inputs={},effect='ReadOnly')=>{const {effects,...c}=await api('cad/context'),tools=await api('cad/catalog'),tool=tools.tools.find(t=>t.name==='cad.'+name+'.v1'),r=await api('cad/invoke',{...c,traceId:randomUUID(),toolName:tool.name,toolVersion:'1',capability:tool.capability,effectClass:effect,inputs});assert.notEqual(r.receipt.outcome,'rejected',JSON.stringify(r));return r.receipt.result;};
  const complete=async(path)=>{for(let i=0;i<120;i++){const s=await api(path);if(s.job.state!=='running'){assert.equal(s.job.state,'completed',JSON.stringify(s));return s;}await new Promise(r=>setTimeout(r,250));}throw Error('Installed integrated worker deadline');};
  await invoke('feature.update',{featureId:'feature-geometry',parameter:'depth',quantity:{value:15,unit:'mm'}},'MainMutation');await complete('cad/status');await execute({action:'save',sessionId:session.sessionId,expectedRevision:1});
  await api('proof/build',{expectedRevision:1});await complete('proof/status');let proof=await api('proof/result');assert.ok(Math.abs(proof.exact.volumeMm3-(18000-135*Math.PI))<1e-6);assert.ok(Math.abs(proof.integration.mate.position[2]-15)<1e-6);assert.equal(proof.integration.sketch.dof,0);assert.equal(proof.drawing.source.creator.version,'0.0.7');
  await api('proof/build',{expectedRevision:1,versionId:version});await complete('proof/status');proof=await api('proof/result');assert.equal(proof.drawing.dimension.valueMm,40);assert.ok(Math.abs(proof.integration.mate.position[2]-10)<1e-6);const pdf=await api('proof/export',{expectedRevision:1,manifestId:proof.manifestId,confirmation:'DownloadLocalPDF'});assert.match(Buffer.from(pdf.pdfBase64,'base64').toString(),/^%PDF/);
  await execute({action:'close',sessionId:session.sessionId,expectedRevision:1,decision:'discard'});session=await execute({action:'open',productId:entry.productId,path:entry.path});const saved=JSON.parse(await readFile(entry.path));assert.equal(saved.experiment.spec.depth,15);assert.equal(saved.native.versions[0].id,version);await execute({action:'close',sessionId:session.sessionId,expectedRevision:1,decision:'discard'});
  return {passed:true,loadedFromActualPlatformDemoJob:true,version:'0.0.7',manualDepthMm:15,sketchDof:0,mateDof:3,historicalDepthMm:10,historicalReadOnly:true,vectorPdf:true,saveReopen:true,ownerDecision:'Pending Go / Redesign / Stop'};
}
