import {blank} from '../document.mjs';import {upgrade} from '../native/schema.mjs';import {command} from '../commands/domain.mjs';import {regenerateExtrusions} from './kernel.mjs';
export const FINISHING_DEMO={id:'e3-m3-finishing-bracket',name:'E3.M3 Finishing Bracket'};
export async function finishingDemo(){
 let doc=upgrade(blank(FINISHING_DEMO.name));const run=(n,i)=>doc=command(doc,'cad.'+n+'.v1',i),sketch=(id,name=id)=>run('sketch.create',{sketchId:id,definitionId:'definition-main',name,profile:'E1.M5-sketch/1',plane:{kind:'datum',role:'xy'}}),entity=(id,e)=>run('sketch.entity.add',{sketchId:id,unit:'mm',entity:{construction:false,...e}});
 const extrude=(id,sketchId,operation,baseFeatureId,extra={})=>run('extrusion.create',{featureId:id,sketchId,name:id,depthMm:12,reverse:false,operation,...(baseFeatureId?{baseFeatureId}:{}),...extra});
 for(const p of [{id:'finish-radius',name:'FinishRadius',unit:'mm',expression:'2 mm'},{id:'chamfer-size',name:'ChamferSize',unit:'mm',expression:'1 mm'},{id:'hole-span',name:'HoleSpan',unit:'mm',expression:'40 mm'},{id:'hole-count',name:'HoleCount',unit:'scalar',expression:'3'}])run('parameter.set',{parameter:{...p,definitionId:null,description:'M3 review driver'}});
 sketch('bracket-profile','Bracket outline');const outline=[[0,0],[60,0],[60,14],[20,14],[20,40],[0,40]];
 for(let i=0;i<outline.length;i++)entity('bracket-profile',{id:'outline-'+i,type:'line',a:outline[i],b:outline[(i+1)%outline.length]});extrude('bracket-base','bracket-profile','new-body');
 sketch('hole-profile','Hole tool');entity('hole-profile',{id:'hole',type:'circle',center:[10,7],radius:3});extrude('first-hole','hole-profile','cut','bracket-base');
 extrude('hole-array','hole-profile','cut','first-hole',{form:'repeat',repeat:{kind:'linear',sourceFeatureId:'first-hole',axis:'x',count:3,countParameterId:'hole-count',offsetMm:40,offsetMmParameterId:'hole-span',angleDeg:90,distribution:'total',reverse:false,explicitBoolean:true}});
 for(const [id,kind,base,x,radiusMm,parameterId]of [['corner-fillet','fillet','hole-array',0,2,'finish-radius'],['edge-chamfer','chamfer','corner-fillet',60,1,'chamfer-size']]){
  const model=await regenerateExtrusions(doc,{featureId:base,includeMesh:true}),edge=model.mesh.edges.find(e=>!e.curve&&!e.displayHidden&&e.points.every(p=>Math.abs(p[0]-x)<1e-6&&Math.abs(p[1])<1e-6));if(!edge)throw Error('M3 finishing edge not found');
  extrude(id,'bracket-profile','none',base,{form:'finish',finishing:{kind,radiusMm,parameterId,references:[{target:{kind:'edge',producerId:base,definitionId:'definition-main',role:edge.role,occurrencePath:['definition-main']}}]}});
 }
 sketch('pin-profile','Cylinder profile');entity('pin-profile',{id:'pin-circle',type:'circle',center:[75,8],radius:4});extrude('separate-pin','pin-profile','none','edge-chamfer',{depthMm:18});
 sketch('cone-profile','Cone section');const cone=[[85,25],[88,25],[91,40],[85,40]];for(let i=0;i<4;i++)entity('cone-profile',{id:'cone-'+i,type:'line',a:cone[i],b:cone[(i+1)%4]});entity('cone-profile',{id:'cone-axis',type:'line',a:[85,20],b:[85,45],construction:true});
 extrude('separate-cone','cone-profile','none','separate-pin',{form:'revolve',axisId:'cone-axis',angleDeg:360});
 sketch('reference-practice','Reference practice');entity('reference-practice',{id:'reference-line',type:'line',a:[20,-8],b:[50,-8]});entity('reference-practice',{id:'reference-arc',type:'arc',radius:5,center:[75,30],a:[80,30],b:[70,30],clockwise:false});
 return doc;
}
