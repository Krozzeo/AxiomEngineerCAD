import {functionCompletions} from '/parameters/functions.mjs';
export function completionRange(input){
 const text=input.value,caret=input.selectionStart??text.length;
 const prefix=text.slice(0,caret).match(/[A-Za-z_][A-Za-z_0-9.]*$/)?.[0]??'';
 const start=caret-prefix.length,unitSuffix=['mm','cm','m','inch','deg','rad'].includes(prefix)&&/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s+$/.test(text.slice(0,start));
 return {prefix,unitSuffix,start,end:caret+(text.slice(caret).match(/^[A-Za-z_0-9.]*/)?.[0].length??0)};
}

export function completeExpression(input,options){
 const document=input.ownerDocument,menu=document.createElement('div');
 menu.className='parameter-completion-menu';menu.setAttribute('role','listbox');
 let index=0,range,choices=[];
 const close=()=>menu.remove();
 function choose(){
  const token=choices[index];input.setRangeText(token,range.start,range.end,'end');if(token.endsWith('()'))input.setSelectionRange(range.start+token.length-1,range.start+token.length-1);input.focus();close();
 }
 input.addEventListener('input',()=>{
  close();range=completionRange(input);index=0;
  choices=range.prefix&&!range.unitSuffix?[...options(range.prefix),...functionCompletions(range.prefix).map(f=>f.token)].filter(token=>token.toLowerCase().startsWith(range.prefix.toLowerCase())).slice(0,20):[];
  if(!choices.length||choices.includes(range.prefix))return;
  const box=input.getBoundingClientRect();
  Object.assign(menu.style,{position:'fixed',left:box.left+'px',top:box.bottom+'px',zIndex:10050,maxHeight:'220px',overflowY:'auto'});
  menu.replaceChildren(...choices.map((token,i)=>{
   const button=document.createElement('button');button.type='button';button.textContent=token;if(token.endsWith('()'))button.classList.add('formula-function');button.setAttribute('role','option');button.setAttribute('aria-selected',String(i===0));
   button.onpointerdown=event=>{event.preventDefault();index=i;choose();};
   return button;
  }));
  document.body.append(menu);
 });
 input.addEventListener('keydown',event=>{
  if(!menu.isConnected)return;
  if(event.key==='Escape'){event.stopPropagation();close();return;}
  if(!['ArrowUp','ArrowDown','Enter','Tab'].includes(event.key))return;
  event.preventDefault();event.stopPropagation();
  if(event.key==='Enter'||event.key==='Tab'){choose();return;}
  index=(index+choices.length+(event.key==='ArrowDown'?1:-1))%choices.length;
  [...menu.children].forEach((button,i)=>button.setAttribute('aria-selected',String(i===index)));
 });
 input.addEventListener('blur',close);
}
