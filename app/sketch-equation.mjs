import {completeExpression} from './expression-completion.mjs';

export function equationInspector({document,mutate,context,parameters,construction,select,status}){
 const form=document.createElement('form');form.className='sketch-equation-form';form.dataset.toolOption='equation-curve';form.hidden=true;
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
 const apply=document.createElement('button');apply.textContent='Apply';form.append(apply);
 mode.onchange=()=>{
  fields.second.label.hidden=mode.value!=='parametric';
  fields.first.label.firstChild.textContent=mode.value==='parametric'?'x(t)':'f('+mode.value+')';
  fields.first.input.value=mode.value==='parametric'?'t':mode.value+'^2 / 10';
 };
 fields.second.label.hidden=true;
 form.onsubmit=async event=>{
  event.preventDefault();
  const owner=context();if(!owner||apply.disabled)return;
  const id='equation-'+crypto.randomUUID(),recipe={mode:mode.value};
  for(const [key,{input}]of Object.entries(fields))if(key!=='second'||recipe.mode==='parametric')recipe[key]=input.value.trim();
  apply.disabled=true;
  try{await mutate('sketch.equation-curve.add',{sketchId:owner.sketchId,id,recipe,construction:construction()},owner.editContext);select(id);}
  catch(error){status(error.message);}finally{apply.disabled=false;}
 };
 return {form,async open(){available=await parameters();}};
}
