document.body.inert=true;
const token=sessionStorage.getItem('engineer-token')??new URLSearchParams(location.hash.slice(1)).get('token');if(token)sessionStorage.setItem('engineer-token',token);
const originalFetch=window.fetch.bind(window);let workspace=null;
try{const response=await originalFetch('/v1/workspace',{headers:{Authorization:'Bearer '+token}});if(response.ok)workspace=await response.json();else{const error=await response.json();if(!/unsupported|unavailable/i.test(error.code+' '+error.message))throw Error(error.message);}}catch(error){console.error('Project startup',error);}
window.engineerWorkspace=workspace;if(workspace?.preview)document.body?.classList.add('viewing-version');
// Every request and response retains the document/context that initiated it.
// Rebinding never turns an old request into an edit of the newly active part.
let scope=workspace,scopeEpoch=0,transition=null,releaseTransition=null;const reads=new Set();
window.engineerBindWorkspace=value=>{scope=value;window.engineerWorkspace=value;scopeEpoch++;releaseTransition?.();transition=null;releaseTransition=null;};
if(workspace)window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
 if(url.origin!==location.origin||!url.pathname.startsWith('/v1/'))return originalFetch(input,options);
 const isSwitch=url.pathname==='/v1/workspace/action'&&['open','activate','close','edit-component','exit-component','create'].includes(JSON.parse(options.body??'{}').action);
 if(isSwitch&&!transition){transition=new Promise(resolve=>{releaseTransition=resolve;});for(const controller of reads)controller.abort();}
 const requestedEpoch=scopeEpoch;if(transition&&!isSwitch){await transition;if(requestedEpoch!==scopeEpoch)throw new DOMException("The active CAD context changed.","AbortError");}
 const controller=options.method!=='POST'?new AbortController():null;
 if(controller){reads.add(controller);if(options.signal)options.signal.addEventListener('abort',()=>controller.abort(),{once:true});options={...options,signal:controller.signal};}
 const epoch=scopeEpoch,headers=new Headers(input instanceof Request?input.headers:undefined);
 new Headers(options.headers).forEach((v,k)=>headers.set(k,v));
 headers.set('X-Engineer-Document',scope.activeDocumentId);headers.set('X-Engineer-Context',scope.contextId);
 let response;try{response=await originalFetch(input,{...options,headers});}catch(error){if(isSwitch){releaseTransition?.();transition=null;releaseTransition=null;}throw error;}finally{if(controller)reads.delete(controller);}
 const json=response.json.bind(response);
 response.json=async()=>{const value=await json();if(isSwitch&&(!response.ok||value.contextId===scope.contextId)){releaseTransition?.();transition=null;releaseTransition=null;}if(epoch!==scopeEpoch)throw new DOMException('The active CAD context changed.','AbortError');return value;};
 return response;
};

try{
await import('/app.mjs');
await import('/lab.mjs');
await import('/assembly.mjs');
await import('/native.mjs');
await import('/review.mjs');
await import('/proof.mjs');
await import('/integration.mjs');
await import('/workbench.mjs');
await import('/dock-workbench.mjs');
await import('/interaction-workbench.mjs');
await import('/sketch-workbench.mjs');
await import('/presentation.mjs');
await import('/parameter-manager.mjs');

 document.body.dataset.editorReady='true';if(!document.body.classList.contains('separated-panel'))document.body.inert=false;
}catch(error){
 document.body.dataset.editorReady='false';document.body.inert=false;
 const alert=document.createElement('section');alert.id='editor-startup-error';alert.className='editor-startup-error';alert.setAttribute('role','alert');alert.dataset.error=String(error.message??error).slice(0,512);
 const message=document.createElement('p');message.textContent='The editor could not finish loading. Reload it, or reopen this project from Axiom Platform.';
 const retry=document.createElement('button');retry.type='button';retry.textContent='Reload editor';retry.addEventListener('click',()=>location.reload());alert.append(message,retry);for(const node of document.body.children)node.inert=true;document.body.append(alert);console.error('Editor startup failed',error);
}
