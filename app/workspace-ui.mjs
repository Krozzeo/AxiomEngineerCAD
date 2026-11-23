import {mountVersions} from './versions-panel.mjs';
import {api} from './cad-commands.mjs';
import {mountProjectBrowser} from './project-browser.mjs';
import {icon} from './icons.mjs';
export function mountWorkspace({document,dock,projectPanel,versionPanel,header,menu}){
 let workspace=window.engineerWorkspace;if(!workspace){projectPanel.textContent='Project files are available in a project workspace.';return;}
 const root=window,previewURLs=new Map(),dockControls=projectPanel.querySelector(':scope > .dock-panel-controls');let refreshing=false;
 projectPanel.innerHTML='<div class="project-toolbar"><button id="project-back" aria-label="Up one folder">↑</button><nav id="project-breadcrumb"></nav><button id="project-refresh" aria-label="Refresh project" title="Refresh project"></button></div><div class="project-browser"><div id="project-files" role="tree" aria-label="Project folders"></div><div class="project-tree-divider" role="separator" tabindex="0" aria-label="Resize project tree"></div><div id="project-icons" role="list" aria-label="Parts and folders"></div></div><pre id="project-file-preview" hidden></pre><p id="project-error" role="status"></p>';
 if(dockControls)projectPanel.prepend(dockControls);document.getElementById('project-refresh').innerHTML=icon('refresh');
 const divider=projectPanel.querySelector('.project-tree-divider'),pane=projectPanel.querySelector('.project-browser');
 let treeWidth=dock.value().sizes?.projectTreeWidth??150,splitDrag=null;
 const resizeProject=()=>{if(!pane.clientWidth||!pane.clientHeight)return;const place=dock.value().positions.project,side=['left','right'].includes(place),available=Math.max(40,pane.clientWidth-treeWidth-6),size=Math.max(40,Math.min(145,side?available*.62:Math.min(available*.62,pane.clientHeight-32)));pane.style.setProperty('--project-tree-width',Math.max(60,Math.min(treeWidth,pane.clientWidth-50))+'px');pane.style.setProperty('--project-tile-size',size+'px');};
 const observer=new ResizeObserver(resizeProject);observer.observe(pane);
 divider.onpointerdown=e=>{e.preventDefault();splitDrag={x:e.clientX,width:treeWidth};divider.setPointerCapture(e.pointerId);};
 divider.onpointermove=e=>{if(!splitDrag)return;treeWidth=Math.max(60,Math.min(700,splitDrag.width+e.clientX-splitDrag.x));resizeProject();};
 divider.onpointerup=()=>{if(!splitDrag)return;splitDrag=null;dock.setProjectTreeWidth(treeWidth);};
 divider.onpointercancel=()=>{if(splitDrag)treeWidth=splitDrag.width;splitDrag=null;resizeProject();};
 divider.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();treeWidth=Math.max(60,Math.min(700,treeWidth+(e.key==='ArrowLeft'?-10:10)));resizeProject();dock.setProjectTreeWidth(treeWidth);};
 const tabs=document.createElement('nav');tabs.className='part-tabs';tabs.setAttribute('aria-label','Open parts and assemblies');document.querySelector('.command-ribbon').before(tabs);
 const contextMenu=document.createElement('div');contextMenu.className='cad-feature-menu project-context-menu';contextMenu.hidden=true;document.body.append(contextMenu);
 const state=()=>({project:{id:workspace.projectId,scene:{projectFiles:workspace.files.map(f=>({...f,preview:previewURLs.get(f.id)})),sceneDocuments:{open:workspace.files.filter(f=>f.open).map(f=>f.path)}}},sceneRevision:workspace.revision});
 const error=e=>{document.getElementById('project-error').textContent=e.message;};
 async function action(input){const result=await api('workspace/action',{operationId:crypto.randomUUID(),expectedRevision:workspace.revision,...input});workspace=result;window.engineerWorkspace=result;return result;}
 let switching=false,requestedPart=null;
 async function rebind(next){
  const locks=[document.getElementById('editor-workspace'),document.querySelector('.command-ribbon')].filter(Boolean).map(node=>[node,node.inert]);window.engineerWorkspaceTransition=true;for(const [node]of locks)node.inert=true;
  window.engineerDiscardAssemblyDrag?.();window.engineerDiscardAssemblyManual?.();window.engineerCancelAssembly?.();window.engineerCancelMate?.();window.engineerClearSelection?.();
  try{window.engineerViewport.suspend();
  window.engineerBindWorkspace(next);workspace=next;
  window.engineerComponentContext=next.editContext?.node??null;
  window.dispatchEvent(new CustomEvent('engineer-component-context-changed'));
  await window.engineerReloadVisibility?.();
  await window.engineerReloadOccurrenceVisibility?.();
  await window.engineerViewport.activateDocument(next);
  window.dispatchEvent(new CustomEvent('engineer-workspace-activated',{detail:next}));
  const current=await api('document');
  window.dispatchEvent(new CustomEvent('engineer-document-changed',{detail:current}));
  await window.engineerRefreshSources?.();await refresh();
  }finally{window.engineerWorkspaceTransition=false;for(const [node,inert]of locks)node.inert=inert;}
 }
 window.engineerActivateWorkspace=rebind;
 async function prepareSwitch(){if(window.engineerSketch?.view())await window.engineerSketch.exit();if(window.engineerSketch?.operationActive)document.getElementById('new-sketch-cancel')?.click();window.engineerCancelAssembly?.();await window.engineerCancelFeature?.();}
 async function activate(file){
  requestedPart=file;if(switching)return;switching=true;
  try{while(requestedPart){const target=requestedPart;requestedPart=null;await prepareSwitch();const before=workspace.active,beforeRevision=workspace.activeDocumentRevision,wasPreview=!!workspace.preview,wasEditing=!!workspace.editContext;await action({action:'open',id:target.id});if(wasPreview||wasEditing||before!==workspace.active||beforeRevision!==workspace.activeDocumentRevision)await rebind(workspace);else await refresh();}}
  finally{switching=false;}
 }
 async function close(file){workspace=await api('workspace');window.engineerWorkspace=workspace;file=workspace.files.find(f=>f.id===file.id);if(!file)return;let decision='discard';if(file.dirty){decision=await closeDecision(file.name);if(decision==='cancel')return;}const wasActive=workspace.active===file.id,beforeRevision=workspace.activeDocumentRevision,beforeDocument=workspace.activeDocumentId;await action({action:'close',id:file.id,decision});window.engineerViewport.evictDocument(file.documentId);if(file.dirty&&decision==='discard'&&previewURLs.has(file.id)){URL.revokeObjectURL(previewURLs.get(file.id));previewURLs.delete(file.id);}if(wasActive||beforeRevision!==workspace.activeDocumentRevision||beforeDocument!==workspace.activeDocumentId)await rebind(workspace);else await refresh();}
 function closeDecision(name){return new Promise(resolve=>{const dialog=document.createElement('dialog'),title=document.createElement('h3');title.textContent='Close '+name+'?';dialog.append(title);for(const [label,decision]of [['Save','save'],['Discard','discard'],['Cancel','cancel']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{dialog.close();dialog.remove();resolve(decision);};dialog.append(b);}dialog.addEventListener('cancel',()=>{dialog.remove();resolve('cancel');});document.body.append(dialog);dialog.showModal();});}
 const browser=mountProjectBrowser({document,getState:state,reportError:error,mutate:async data=>{const previous=workspace.active;try{if(data.action==='delete'){for(const f of workspace.files.filter(f=>f.open&&data.paths.some(p=>f.path===p||f.path.startsWith(p+'/'))))await action({action:'close',id:f.id,decision:'discard'});}const input={...data,confirmation:data.action==='delete'?'DeleteProjectFiles':undefined};await action(input);if(data.action==='move')window.dispatchEvent(new CustomEvent('engineer-document-changed',{detail:await api('document')}));browser.refresh();paintTabs();if(previous!==workspace.active)await rebind(workspace);else await previews();return true;}catch(e){error(e);return false;}},selectScene:file=>activate(file).catch(error),selectAsset:()=>{},selectScript:()=>{},onSelection:paths=>{if(paths.length)window.engineerClaimSelection?.('project');const ids=new Set(workspace.files.filter(f=>paths.includes(f.path)).map(f=>f.documentId)),selected=(window.engineerViewport?.entities()??[]).filter(e=>e.kind==='instance'&&ids.has(e.sourceDocumentId)).map(e=>e.id);window.engineerSketchReferences?.(selected);},onFilesChanged:data=>{if(data.action==='close')close(data.file).catch(error);}});
 window.engineerRegisterSelection?.('project',()=>{browser.clear(false);window.engineerSketchReferences?.([]);});
 const thumbnail=document.createElement('div');thumbnail.className='part-tab-thumbnail';thumbnail.hidden=true;document.body.append(thumbnail);
 const picker=document.createElement('div');picker.className='part-tab-picker';picker.hidden=true;document.body.append(picker);let allParts=false;
 function openPicker(button){picker.replaceChildren();const header=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.role='switch';toggle.checked=allParts;header.append(toggle,' All parts');const search=document.createElement('input');search.type='search';search.placeholder='Search parts…';search.setAttribute('aria-label','Search parts');const list=document.createElement('div');list.className='part-picker-list';picker.append(header,search,list);
  const draw=()=>{list.replaceChildren();for(const file of workspace.files.filter(f=>f.kind==='part'&&(allParts||f.open)&&f.name.toLowerCase().includes(search.value.toLowerCase()))){const b=document.createElement('button');b.textContent=file.name;b.onclick=()=>{picker.hidden=true;activate(file).catch(error);};list.append(b);}};
  search.oninput=draw;toggle.onchange=()=>{allParts=toggle.checked;draw();search.focus();};draw();const box=button.getBoundingClientRect();Object.assign(picker.style,{right:Math.max(4,innerWidth-box.right)+'px',top:box.bottom+'px'});picker.hidden=false;search.focus();
 }
 document.addEventListener('pointerdown',event=>{if(!picker.contains(event.target)&&!event.target.closest('[data-part-picker]'))picker.hidden=true;},true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){picker.hidden=true;thumbnail.hidden=true;}});
 function paintTabs(){
 thumbnail.hidden=true;tabs.replaceChildren();document.body.classList.toggle('viewing-version',!!workspace.preview);
 if(workspace.preview){const b=document.createElement('button');b.className='part-tab';b.textContent='Version: '+workspace.preview.summary+' ×';b.setAttribute('aria-selected','true');b.onclick=async()=>{await api('workspace/version/action',{action:'exit',operationId:crypto.randomUUID()});await rebind(await api('workspace'));};tabs.append(b);}
 for(const id of workspace.open){const file=workspace.files.find(f=>f.id===id);if(!file)continue;
 const tab=document.createElement('button');tab.type='button';tab.className='part-tab';tab.role='tab';tab.dataset.partTab=id;tab.draggable=true;tab.setAttribute('aria-selected',String(workspace.active===id));
 const label=document.createElement('span');label.textContent=file.name+(file.dirty?' *':'');const x=document.createElement('span');x.className='part-tab-close';x.textContent='×';x.role='button';x.tabIndex=0;x.setAttribute('aria-label','Close '+file.name);x.onclick=e=>{e.stopPropagation();close(file).catch(error);};x.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();close(file).catch(error);}};
 tab.append(label,x);tab.onclick=()=>activate(file).catch(error);
 tab.onpointerenter=()=>{const src=previewURLs.get(id);if(!src)return;const img=document.createElement('img');img.src=src;img.alt=file.name;thumbnail.replaceChildren(img);const box=tab.getBoundingClientRect();Object.assign(thumbnail.style,{left:Math.min(box.left,innerWidth-230)+'px',top:box.bottom+'px'});thumbnail.hidden=false;};tab.onpointerleave=()=>thumbnail.hidden=true;
 tab.ondragstart=e=>{thumbnail.hidden=true;e.dataTransfer.setData('application/axiom-part-tab',id);e.dataTransfer.effectAllowed='move';};
 tab.ondragover=e=>{if(e.dataTransfer.types.includes('application/axiom-part-tab')){e.preventDefault();tab.classList.add('tab-drop-before');}};
 tab.ondragleave=()=>tab.classList.remove('tab-drop-before');tab.ondragend=()=>{for(const t of tabs.children)t.classList.remove('tab-drop-before');};
 tab.ondrop=e=>{if(!e.dataTransfer.types.includes('application/axiom-part-tab'))return;e.preventDefault();const from=e.dataTransfer.getData('application/axiom-part-tab'),ids=workspace.open.filter(i=>i!==from);if(from===id)return;ids.splice(ids.indexOf(id),0,from);action({action:'reorder-tabs',ids}).then(paintTabs).catch(error);};tabs.append(tab);
 }
 if(!workspace.open.length){const empty=document.createElement('span');empty.textContent='Create or open a part/assembly in Project';tabs.append(empty);}
 const more=document.createElement('button');more.type='button';more.className='part-picker-button';more.dataset.partPicker='true';more.setAttribute('aria-label','Find part');more.textContent='…';more.onclick=()=>picker.hidden?openPicker(more):picker.hidden=true;tabs.append(more);
 document.body.classList.toggle('workspace-empty',workspace.empty);const model=document.getElementById('model-content');if(workspace.empty&&!model.querySelector('.workspace-empty-message')){const text=document.createElement('p');text.className='workspace-empty-message';text.textContent='This project is empty. Create a part/assembly in Project to start modeling.';model.append(text);}document.querySelector('.cad-document-title').textContent=workspace.name+' • '+(workspace.files.find(f=>f.id===workspace.active)?.name??'No part open');
 }
 let preloading=false,preloadTimer=null;
 async function previews(){if(preloading)return;preloading=true;let pending=false;try{for(const file of workspace.files.filter(f=>f.kind==='part'&&!previewURLs.has(f.id))){try{const data=await api((file.open?'workspace/preload?id=':'workspace/thumbnail?id=')+encodeURIComponent(file.id));if(file.open&&!data.ready){pending=true;continue;}if(file.open)window.engineerViewport.preloadDocument(data);previewURLs.set(file.id,URL.createObjectURL(new Blob([data.svg],{type:'image/svg+xml'})));}catch(e){if(e.name==='AbortError')pending=true;else file.previewError=e.message;}}browser.refresh();}finally{preloading=false;clearTimeout(preloadTimer);if(pending)preloadTimer=setTimeout(previews,250);}}
 async function refresh(){if(refreshing)return;refreshing=true;try{workspace=await api('workspace');window.engineerWorkspace=workspace;browser.refresh();paintTabs();await window.engineerComponents?.refresh();await previews();}catch(e){error(e);}finally{refreshing=false;}}
 const option=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{contextMenu.hidden=true;Promise.resolve().then(fn).catch(error);};contextMenu.append(b);};
 projectPanel.addEventListener('contextmenu',event=>{event.preventDefault();const path=event.target.closest('[data-project-path]')?.dataset.projectPath,file=workspace.files.find(f=>f.path===path);contextMenu.replaceChildren();if(file){browser.select(file.path);option('Open',()=>file.kind==='folder'?browser.open(file.path):activate(file));if(file.open)option('Close',()=>close(file));option('Delete',()=>browser.deleteSelected());option('Show in explorer',()=>api('workspace/action',{operationId:crypto.randomUUID(),action:'reveal',path:file.path}));}else{option('Create Folder',()=>create('folder'));option('Create Part/Assembly',()=>create('part'));option('Show in explorer',()=>api('workspace/action',{operationId:crypto.randomUUID(),action:'reveal',path:browser.folder()}));}Object.assign(contextMenu.style,{left:Math.min(event.clientX,innerWidth-200)+'px',top:Math.min(event.clientY,innerHeight-180)+'px'});contextMenu.hidden=false;});
 document.addEventListener('pointerdown',event=>{if(!contextMenu.contains(event.target))contextMenu.hidden=true;},true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape')contextMenu.hidden=true;if(event.key==='Delete'&&projectPanel.contains(document.activeElement)&&!document.activeElement.matches('input,textarea')){event.preventDefault();browser.deleteSelected().catch(error);}});
 window.engineerPastePart=async(sourceDocumentId,sourceDefinitionId)=>{await action({action:'copy-part',sourceDocumentId,sourceDefinitionId,folder:browser.folder()});await refresh();};
 function create(kind){dock.openPanel('project');browser.create(kind);}
 const createMenu=document.createElement('details');createMenu.innerHTML='<summary>Create</summary><div class="wb-menu"></div>';menu.querySelector('details').after(createMenu);for(const [label,fn]of [['New folder',()=>create('folder')],['New part/assembly',()=>create('part')],['New version',()=>{dock.openPanel('versions');window.dispatchEvent(new CustomEvent('engineer-new-version'));}]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{createMenu.open=false;fn();};createMenu.querySelector('.wb-menu').append(b);}
 document.getElementById('project-refresh').onclick=refresh;window.addEventListener('engineer-document-changed',()=>{const id=workspace.files.find(f=>f.documentId===window.engineerWorkspace.activeDocumentId)?.id??workspace.active;if(id&&previewURLs.has(id)){URL.revokeObjectURL(previewURLs.get(id));previewURLs.delete(id);}refresh();});window.addEventListener('pagehide',()=>{for(const url of previewURLs.values())URL.revokeObjectURL(url);});mountVersions({document,dock,node:versionPanel,refreshWorkspace:refresh});window.engineerProjectBrowser=browser;window.engineerWorkspaceRefresh=refresh;paintTabs();browser.draw();void previews();if(workspace.empty)dock.openPanel('project');
}
