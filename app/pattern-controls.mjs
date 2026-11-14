import {icon} from './icons.mjs';
export function patternDistribution(document,{mode,value,onChange}){
 const element=document.createElement('div');element.className='pattern-distribution';
 const labels=mode==='circular'?['Angular spacing between instances','Total angular range']:['Spacing between instances','Total distance'];
 for(const [index,key]of ['step','total'].entries()){
  const button=document.createElement('button');button.type='button';button.dataset.distribution=key;button.innerHTML=icon(mode==='circular'?(index?'arc':'rotate'):(index?'dimension':'pattern'));button.title=labels[index];button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(value===key));
  button.onclick=()=>{for(const b of element.children)b.setAttribute('aria-pressed',String(b===button));onChange(key);};element.append(button);
 }
 return element;
}
