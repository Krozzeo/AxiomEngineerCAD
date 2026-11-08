export function completionRange(input){
 const text=input.value,caret=input.selectionStart??text.length;
 const prefix=text.slice(0,caret).match(/[A-Za-z_][A-Za-z_0-9.]*$/)?.[0]??'';
 return {prefix,start:caret-prefix.length,end:caret+(text.slice(caret).match(/^[A-Za-z_0-9.]*/)?.[0].length??0)};
}

export function completeExpression(input,options){
 const document=input.ownerDocument,menu=document.createElement('div');
 menu.className='parameter-completion-menu';menu.setAttribute('role','listbox');
 let index=0,range,choices=[];
 const close=()=>menu.remove();
 function choose(){
  input.setRangeText(choices[index],range.start,range.end,'end');input.focus();close();
 }
 input.addEventListener('input',()=>{
  close();range=completionRange(input);index=0;
  choices=range.prefix?options(range.prefix).filter(token=>token.toLowerCase().startsWith(range.prefix.toLowerCase())).slice(0,20):[];
  if(!choices.length||choices.includes(range.prefix))return;
  const box=input.getBoundingClientRect();
  Object.assign(menu.style,{position:'fixed',left:box.left+'px',top:box.bottom+'px',zIndex:10050,maxHeight:'220px',overflowY:'auto'});
  menu.replaceChildren(...choices.map((token,i)=>{
   const button=document.createElement('button');button.type='button';button.textContent=token;button.setAttribute('role','option');button.setAttribute('aria-selected',String(i===0));
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
