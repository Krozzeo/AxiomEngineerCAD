// The saved source graph remains intact. Only execution is filtered: explicit
// suppression cascades through dependencies; edit rollback excludes later nodes.
export function executionContent(source,{rollbackAt=null,includeRollback=true}={}) {
  const graph=source.native?.graph??source.graph;if(!graph)return source;
  if(!rollbackAt&&!graph.features.some(f=>f.disabled))return source;
  const value=structuredClone(source),g=value.native?.graph??value.graph,blocked=new Set();
  const ordered=[],seen=new Set(),visit=f=>{if(seen.has(f.id))return;seen.add(f.id);for(const id of f.dependsOn){const parent=g.features.find(p=>p.id===id);if(parent)visit(parent);}ordered.push(f);};for(const f of g.features)visit(f);
  const at=rollbackAt?ordered.findIndex(f=>f.id===rollbackAt):-1;
  for(const [i,f]of ordered.entries())if(f.disabled||(at>=0&&(i>at||!includeRollback&&i===at)))blocked.add(f.id);
  let changed=true;while(changed){changed=false;for(const f of g.features)if(!blocked.has(f.id)&&f.dependsOn.some(id=>blocked.has(id))){blocked.add(f.id);changed=true;}}
  g.features=g.features.filter(f=>!blocked.has(f.id));
  for(const key of ['experiment','assembly']){const type=key==='experiment'?'geometry-probe':'spatial-probe';if(value[key]&&!g.features.some(f=>f.type===type&&f.definitionId===g.primaryDefinitionId))delete value[key];}
  return value;
}
