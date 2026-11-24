import {api} from './cad-commands.mjs';
export function mountPublishedVersions({document,node,data,selected,run,refresh}){
 const host=document.createElement('section');host.className='published-components';node.append(host);
 const message=document.createElement('p');
 const action=async(action,input={})=>{const doc=(await api('document')).document;return api('workspace/action',{action,...input,operationId:crypto.randomUUID(),documentId:doc.documentId,expectedDocumentRevision:doc.revision});};
 const updated=async()=>{window.dispatchEvent(new CustomEvent('engineer-document-changed',{detail:await api('document')}));await window.engineerViewport.build({reuseCurrent:true});await refresh();};
 return function paint(){const value=data();host.replaceChildren();if(!value)return;
  const title=document.createElement('h3');title.textContent='Published versions';host.append(title);
  const publish=document.createElement('button');publish.textContent='Publish current version';publish.disabled=!!window.engineerWorkspace?.preview;publish.onclick=()=>run(async()=>{await action('publish-version');await updated();});
  const retained=document.createElement('button');retained.textContent='Publish selected version';retained.disabled=selected()?.kind!=='version'||!!window.engineerWorkspace?.preview;retained.onclick=()=>run(async()=>{await action('publish-version',{nodeId:selected().id});await updated();});host.append(publish,retained);
  for(const p of value.publications??[]){const row=document.createElement('p');row.textContent=p.channel+' · Publication '+p.sequence+' · '+p.versionId.slice(7,19);row.title=p.versionId;host.append(row);}
  const label=document.createElement('h3');label.textContent='Component versions';host.append(label);
  const table=document.createElement('table');table.className='operation-value-table';table.setAttribute('aria-label','Component versions');const header=table.createTHead().insertRow();for(const name of ['Component','Policy','Version','Status',''])header.insertCell().textContent=name;const body=table.createTBody();host.append(table,message);
  for(const d of value.dependencies??[]){const row=body.insertRow();row.dataset.dependencyId=d.id;row.insertCell().textContent=d.name;const policy=document.createElement('select');policy.setAttribute('aria-label','Dependency policy '+d.name);for(const option of ['Working','Latest','Pinned'])policy.append(new Option(option,option));policy.value=d.policy;policy.querySelector('[value=Working]').disabled=true;row.insertCell().append(policy);
   const version=document.createElement('select');version.setAttribute('aria-label','Pinned version '+d.name);for(const v of d.versions)version.append(new Option(v.label,v.id));if(!d.versions.some(v=>v.id===d.effectiveVersion))version.append(new Option('Retained '+d.effectiveVersion.slice(7,19),d.effectiveVersion));version.value=d.effectiveVersion;version.disabled=policy.value!=='Pinned';row.insertCell().append(version);row.insertCell().textContent=d.lastUpdate?.state==='Blocked'?'Blocked · '+d.lastUpdate.message:d.state;
   const controls=row.insertCell(),preview=document.createElement('button'),apply=document.createElement('button');preview.textContent='Preview update';apply.textContent='Apply update';apply.disabled=true;let candidate=null;
   const prepare=()=>run(async()=>{candidate=null;apply.disabled=true;const result=await action('dependency-preview',{dependencyId:d.id,policy:policy.value==='Working'?'Latest':policy.value,...(policy.value==='Pinned'?{versionId:version.value}:{})});candidate=result.candidateId;message.textContent='Preview · '+JSON.stringify(result.comparison);apply.disabled=false;});
   preview.onclick=prepare;policy.onchange=()=>{version.disabled=policy.value!=='Pinned';void prepare();};version.onchange=prepare;apply.onclick=()=>run(async()=>{await action('dependency-apply',{candidateId:candidate});candidate=null;await updated();});controls.append(preview,apply);
  }
 };
}
