import {createVersion} from '../native/session.mjs';
import {verifyNative} from '../native/verify.mjs';
import {finishingDemo} from '../extrusion/finishing-demo.mjs';
import {command} from '../commands/domain.mjs';
export const DEPENDENCY_DEMO={id:'e3-m4-dependency-workbench',name:'E3.M4 Dependency Workbench'};
export async function dependencyDemo(){let d=await finishingDemo();d.metadata.name=DEPENDENCY_DEMO.name;const run=(n,i)=>d=command(d,'cad.'+n+'.v1',i);
 for(const p of [
 {id:'design-size',name:'DesignSize',definitionId:null,unit:'mm',expression:'40 mm'},
 {id:'finish-radius',name:'FinishRadius',definitionId:null,unit:'mm',expression:'IF(doc.DesignSize >= 40 mm, 2 mm, 1 mm)'},
 {id:'chamfer-size',name:'ChamferSize',definitionId:null,unit:'mm',expression:'ROUND(doc.DesignSize / 40, 2)'},
 {id:'hole-span',name:'HoleSpan',definitionId:null,unit:'mm',expression:'doc.DesignSize'},
 {id:'formula-angle',name:'ChamferAngle',definitionId:null,unit:'rad',expression:'RADIANS(30)'},
 {id:'formula-random',name:'StableSample',definitionId:null,unit:'scalar',expression:'RAND()'},
 {id:'local-check',name:'LocalCheck',definitionId:'definition-main',unit:'scalar',expression:'AND(doc.DesignSize > 0 mm, doc.HoleCount >= 2)'}
 ])run('parameter.set',{parameter:{...p,description:'M4 dependency and safe formula review'}});
 const f=d.native.graph.features.find(f=>f.id==='edge-chamfer');run('extrusion.update',{featureId:f.id,name:f.data.name,depthMm:f.data.depthMm,reverse:false,finishing:{...f.data.finishing,mode:'distance-angle',angleDeg:30,angleParameterId:'formula-angle',distance2Mm:1,reverse:false}});
 d.native.versions.push(createVersion(d,await verifyNative(d)));return d;}
