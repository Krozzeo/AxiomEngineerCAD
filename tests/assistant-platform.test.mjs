import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {startHost} from '../node_modules/axiom-platform/services/local-host/server.mjs';
import {historicalDemoCatalog,seedHistoricalFixtures} from '../scripts/acceptance-demo-fixtures.mjs';
import {http} from './helpers.mjs';

test('Platform assistant plans, builds an isolated CAD branch and keeps Apply human-only',async t=>{
  const folder=await mkdtemp(join(tmpdir(),'engineer-assistant-')),root=join(folder,'projects');
  await mkdir(root);
  let requests=0;
  const plan={type:'function_call',call_id:'plan',name:'propose_plan',arguments:JSON.stringify({summary:'Reconstruct the attached plate.'})};
  const mutation={type:'function_call',call_id:'reconstruct',name:'cad_command',arguments:JSON.stringify({name:'cad.drawing.reconstruct.v1',inputJson:'{}'})};
  const answer={type:'message',role:'assistant',content:[{type:'output_text',text:'The candidate is ready.'}]};
  const provider={id:'openai',key:'synthetic-test-only',config:{},async request(path,{body}){
    assert.equal(path,'/responses');assert.equal(body.model,'gpt-5.6-luna');assert.equal(body.reasoning.effort,'medium');assert.equal(body.store,false);
    if(requests===2)assert.ok(body.input.some(item=>item.type==='function_call_output'&&item.output.includes('reprojection')));
    return {status:'completed',usage:{total_tokens:10},output:[([plan,mutation,answer])[requests++]]};
  }};
  const head='a'.repeat(40),published='b'.repeat(40);
  let remoteHead=head;
  const githubClient={
    token:'synthetic-test-only',
    async connect(){return {id:42,login:'synthetic'};},
    disconnect(){this.token=null;},
    async request(path,options={}){
      if(path==='/repos/synthetic/cad')return {full_name:'synthetic/cad',default_branch:'main',permissions:{push:true}};
      if(path.includes('/git/ref/heads/'))return {object:{sha:remoteHead}};
      if(path.includes('/contents/')){assert.equal(options.missing,true);return null;}
      if(path==='/graphql'){
        const input=options.body.variables.input;
        assert.equal(input.expectedHeadOid,remoteHead);
        assert.equal(input.fileChanges.additions.length,2);
        assert.ok(input.fileChanges.additions[0].path.endsWith('/project.engineer-provisional.json'));
        remoteHead=published;
        return {data:{createCommitOnBranch:{commit:{oid:published}}}};
      }
      throw Error('Unexpected GitHub test request '+path);
    }
  };
  const host=await startHost({root,stateRoot:join(folder,'profile'),manifests:[resolve('platform/product.json')],aiProvider:provider,githubClient});
  t.after(async()=>{await host.close();const target=resolve(folder),temp=resolve(tmpdir());assert.ok(target.startsWith(join(temp,'engineer-assistant-')));await rm(target,{recursive:true,force:true});});
  await host.startup;
  await host.manager.account.connect('synthetic-test-only');
  host.manager.ai.verified=true;host.manager.ai.defaults={model:'gpt-5.6-luna',reasoning:'medium'};
  await seedHistoricalFixtures(host,undefined,historicalDemoCatalog.filter(d=>d.id==='e2-m4-drawing-reconstruction'));
  const demo=host.manager.catalog().recents.find(i=>i.name==='E2.M4 Drawing Reconstruction');
  const session=await host.manager.execute({operationId:crypto.randomUUID(),action:'open',productId:demo.productId,path:demo.path});
  const request=async(path,input)=>{const r=await http(session.editorUrl,path,input);assert.equal(r.status,200,JSON.stringify(r.value));return r.value;};
  assert.equal((await request('assistant/status')).model,'gpt-5.6-luna');
  assert.ok((await request('api/reference')).sections.some(item=>item.id==='cad.drawing.reconstruct.v1'));
  const svg=await (await fetch(new URL('/e2-m4-drawing.svg',session.editorUrl))).text();
  const first=await request('assistant/turn',{action:'message',text:'Reconstruct the drawing',share:true,tabs:['model','drawing'],focus:'drawing',svg});
  assert.equal(requests,1);assert.equal(first.proposal,null);assert.ok(first.pending.id);
  assert.deepEqual((await request('document')).document.native.graph.features,[]);
  const ready=await request('assistant/turn',{action:'approve',id:first.pending.id});
  assert.equal(requests,3);assert.equal(ready.reportedTokens,30);assert.ok(ready.proposal);
  assert.deepEqual((await request('document')).document.native.graph.features,[]);
  const build=await request('proof/build',{expectedRevision:0,viewportOnly:false,proposalId:ready.proposal});
  for(let i=0;i<100;i++){
    const status=await request('proof/status');
    if(status.job.state!=='running'){assert.equal(status.job.state,'completed',JSON.stringify(status.job));break;}
    await new Promise(resolve=>setTimeout(resolve,30));
  }
  const candidate=await request('proof/result');
  assert.equal(candidate.proposalId,ready.proposal);
  assert.equal(candidate.drawing.dimension.valueMm,48);
  const denied=await http(session.editorUrl,'proof/export',{manifestId:candidate.manifestId,expectedRevision:0,confirmation:'DownloadLocalPDF'});
  assert.notEqual(denied.status,200);
  assert.ok(build.job.id);

  const git=(action,options={})=>request('github/action',{action,...options});
  assert.equal((await request('github/status')).connected,true);
  await git('configure',{repository:'synthetic/cad',branch:'main'});
  const firstPublication=await git('review');
  remoteHead='c'.repeat(40);
  const stale=await http(session.editorUrl,'github/action',{action:'publish',id:firstPublication.id});
  assert.equal(stale.value.code,'RevisionConflict');
  const nextPublication=await git('review');
  assert.equal((await git('publish',{id:nextPublication.id})).sha,published);
  assert.equal((await request('github/status')).settings.history[0].sha,published);
});
