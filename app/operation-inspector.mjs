import {searchSelect} from './search-select.mjs';
import {icon} from './icons.mjs';

export function operationValue(document,{field,label,options=[],value,id,onChange,onSource,emptyMessage=true}){
 const row=document.createElement('div'),title=document.createElement('label'),table=document.createElement('table');
 row.className='operation-value';title.textContent=label;title.htmlFor=field;table.className='operation-value-table';
 const control=searchSelect({document,field,label,options,value:id??'',allowNumber:true,emptyMessage,
  onSelect:key=>onChange(options.find(option=>option.value===key)?.number,key,true),
  onLiteral:(number,{focus})=>onChange(number,null,focus)});
 control.input.id=field;if(!id)control.setLiteral(value);
 table.insertRow().insertCell().append(control.element);row.append(table);
 if(onSource){
  const source=document.createElement('button');source.type='button';source.innerHTML=icon('separate');
  source.title='Go to source';source.setAttribute('aria-label','Go to source');source.onclick=onSource;row.append(source);
 }
 return {title,row,control};
}

export function operationSelection(document,{title,activate,remove}){
 const region=document.createElement('section'),table=document.createElement('table'),heading=document.createElement('h4'),header=document.createElement('div'),clear=document.createElement('button');
 let currentRows=[];
 region.className='operation-selection';region.tabIndex=0;heading.textContent=title;
 header.className='operation-selection-heading';clear.type='button';clear.innerHTML=icon('clear');clear.title='Clear '+title.toLowerCase();clear.setAttribute('aria-label',clear.title);
 clear.onclick=event=>{event.stopPropagation();activate();for(const row of [...currentRows])remove(row);};header.append(heading,clear);
 table.innerHTML='<tbody></tbody>';table.setAttribute('aria-label',title);
 region.append(header,table);region.addEventListener('click',activate);region.addEventListener('focus',activate);
 return {element:region,paint(rows,active){
  currentRows=rows;clear.disabled=!rows.length;
  region.classList.toggle('active',active);table.tBodies[0].replaceChildren();
  if(!rows.length)table.tBodies[0].insertRow().insertCell().textContent='Select geometry';
  for(const item of rows){
   const row=table.tBodies[0].insertRow();row.insertCell().textContent=item.name;
   const button=document.createElement('button');button.type='button';button.innerHTML=icon('delete');
   button.setAttribute('aria-label','Remove '+item.name);button.onclick=event=>{event.stopPropagation();activate();remove(item);};
   row.insertCell().append(button);
  }
 }};
}


export function operationPanel(document,host,id){
 const element=document.createElement('section'),heading=document.createElement('h3'),actions=document.createElement('div');
 element.id=id;element.className='operation-inspector';element.hidden=true;actions.className='operation-inspector-actions';
 host.prepend(element);return {element,heading,actions};
}
