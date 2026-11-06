import {editorDocument as document} from './editor-document.mjs';
export function createSelectionMenu({canvas,menu,candidates,select,hover,status,newSketch,hideSource,enabled}){
 let table=null,epoch=0;
 function close(){const wasOpen=!menu.hidden||!!table;menu.hidden=true;table?.remove();table=null;if(wasOpen)hover(null);epoch++;}
 function locate(node,event){const owner=event.target.ownerDocument;if(node.ownerDocument!==owner)owner.body.append(node);const view=owner.defaultView;Object.assign(node.style,{left:Math.max(4,Math.min(event.clientX,view.innerWidth-360))+'px',top:Math.max(4,Math.min(event.clientY,view.innerHeight-340))+'px'});}
 function showChoices(event){menu.hidden=true;table?.remove();table=document.createElement('section');table.id='model-selection-choices';table.className='cad-selection-choices';table.setAttribute('role','dialog');table.setAttribute('aria-label','Select another');locate(table,event);table.innerHTML='<header><strong>Select another...</strong><button type="button" aria-label="Close selection choices">×</button></header><div><table><thead><tr><th>Type</th><th>Entity</th></tr></thead><tbody></tbody></table></div>';table.querySelector('header button').onclick=close;
  const body=table.querySelector('tbody'),entries=candidates(event);
  for(const item of entries){const row=body.insertRow();row.tabIndex=0;row.setAttribute('role','option');row.insertCell().textContent=item.type;row.insertCell().textContent=item.label;row.onpointerenter=()=>hover(item);row.onpointerleave=()=>hover(null);const choose=async()=>{try{await select(item);close();}catch(error){status(error.message);}};row.onclick=choose;row.onkeydown=e=>{if(e.key==='Enter')choose();};}
  if(!entries.length){const cell=body.insertRow().insertCell();cell.colSpan=2;cell.textContent='No selectable entities here.';}event.target.ownerDocument.body.append(table);
 }
 canvas.parentElement.addEventListener('contextmenu',async event=>{
  if(!enabled())return;event.preventDefault();event.stopPropagation();close();const current=epoch;menu.replaceChildren();const another=document.createElement('button');another.type='button';another.textContent='Select another...';another.setAttribute('role','menuitem');another.onclick=()=>showChoices(event);menu.append(another);
  const hide=hideSource(event);
  if(hide){
   const button=document.createElement('button');button.type='button';button.textContent='Hide';
   button.setAttribute('role','menuitem');
   button.onclick=()=>{close();hide().catch(error=>status(error.message));};
   menu.prepend(button);
  }
  locate(menu,event);menu.hidden=false;
  try{const begin=await newSketch(event);if(current!==epoch||!begin)return;const button=document.createElement('button');button.type='button';button.textContent='New Sketch';button.setAttribute('role','menuitem');button.onclick=()=>{close();begin().catch(error=>status(error.message));};menu.prepend(button);}catch{}
 });
 document.addEventListener('pointerdown',event=>{if((!menu.hidden||table)&&!menu.contains(event.target)&&!table?.contains(event.target))close();},true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&(table||!menu.hidden)){event.preventDefault();event.stopPropagation();close();}});
 return {close};
}
