const token=sessionStorage.getItem('engineer-token')??new URLSearchParams(location.hash.slice(1)).get('token');if(token)sessionStorage.setItem('engineer-token',token);
const originalFetch=window.fetch.bind(window);let workspace=null;
try{const response=await originalFetch('/v1/workspace',{headers:{Authorization:'Bearer '+token}});if(response.ok)workspace=await response.json();else{const error=await response.json();if(!/unsupported|unavailable/i.test(error.code+' '+error.message))throw Error(error.message);}}catch(error){console.error('Project startup',error);}
window.engineerWorkspace=workspace;if(workspace?.preview)document.body?.classList.add('viewing-version');
if(workspace){const documentId=workspace.activeDocumentId;window.fetch=(input,options={})=>{const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);if(url.origin===location.origin&&url.pathname.startsWith('/v1/')){const headers=new Headers(input instanceof Request?input.headers:undefined);new Headers(options.headers).forEach((v,k)=>headers.set(k,v));headers.set('X-Engineer-Document',documentId);headers.set('X-Engineer-Context',workspace.contextId);options={...options,headers};}return originalFetch(input,options);};}
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
