import {limitValue} from './limits.mjs';
import {check} from '../errors.mjs';
import {planeFrame} from '../sketch/profile.mjs';
const world=(f,p,z=0)=>f.origin.map((x,i)=>x+f.u[i]*p[0]+f.v[i]*p[1]+f.normal[i]*z);
export function capFrame(feature,graph,role){check(['top','bottom'].includes(role),'UnsupportedCapability','Only uniquely proven start/end cap planes are supported as new sketch references.');const sketch=graph.features.find(f=>f.id===feature.data.sketchId),frame=planeFrame(sketch,graph),sign=feature.data.reverse?-1:1,outward=role==='top'?sign:-sign;return {origin:world(frame,[0,0],sign*(feature.data.limits?(feature.data.limits.start.mode==='symmetric'?(role==='top'?1:-1)*limitValue(feature.data.limits.start,graph):limitValue(feature.data.limits[role==='top'?'end':'start'],graph)):role==='top'?feature.data.depthMm:0)),u:frame.u,v:frame.v.map(x=>x*outward),normal:frame.normal.map(x=>x*outward)};}
