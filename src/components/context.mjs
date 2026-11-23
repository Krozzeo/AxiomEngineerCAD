import {check} from '../errors.mjs';
// Definition views are transient execution contexts; the document root is never persisted differently.
export function definitionGraph(graph,id,{local=false}={}) {
 check(graph.definitions.some(d=>d.id===id),'LostReference','Component definition is missing.');
 return {...graph,primaryDefinitionId:id,...(local?{features:graph.features.filter(f=>f.definitionId===id)}:{})};
}
export function definitionContent(value,id,{local=false}={}) {
 const next=structuredClone(value),g=value.native?.graph??value.graph;
 if(next.native){next.native.graph=definitionGraph(next.native.graph,id,{local});delete next.native.graph.spatial;}else{next.graph=definitionGraph(next.graph,id,{local});delete next.graph.spatial;}
 for(const [key,type] of [['experiment','geometry-probe'],['assembly','spatial-probe']]) {
  const f=g.features.find(f=>f.definitionId===id&&f.type===type);
  if(f)next[key]=structuredClone(f.data);else delete next[key];
 }
 return next;
}
