import {icon} from './icons.mjs';
import {api} from './cad-commands.mjs';
export function mountVersions({document,dock,node,refreshWorkspace}){
 let data=null,selected=null,busy=false,refreshing=null;
 node.innerHTML='<div class="versions-toolbar"></div><p data-version-status role="status"></p><div data-version-tree role="tree" aria-label="Versions"></div>';
 const toolbar=node.querySelector('.versions-toolbar'),tree=node.querySelector('[data-version-tree]'),status=text=>node.querySelector('[data-version-status]').textContent=text;
 const inspector=document.createElement('section');inspector.id='version-inspector';inspector.hidden=true;document.querySelector('.inspector').append(inspector);
 function button(name,glyph,fn){const b=document.createElement('button');b.type='button';b.title=name;b.setAttribute('aria-label',name);b.innerHTML=icon(glyph);b.onclick=()=>run(fn);return b;}
 async function run(fn){if(busy)return;busy=true;try{return await fn();}catch(e){status(e.message);}finally{busy=false;}}
 async function refresh(){if(refreshing)return refreshing;refreshing=(async()=>{try{data=await api('workspace/versions');paint();}catch(e){status(e.message);}finally{refreshing=null;}})();return refreshing;}
 async function action(actionName,input={}){
  const result=await api('workspace/version/action',{operationId:crypto.randomUUID(),action:actionName,expectedRevision:data.documentRevision,expectedHistoryRevision:data.history.revision,...input});
  if(result.requiresConfirmation){if(confirm('This version is used by '+result.usages.length+' assembly links. Delete it and replace those links with the next version above it?'))return action('delete',{...input,confirmUsed:true});return result;}
  if(['open','exit','main'].includes(actionName)||['delete','create'].includes(actionName)&&window.engineerWorkspace?.preview){location.reload();return result;}
  if(actionName==='delete')clear();
  window.dispatchEvent(new CustomEvent('engineer-document-changed',{detail:await api('document')}));await refreshWorkspace();await refresh();return result;
 }
 async function remove(){if(!selected)return;if(!confirm('Delete this version?'))return;await action('delete',{nodeId:selected});}
 function clear(){selected=null;inspector.hidden=true;document.querySelector('.proof-inspector').hidden=false;for(const row of tree.querySelectorAll('[data-version-node]'))row.setAttribute('aria-pressed','false');}
 window.engineerRegisterSelection?.('versions',clear);
 async function select(id){window.engineerClaimSelection?.('versions');selected=id;paint();await inspect();}
 async function inspect(){
  const version=data?.history.nodes.find(n=>n.id===selected);if(!version){clear();return;}
  inspector.replaceChildren();inspector.hidden=false;document.querySelector('.proof-inspector').hidden=true;dock.openPanel('inspector');
  const heading=document.createElement('h3');heading.textContent='Version';inspector.append(heading);
  for(const [key,label,multiline]of [['name','Name',false],['description','Description',true]]){const l=document.createElement('label'),input=document.createElement(multiline?'textarea':'input');l.textContent=label;input.setAttribute('aria-label',label);input.value=version[key];input.maxLength=multiline?4096:128;input.onchange=()=>run(()=>action('edit',{nodeId:version.id,[key]:input.value}));l.append(input);inspector.append(l);}
  const usages=document.createElement('section'),h=document.createElement('h4');h.textContent='Used in assemblies';usages.append(h);inspector.append(usages);
  const id=selected;try{const result=await api('workspace/version/action',{action:'usage',nodeId:id,operationId:crypto.randomUUID()});if(selected!==id)return;const list=document.createElement('ul');for(const usage of result.usages){const li=document.createElement('li');li.textContent=usage.name+' · '+usage.policy+' · '+usage.instances.length+' component(s)';list.append(li);}if(!result.usages.length){const p=document.createElement('p');p.textContent='Not used by another assembly in this project.';usages.append(p);}else usages.append(list);}catch(e){usages.append(document.createTextNode(e.message));}
  const actions=document.createElement('div');actions.className='version-actions';const isMain=id===data.history.mainId,opened=window.engineerWorkspace?.preview?.nodeId===id;
  for(const [label,fn]of [[opened&&!isMain?'Close':'Open',()=>action(opened&&!isMain?'exit':'open',{nodeId:id})],...(!isMain?[['Make Main',()=>action('main',{nodeId:id})]]:[]),['Delete',remove]]){const b=document.createElement('button');b.textContent=label;b.disabled=label==='Delete'&&data.history.nodes.length===1;b.onclick=()=>run(fn);actions.append(b);}inspector.append(actions);
 }
 function paint(){
  const history=data.history,opened=window.engineerWorkspace?.preview?.nodeId??history.mainId;toolbar.replaceChildren();toolbar.append(button('Create new version','plus',()=>action('create')));
  if(opened!==history.mainId)toolbar.append(button('Make Main','main',()=>action('main',{nodeId:opened})),button('Exit version','exit',()=>action('exit')));
  toolbar.append(button('Refresh','reload',refresh));tree.replaceChildren();status('');
  for(const version of history.nodes){const row=document.createElement('button');row.type='button';row.className='wb-tree-node version-node';row.dataset.versionNode=version.id;row.setAttribute('role','treeitem');row.setAttribute('aria-pressed',String(selected===version.id));row.setAttribute('aria-current',String(opened===version.id));row.innerHTML=icon(opened===version.id?'version-open':'version');const label=document.createElement('span');label.textContent=version.name;row.append(label);if(version.id===history.mainId){const badge=document.createElement('span');badge.className='version-main-badge';badge.innerHTML=icon('main');badge.title='Main';row.append(badge);}row.onclick=()=>void select(version.id);row.ondblclick=()=>run(()=>action('open',{nodeId:version.id}));row.oncontextmenu=e=>{e.preventDefault();void select(version.id);menu.replaceChildren();for(const [label,fn]of [['Open',()=>action('open',{nodeId:version.id})],...(version.id!==history.mainId?[['Make Main',()=>action('main',{nodeId:version.id})]]:[]),['Delete',remove]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{menu.hidden=true;run(fn);};menu.append(b);}Object.assign(menu.style,{left:Math.min(e.clientX,innerWidth-180)+'px',top:Math.min(e.clientY,innerHeight-130)+'px'});menu.hidden=false;};tree.append(row);}
 }
 const menu=document.createElement('div');menu.className='cad-feature-menu';menu.hidden=true;document.body.append(menu);
 document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))menu.hidden=true;});
 document.addEventListener('keydown',e=>{if(e.key==='Delete'&&selected&&!node.hidden&&!e.target.closest('input,textarea,select,[contenteditable=true]')){e.preventDefault();e.stopImmediatePropagation();void run(remove);}},true);
 window.engineerRefreshVersions=()=>void refresh();window.engineerVersionRefresh=refresh;
 window.addEventListener('engineer-new-version',()=>run(async()=>{await refresh();await action('create');}));
 window.addEventListener('engineer-document-changed',()=>{if(!node.hidden)void refresh();});
 window.addEventListener('engineer-manager-tab',e=>{if(e.detail!=='versions')clear();else void refresh();});
 let observer=null;const locked=new Set();function previewLock(){observer?.disconnect();observer=null;if(!window.engineerWorkspace?.preview){for(const n of locked)if(n.isConnected)n.disabled=false;locked.clear();return;}const lock=()=>{for(const n of document.querySelectorAll('#metadata input,#metadata textarea,#metadata button,.operation-page:not([data-operations=View]) button,#cad-undo'))if(!n.disabled){locked.add(n);n.disabled=true;}};lock();observer=new MutationObserver(lock);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});}
 previewLock();window.addEventListener('engineer-workspace-activated',()=>{clear();data=null;previewLock();if(!node.hidden)void refresh();});
}
