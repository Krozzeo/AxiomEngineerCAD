export const chatOrigin=task=>task.channel==='pmd'?'PMD':'AI Assistant';
export function formatAiTask(t){
 if(!t)return 'No task yet';
 const rows=['Origin: '+chatOrigin(t),'Task: '+t.id+' · Project: '+t.projectId+' · Workspace: '+(t.workspaceId??'MAIN'),'Engine: '+(t.engineVersion??'not recorded (older history)')+' · Model: '+(t.model??'not recorded')+' · Reasoning: '+(t.reasoning??'not recorded'),'Created: '+(t.createdAt??'not recorded')+' · Finished: '+(t.completedAt??'not recorded'),'Requests '+t.requests+'/'+(t.limits?.maxRequests??'∞'),'User: '+t.objective,'Status: '+t.status+' · '+t.phase+' · '+t.toolCalls+' tools · '+(t.usage?.totalTokens??0)+' tokens','Limits: '+JSON.stringify(t.limits??{}),'Context before: '+JSON.stringify(t.contextBefore??null),'Context after: '+JSON.stringify(t.contextAfter??null),'Work: '+JSON.stringify(t.work??{})];
 for(const r of t.requestUsage??[])rows.push('#'+r.request+' · Input '+r.inputTokens+' (cached '+r.cachedInputTokens+') · Output '+r.outputTokens+' (reasoning '+r.reasoningTokens+') · Total '+(r.totalTokens??'unreported')+' · Bytes '+(r.requestBytes??'?')+' · Stage '+(r.stage??'?')+' · Provider '+(r.providerStatus??'?')+(r.incompleteReason?' · Incomplete: '+r.incompleteReason:'')+' · Context '+JSON.stringify(r.context??null)+(r.message?'\nAssistant: '+r.message:''));
 for(const [i,s]of (t.steps??[]).entries())rows.push((i+1)+'. '+s.tool+' · '+s.status+' · '+JSON.stringify({arguments:s.arguments??null,result:s.result??null,error:s.error??null,errorCode:s.errorCode??null,request:s.request??null,context:s.context??null}));
 const messages=new Set((t.requestUsage??[]).map(r=>r.message));for(const m of t.messages??[])if(!messages.has(m))rows.push('Assistant: '+m);
 rows.push('Agent response: '+(t.response??(t.status==='completed'?t.messages?.at(-1):null)??'(No final response; inspect task error and preceding messages)'));
 if(t.error)rows.push('Task error: '+JSON.stringify(t.error));return rows.join('\n');
}
export const formatAiHistory=tasks=>'Axiom AI history · format 2\n\n'+tasks.map(formatAiTask).join('\n\n');
