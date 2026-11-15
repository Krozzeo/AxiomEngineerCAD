import {editorDocument as document} from './editor-document.mjs';
import {icon} from './icons.mjs';

const points={
 line:[['a','A · endpoint'],['midpoint','M · midpoint'],['b','B · endpoint']],
 circle:[['center','C · center']],
 arc:[['a','A · endpoint'],['center','C · center'],['b','B · endpoint']],
 spline:[['a','A · endpoint'],['control1','C1 · control'],['handle-a','Start tangent'],['control2','C2 · control'],['handle-b','End tangent'],['b','B · endpoint']],
 'equation-curve':[['a','Start'],['b','End']]
};
export function createSketchManager({getState,select,hover,remove,construction,editOperation}){
 const tabs=document.querySelector('.wb-tree-tabs'),source=document.getElementById('wb-tree-items'),tab=document.createElement('button'),tree=document.createElement('div');
 const expanded=new Set(),menu=document.createElement('div');
 let key='',activeId=null;
 tab.id='sketch-manager-tab';tab.dataset.wbTree='sketch';tab.role='tab';tab.textContent='Sketch';tab.hidden=true;tabs.append(tab);
 tree.id='sketch-manager-tree';tree.role='tree';tree.hidden=true;source.after(tree);
 menu.className='cad-feature-menu';menu.role='menu';menu.hidden=true;document.body.append(menu);
 function focus(){for(const b of tabs.querySelectorAll('[role=tab]'))b.setAttribute('aria-selected',String(b===tab));source.hidden=true;tree.hidden=false;}
 tab.addEventListener('click',focus);
 tabs.addEventListener('click',event=>{if(event.target.closest('button')!==tab){source.hidden=false;tree.hidden=true;}});
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))menu.hidden=true;});
 function safely(action){Promise.resolve().then(action).catch(e=>window.dispatchEvent(new CustomEvent('engineer-sketch-error',{detail:e.message})));}
 function popup(event,actions){
  event.preventDefault();event.stopPropagation();
  const owner=event.target.ownerDocument;
  if(menu.ownerDocument!==owner)owner.body.append(menu);
  menu.replaceChildren();
  for(const [caption,glyph,fn]of actions){
   const action=document.createElement('button');action.role='menuitem';action.innerHTML=icon(glyph);action.append(caption);
   action.onclick=()=>{menu.hidden=true;safely(fn);};menu.append(action);
  }
  menu.hidden=false;menu.style.left=Math.min(event.clientX,owner.defaultView.innerWidth-240)+'px';menu.style.top=Math.min(event.clientY,owner.defaultView.innerHeight-110)+'px';
 }
 const label=(e,i)=>(e.name??(e.type[0].toUpperCase()+e.type.slice(1)+' '+(i+1)))+(e.construction?' · construction':'');
 function selection(entity,role){return {kind:'component',entityId:entity.id,role};}
 function button(text,entity,role){
  const ref=selection(entity,role),node=document.createElement('button');
  node.type='button';node.className='sketch-tree-node';node.role='treeitem';node.textContent=text;
  node.dataset.sketchSelect=JSON.stringify(ref);node.dataset.sketchEntityId=ref.entityId;node.dataset.role=ref.role;
  node.onclick=event=>select(ref,{add:event.shiftKey});
  node.onpointerenter=()=>hover(ref);node.onpointerleave=()=>hover(null);
  if(!entity.referenceOnly)node.oncontextmenu=event=>{
   select(ref);
   popup(event,[['Delete','delete',()=>remove([entity.id])],[entity.construction?'Turn Regular':'Turn Constructive','line',()=>construction(entity.id,!entity.construction)]]);
  };
  return node;
 }
 function expandable(container,id,label,children){
  const toggle=document.createElement('button');toggle.type='button';toggle.className='sketch-tree-expand';toggle.setAttribute('aria-label','Expand '+label);
  children.className='sketch-tree-children';
  const paint=()=>{children.hidden=!expanded.has(id);toggle.textContent=children.hidden?'▸':'▾';toggle.setAttribute('aria-expanded',String(!children.hidden));};
  toggle.onclick=()=>{if(expanded.has(id))expanded.delete(id);else expanded.add(id);paint();};paint();
  container.prepend(toggle);container.append(children);
 }
 function entityRow(entity,index,owner='entities'){
  const row=document.createElement('div');row.className='sketch-tree-item';
  const text=label(entity,index),node=button(text,entity,entity.type==='point'?'point':'entity');
  row.append(node);
  const roles=points[entity.type]??[];
  if(roles.length){
   const children=document.createElement('div');
   for(const [role,name]of roles)children.append(button(entity.pointNames?.[role]??name,entity,role));
   expandable(row,owner+':'+entity.id,text,children);
  }else node.style.gridColumn='1 / -1';
  return row;
 }
 function render(){
  const state=getState();tab.hidden=!state;
  if(!state){tree.hidden=true;source.hidden=false;if(activeId&&tab.getAttribute('aria-selected')==='true')tabs.querySelector('[data-wb-tree=features]').click();activeId=null;key='';return;}
  if(activeId!==state.id){activeId=state.id;focus();}
  const next=JSON.stringify([state.items,state.operations]);
  if(next!==key){
   key=next;tree.replaceChildren();
   for(const operation of state.operations??[]){
    const ids=new Set([...(operation.entityIds??[]),...(operation.generated??[]),operation.axisId,operation.reference?.entityId,...(operation.kind==='equation'?[operation.id]:[])]);
    const entities=state.allItems.filter(e=>ids.has(e.id));
    const row=document.createElement('div'),node=document.createElement('button'),children=document.createElement('div');
    row.className='sketch-tree-item';node.type='button';node.className='sketch-tree-node';node.role='treeitem';
    node.dataset.sketchOperation=operation.id;node.textContent=operation.name;row.append(node);
    const edit=()=>safely(()=>editOperation(operation));
    node.ondblclick=edit;node.oncontextmenu=event=>popup(event,[['Edit','edit',edit]]);
    node.onpointerenter=()=>hover({kind:'components',refs:entities.map(e=>selection(e,e.type==='point'?'point':'entity'))});
    node.onpointerleave=()=>hover(null);
    for(const entity of entities)children.append(entityRow(entity,state.allItems.indexOf(entity),operation.id));
    if(entities.length)expandable(row,'operation:'+operation.id,operation.name,children);else node.style.gridColumn='1 / -1';
    tree.append(row);
   }
   const group=document.createElement('details'),heading=document.createElement('summary');
   group.open=true;group.dataset.sketchEntities='true';heading.textContent='Entities ('+state.items.length+')';group.append(heading);
   state.items.forEach((entity,i)=>group.append(entityRow(entity,i)));
   tree.append(group);
  }
  const s=state.selected,refs=s?.kind==='components'?s.refs:s?[s]:[];
  for(const node of tree.querySelectorAll('[data-sketch-select]')){
   const ref=JSON.parse(node.dataset.sketchSelect);
   node.setAttribute('aria-selected',String(refs.some(r=>r.entityId===ref.entityId&&r.role===ref.role)));
  }
 }
 return {render,focus};
}
