import {operationPanel} from './operation-inspector.mjs';
import {completeExpression} from './expression-completion.mjs';

export function equationInspector({document,host,mutate,context,parameters,construction,select,status,onActive}){
 const {element:panel,heading,actions}=operationPanel(document,host,'sketch-equation');
 heading.textContent='Equation Driven Curve';
 const form=document.createElement('form');form.className='sketch-equation-form';panel.append(heading,form);
 let editing=null,epoch=0;
 const mode=document.createElement('select');mode.setAttribute('aria-label','Equation format');
 for(const [value,label] of [['x','y = f(x)'],['y','x = f(y)'],['z','Transverse coordinate = f(z)'],['parametric','x(t), y(t)']])mode.append(new Option(label,value));
 form.append(mode);
 let available=[];
 const fields={};
 for(const [key,caption,value]of [['start','Start','-10'],['end','End','10'],['first','f(x)','x^2 / 10'],['second','y(t)','t^2 / 10']]){
  const label=document.createElement('label'),input=document.createElement('input');
  label.textContent=caption;input.value=value;input.type='text';input.autocomplete='off';input.required=key!=='second';input.maxLength=512;
  label.append(input);form.append(label);fields[key]={label,input};
  completeExpression(input,prefix=>available.map(p=>prefix.includes('.')?(p.definitionId===null?'doc.':'local.')+p.name:p.name));
 }
 const apply=document.createElement('button'),cancelButton=document.createElement('button');
 apply.textContent='Apply';cancelButton.type='button';cancelButton.textContent='Cancel';
 cancelButton.onclick=()=>{cancel();select(null);};actions.append(apply,cancelButton);form.append(actions);
 function cancel(){if(panel.hidden)return;epoch++;panel.hidden=true;editing=null;onActive(false);}
 mode.onchange=()=>{
  fields.second.label.hidden=mode.value!=='parametric';
  fields.first.label.firstChild.textContent=mode.value==='parametric'?'x(t)':'f('+mode.value+')';
  fields.first.input.value=mode.value==='parametric'?'t':mode.value+'^2 / 10';
 };
 fields.second.label.hidden=true;
 form.onsubmit=async event=>{
  event.preventDefault();
  const owner=context();if(!owner||apply.disabled)return;
  const id=editing?.id??'equation-'+crypto.randomUUID(),recipe={mode:mode.value};
  for(const [key,{input}]of Object.entries(fields))if(key!=='second'||recipe.mode==='parametric')recipe[key]=input.value.trim();
  apply.disabled=true;
  try{await mutate('sketch.equation-curve.add',{sketchId:owner.sketchId,id,recipe,construction:editing?.construction??construction(),...(editing?{replace:true}:{})},owner.editContext);cancel();select(id);}
  catch(error){status(error.message);}finally{apply.disabled=false;}
 };
 return {cancel,get active(){return !panel.hidden;},async open(operation=null){
  const opening=++epoch;editing=operation;panel.hidden=false;onActive(true);
  mode.value=operation?.recipe.mode??'x';mode.onchange();
  for(const [key,{input}]of Object.entries(fields))input.value=operation?.recipe[key]??input.defaultValue??input.value;
  if(!operation){fields.start.input.value='-10';fields.end.input.value='10';fields.first.input.value='x^2 / 10';fields.second.input.value='t^2 / 10';}
  const loaded=await parameters();if(opening===epoch)available=loaded;
 }};
}
