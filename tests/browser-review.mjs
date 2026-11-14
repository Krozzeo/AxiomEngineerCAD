import {waitEditorIdle} from './browser-support.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
export async function verifyReviewUI({hub,context,host,evidence,observe,report}){
  const name='E0.M5 Review Lab',entry=host.manager.catalog().recents.find(p=>p.name===name);assert.ok(entry);
  const open=async()=>{const row=hub.locator('#project-rows tr').filter({hasText:name});await row.getByRole('button',{name:'Open '+name,exact:true}).click();await row.getByText('Active · saved',{exact:true}).waitFor();const sid=await row.getAttribute('data-session-id'),session=host.manager.catalog().sessions.find(s=>s.sessionId===sid),page=await context.newPage();observe(page);await page.goto((session.editorUrl).replace('/#','/?workspace=labs#'));await waitEditorIdle(page);await page.locator('#review-lab > summary').click();await page.locator('#review-feature option[value="feature-geometry"]').waitFor({state:'attached'});return {row,session,page};};
  const save=async(p,revision)=>{await p.waitForFunction(r=>document.querySelector('#revision').textContent===String(r),revision);const r=p.waitForResponse(r=>r.url().endsWith('/v1/save'));await p.locator('#save').click();const response=await r;assert.equal(response.status(),200,await response.text());};
  let item=await open(),p=item.page;const before=await readFile(entry.path);
  const jobAction=async(button,tool,text)=>{
   await waitEditorIdle(p);
   const pending=p.waitForResponse(r=>/\/v1\/cad\/(agent\/)?invoke$/.test(r.url())&&r.request().postDataJSON()?.toolName==='cad.'+tool+'.v1');
   await p.locator('#'+button).click();const response=await pending,value=await response.json(),receipt=value.receipt;
   assert.equal(receipt?.outcome,'accepted',JSON.stringify(value));const id=receipt.result.jobId;assert.ok(id);
   // The worker deadline is 20 s. Observe this exact accepted job, then require
   // the UI acknowledgement separately; a rejected/failed job never times out
   // as an unexplained missing status label.
   const started=Date.now();let job;
   while(Date.now()-started<22000){job=await p.evaluate(async id=>{const r=await fetch('/v1/cad/status?jobId='+id,{headers:{Authorization:'Bearer '+sessionStorage.getItem('engineer-token')}});return (await r.json()).job;},id);assert.equal(job?.id,id,JSON.stringify(job));if(job.state!=='running')break;await p.waitForTimeout(50);}
   assert.equal(job?.state,'completed',JSON.stringify(job));(report.reviewJobDurations??=[]).push({tool,elapsedMs:Date.now()-started});
   await p.locator('#review-status').filter({hasText:text}).waitFor();
  };

  await jobAction('review-script','feature.update','Isolated proposal prepared');assert.deepEqual(await readFile(entry.path),before);
  const url=new URL(item.session.editorUrl),human=new URLSearchParams(url.hash.slice(1)).get('token'),agent=await p.locator('#review-token').inputValue();assert.ok(agent.length>32);
  const hc=await(await fetch(url.origin+'/v1/cad/context',{headers:{Origin:url.origin,Authorization:'Bearer '+human}})).json(),{effects,...c}=hc;
  const forged={...c,operationId:randomUUID(),traceId:randomUUID(),toolName:'cad.metadata.set.v1',toolVersion:'1',capability:'cad.metadata.set',effectClass:'MainMutation',inputs:{name:'Forged Apply',notes:''}};
  const denied=await(await fetch(url.origin+'/v1/cad/agent/invoke',{method:'POST',headers:{Origin:url.origin,Authorization:'Bearer '+agent,'Content-Type':'application/json'},body:JSON.stringify(forged)})).json();assert.equal(denied.receipt.error.code,'PermissionDenied');
  await jobAction('review-validate','proposal.validate','Proposal validated');await p.locator('#review-open').click();await p.locator('#review-dialog').waitFor();assert.equal(await p.locator('#review-apply').isDisabled(),true);assert.match(await p.locator('#review-evidence').textContent(),/11434\.513322.*17434\.513322/);assert.deepEqual(await readFile(entry.path),before);await p.screenshot({path:join(evidence,'review-diff.png'),fullPage:true});
  await p.locator('#review-confirm').check();await p.locator('#review-apply').click();await p.locator('#review-status').filter({hasText:'Applied and saved'}).waitFor();let saved=JSON.parse(await readFile(entry.path));assert.equal(saved.experiment.spec.width,60);assert.equal(saved.revision,1);assert.equal(saved.native.versions[0].content.experiment.spec.width,40);await p.screenshot({path:join(evidence,'review-applied.png'),fullPage:true});
  await p.locator('#review-width').fill('70');await jobAction('review-manual','feature.update','Manual command applied');assert.equal(JSON.parse(await readFile(entry.path)).experiment.spec.width,60);await save(p,2);assert.equal(JSON.parse(await readFile(entry.path)).experiment.spec.width,70);
  await p.locator('#review-width').fill('80');await jobAction('review-script','feature.update','Isolated proposal prepared');await jobAction('review-validate','proposal.validate','Proposal validated');await p.locator('#review-open').click();await p.locator('#review-dialog').waitFor();
  const edit=await fetch(url.origin+'/v1/edit',{method:'POST',headers:{Origin:url.origin,Authorization:'Bearer '+human,'Content-Type':'application/json'},body:JSON.stringify({operationId:randomUUID(),expectedRevision:2,metadata:{name,notes:'Newer manual edit wins over stale proposal.'}})});assert.equal(edit.status,200);await p.locator('#review-confirm').check();await p.locator('#review-apply').click();await p.locator('#review-status').filter({hasText:'ProposalStale'}).waitFor();assert.equal(JSON.parse(await readFile(entry.path)).experiment.spec.width,70);await p.locator('#review-dismiss').click();await p.locator('#review-cancel').click();await p.locator('#review-status').filter({hasText:'Proposal cancelled'}).waitFor();await p.locator('details').filter({has:p.locator('#review-revoke')}).last().locator(':scope > summary').click();await p.locator('#review-revoke').click();await p.locator('#review-status').filter({hasText:'Automation grants revoked'}).waitFor();assert.equal((await fetch(url.origin+'/v1/cad/agent/context',{headers:{Origin:url.origin,Authorization:'Bearer '+agent}})).status,403);await save(p,3);
  p.on('dialog',d=>d.accept());await p.close();await item.row.getByRole('button',{name:'Close '+name,exact:true}).click();await hub.locator('#close-dialog').getByRole('button',{name:'Save and close',exact:true}).click();await item.row.getByText('Closed',{exact:true}).waitFor();item=await open();p=item.page;await p.locator('#review-metrics').filter({hasText:'70 mm'}).waitFor();assert.equal(await p.locator('#review-token').inputValue(),'');assert.equal(await p.locator('#review-proposal option').count(),2);await jobAction('review-measure','geometry.measure','Exact measurement completed');await p.screenshot({path:join(evidence,'review-reopened.png'),fullPage:true});
  report.criteria.push('Real local scripted agent prepares isolated width change; full SDK review/human Apply saves exact geometry; forged authority, stale Apply and revoked grant are denied; manual shared command and saved reopen agree');
  report.review={passed:true,scriptedOnly:true,realProviderEvaluated:false,mainWidthAfterApply:60,manualWidthAfterSaveReopen:70,agentMainDenied:true,staleApplyDenied:true,retainedVersions:saved.native.versions.length,creator:saved.native.versions[0].content.provenance.creator};
}
