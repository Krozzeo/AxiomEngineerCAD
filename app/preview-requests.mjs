// A response still in transit can create/acknowledge a server preview after Cancel.
// Drain all outstanding requests before cancelling that server work or applying source.
export function previewRequests(){
 const pending=new Set();let closing=null;
 return {
  get closing(){return !!closing;},
  run(action){
   if(closing)return Promise.resolve();
   const request=Promise.resolve().then(action);pending.add(request);
   request.then(()=>pending.delete(request),()=>pending.delete(request));return request;
  },
  settle(action){
   if(closing)return closing;
   closing=(async()=>{await Promise.allSettled([...pending]);return action();})();
   const current=closing;current.then(()=>{if(closing===current)closing=null;},()=>{if(closing===current)closing=null;});return current;
  }
 };
}
