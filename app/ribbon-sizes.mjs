import './interaction-workbench.mjs';
import {editorDocument as document} from './editor-document.mjs';

const ribbon=document.querySelector('.command-ribbon');
export function sizeCommand(button,size){
 button.dataset.commandSize=size;
 const text=button.textContent.trim();
 if(!button.title)button.title=text;
 if(!button.getAttribute('aria-label'))button.setAttribute('aria-label',text);
 return button;
}
export function commandMenu(button,items,size='small'){
 sizeCommand(button,size);
 const group=document.createElement('div'),toggle=document.createElement('button'),menu=document.createElement('div');
 group.className='ribbon-split';group.dataset.splitSize=size;
 toggle.type='button';toggle.className='ribbon-arrow';toggle.textContent='▾';
 toggle.setAttribute('aria-label',button.getAttribute('aria-label')+' options');
 toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-haspopup','menu');
 menu.className='ribbon-options';menu.popover='auto';menu.role='menu';
 for(const item of items){item.dataset.commandSize='menu';item.role='menuitem';item.addEventListener('click',()=>menu.hidePopover());menu.append(item);}
 toggle.popoverTargetElement=menu;
 toggle.addEventListener('click',()=>{
  const bounds=group.getBoundingClientRect();
  menu.style.left=Math.min(bounds.left,window.innerWidth-235)+'px';
  menu.style.top=bounds.bottom+'px';
 });
 menu.addEventListener('toggle',()=>toggle.setAttribute('aria-expanded',String(menu.matches(':popover-open'))));
 group.append(button,toggle,menu);return group;
}
export function commandColumn(commands,size='medium'){
 const column=document.createElement('div');column.className='ribbon-column';
 for(const item of commands.filter(Boolean)){if(item.tagName==='BUTTON')sizeCommand(item,size);column.append(item);}
 return column;
}
export function commandGrid(rows){
 const grid=document.createElement('div');grid.className='ribbon-grid';
 for(const row of rows)for(const item of row){if(item.tagName==='BUTTON')sizeCommand(item,'small');grid.append(item);}
 return grid;
}
function sizeUnassigned(){
 for(const page of ribbon.querySelectorAll('.operation-page')){
  let pending=[];
  const flush=()=>{if(!pending.length)return;const list=pending;pending=[];const next=list.at(-1).nextSibling;page.insertBefore(commandColumn(list),next);};
  for(const child of [...page.children]){
   if(page.dataset.operations==='Sketch'||child.tagName!=='BUTTON'||child.dataset.commandSize==='large'){flush();continue;}
   pending.push(child);if(pending.length===3)flush();
  }
  flush();
 }
}
sizeUnassigned();
new MutationObserver(sizeUnassigned).observe(ribbon,{childList:true,subtree:true});
ribbon.querySelector('.ribbon-tabs').addEventListener('click',()=>{
 for(const menu of ribbon.querySelectorAll('.ribbon-options:popover-open'))menu.hidePopover();
});
