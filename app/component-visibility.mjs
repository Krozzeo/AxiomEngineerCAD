import {api} from './cad-commands.mjs';
import {editorDocument as document} from './editor-document.mjs';import {editContextBar} from './edit-context-bar.mjs';
const v=window.engineerViewport,r=v.renderer,keys=new Map(),pending=new Map(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
async function key(path){const text=JSON.stringify(path);if(!keys.has(text)){if(!pending.has(text))pending.set(text,crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)).then(data=>{const id='occurrence-'+[...new Uint8Array(data)].map(n=>n.toString(16).padStart(2,'0')).join('');keys.set(text,id);pending.delete(text);return id;}));return pending.get(text);}return keys.get(text);}
const preferences=new Map();let preferencesRevision=0;
function applyPreferences(value){preferencesRevision=value.revision;preferences.clear();for(const entry of value.entries)preferences.set(entry.id,entry.state);}
async function reloadPreferences(){applyPreferences(await api('workspace/visibility'));await update();}
async function setPreferences(changes){const before=await api('workspace/visibility'),value=await api('workspace/visibility/save',{operationId:crypto.randomUUID(),expectedVisibilityRevision:before.revision,changes});applyPreferences(value);await update();window.dispatchEvent(new CustomEvent('engineer-visibility-changed'));}
const preference=id=>preferences.get(id)??'default';
function mode(path,{editing=true}={}){if(!path||path.length===1)return 'entire';if(editing&&same(path,window.engineerComponentContext?.path))return 'entire';let value='model';for(let n=2;n<=path.length;n++){const id=keys.get(JSON.stringify(path.slice(0,n))),state=id?preference(id):'default';if(state==='hide')return 'hide';if(state==='entire'||state==='reveal')value='entire';else if(state==='model')value='model';}if(editing&&same(path,window.engineerComponentContext?.path))return 'entire';return value;}
window.engineerOccurrenceRevealAll=path=>path?.length>1&&mode(path,{editing:false})==='entire';
window.engineerOccurrenceVisible=path=>mode(path)!=='hide';window.engineerOccurrenceReferencesVisible=path=>mode(path)==='entire';window.engineerComponentMode=mode;
window.engineerOccurrenceOpacity=path=>{const active=window.engineerComponentContext?.path;if(!active)return 1;return active.every((id,i)=>path?.[i]===id)?1:.2;};
const bar=editContextBar(document,{nameId:'component-edit-name',actions:[{id:'component-exit-edit',label:'Exit edit',onClick:()=>window.engineerExitComponent?.()}]});bar.classList.add('component-edit-bar');bar.hidden=true;document.querySelector('#proof-canvas').parentElement.append(bar);
async function update(){const paths=[...(r.scene?.occurrences??[]).map(o=>o.path),...(r.scene?.datums??[]).map(d=>d.occurrencePath),...(r.scene?.sketches??[]).map(s=>s.occurrencePath??[s.definitionId])];await Promise.all(paths.map(key));const active=window.engineerComponentContext;bar.hidden=!active;bar.querySelector('strong').textContent=active?.name??'';document.body.classList.toggle('editing-component',!!active);r.prepare();await r.render();window.dispatchEvent(new CustomEvent('engineer-component-display-ready'));}
for(const name of ['engineer-proof-built','engineer-component-context-changed','engineer-workspace-activated'])window.addEventListener(name,()=>update().then(()=>window.dispatchEvent(new CustomEvent('engineer-visibility-changed'))).catch(console.error));
const menu=document.createElement('div');menu.className='cad-feature-menu';menu.hidden=true;document.body.append(menu);
async function change(path,state){await setPreferences([{id:await key(path),state}]);menu.hidden=true;}
function open(path,x,y){
 menu.replaceChildren();
 const button=(label,fn,parent=menu)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>Promise.resolve(fn()).catch(error=>{document.getElementById('wb-hint').textContent=error.message;});parent.append(b);return b;};
 if(path?.length>1){
  button(mode(path)==='hide'?'Reveal':'Hide',async()=>{const id=await key(path);if(mode(path)==='hide')return change(path,preference(id+'-view')==='entire'?'entire':'model');await setPreferences([{id:id+'-view',state:mode(path,{editing:false})==='entire'?'entire':'model'},{id,state:'hide'}]);menu.hidden=true;});
  const view=document.createElement('details'),label=document.createElement('summary'),choices=document.createElement('div');label.textContent='View';choices.className='cad-menu-submenu';view.append(label,choices);menu.append(view);
  for(const [state,name]of [['model','Model'],['entire','Entire part']]){const b=button(name,async()=>{const id=await key(path),hidden=preference(id)==='hide';await setPreferences([{id:id+'-view',state},...(!hidden?[{id,state}]:[])]);menu.hidden=true;},choices);b.setAttribute('aria-pressed',String((mode(path,{editing:false})==='hide'?preference(keys.get(JSON.stringify(path))+'-view'):mode(path,{editing:false}))===state));}
 }
 window.engineerExtendComponentMenu?.(path,menu);if(!menu.children.length)return;
 Object.assign(menu.style,{left:Math.min(x,innerWidth-210)+'px',top:Math.min(y,innerHeight-190)+'px'});menu.hidden=false;
}
document.getElementById('wb-tree-items').addEventListener('contextmenu',event=>{
 if(document.querySelector('[data-wb-tree=components]')?.getAttribute('aria-selected')!=='true')return;
 event.preventDefault();event.stopImmediatePropagation();const row=event.target.closest('[data-component-path]'),path=row?JSON.parse(row.dataset.componentPath):null,node=path&&window.engineerComponents.nodes().find(n=>same(n.path,path));
 if(node)window.engineerComponents.choose(node,{preserve:true});open(path,event.clientX,event.clientY);
},true);
document.getElementById('proof-canvas').addEventListener('contextmenu',event=>{
 const rect=event.currentTarget.getBoundingClientRect(),x=(event.clientX-rect.left)*event.currentTarget.width/rect.width,y=(event.clientY-rect.top)*event.currentTarget.height/rect.height,hit=r.candidates(x,y)[0],entity=hit?v.entities().find(e=>e.id===hit.selectionId):null;
 if(!entity)return;
 // Selection is shared with every Model context menu, including datums/sketches.
 v.selectId(entity.id,entity.kind).catch(error=>{if(error.name!=='AbortError')document.getElementById('wb-hint').textContent=error.message;});
 if(entity.occurrencePath?.length<2)return;
 event.preventDefault();event.stopImmediatePropagation();const node=window.engineerComponents.nodes().find(n=>same(n.path,entity.occurrencePath));if(node)window.engineerComponents.choose(node,{preserve:true,semantic:false});open(entity.occurrencePath,event.clientX,event.clientY);
},true);
document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))menu.hidden=true;},true);document.addEventListener('keydown',event=>{if(event.key==='Escape')menu.hidden=true;});

window.engineerReloadOccurrenceVisibility=reloadPreferences;await reloadPreferences();
