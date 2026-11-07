import {api} from './cad-commands.mjs';

export function mountApiPanel(document,host){
  host.className='cad-api';
  host.insertAdjacentHTML('beforeend','<header class="cad-api-toolbar"><strong>Axiom · API</strong><input type="search" placeholder="Search API…" aria-label="Search API"></header><div class="cad-api-layout"><nav aria-label="API index"></nav><article></article></div>');
  const search=host.querySelector('input'),nav=host.querySelector('nav'),page=host.querySelector('article');
  let index,selection='start',request=0;
  const element=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
  async function select(id){
    selection=id;
    for(const button of nav.querySelectorAll('button'))button.classList.toggle('selected',button.dataset.section===id);
    const stamp=++request;
    try{
      const section=await api('api/reference?id='+encodeURIComponent(id));
      if(stamp!==request)return;
      page.replaceChildren(element('p','API / '+section.group),element('h2',section.title),element('p',section.text));
      for(const [label,value] of [['Example',section.example],['Effects',section.effects],['Input schema',section.schema],['Limits',section.limits]]){
        if(value)page.append(element('h3',label),element('pre',JSON.stringify(value,null,2)));
      }
      const link=element('a','Section ID: '+id);
      link.href='/v1/api/reference?id='+encodeURIComponent(id);
      link.onclick=async event=>{event.preventDefault();await navigator.clipboard.writeText(id);link.textContent='Section ID copied';};
      page.append(link);
    }catch(error){if(stamp===request)page.textContent=error.message;}
  }
  function paint(){
    nav.replaceChildren();
    const groups=new Map(),term=search.value.trim().toLowerCase();
    for(const section of index.sections){
      if(![section.id,section.title,section.group].join(' ').toLowerCase().includes(term))continue;
      if(!groups.has(section.group)){
        const details=document.createElement('details');details.open=true;details.append(element('summary',section.group));
        nav.append(details);groups.set(section.group,details);
      }
      const button=element('button',section.title);button.dataset.section=section.id;button.classList.toggle('selected',section.id===selection);
      button.onclick=()=>select(section.id);groups.get(section.group).append(button);
    }
  }
  search.oninput=()=>{if(index)paint();};
  void api('api/reference').then(value=>{index=value;paint();return select(selection);}).catch(error=>{page.textContent=error.message;});
}
