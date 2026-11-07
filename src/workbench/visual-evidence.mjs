import {check} from '../document.mjs';

const SIZE=320, MARGIN=16, MAX_PATHS=180;
const dot=(a,b)=>a.reduce((sum,n,i)=>sum+n*b[i],0);
const cross=([x,y,z],[a,b,c])=>[y*c-z*b,z*a-x*c,x*b-y*a];
const unit=v=>{const length=Math.hypot(...v);return v.map(n=>n/length);};

export function captureSelection(scene,selection){
  check(!selection.displayHidden&&selection.resolution!=='TransientDisplayOnly','LostReference','The target has no stable visible geometry.');
  const mesh=scene.models.find(model=>model.definitionId===selection.definitionId)?.mesh;
  check(mesh,'LostReference','The target has no visible model.');
  let paths,normal,closed=selection.kind==='face';
  if(closed){
    const group=mesh.groups.find(group=>group.role===selection.role);
    check(group?.count,'LostReference','The face has no display geometry.');
    check(group.count/3<=MAX_PATHS,'ResourceLimit','The selected face exceeds the visual evidence triangle budget.');
    paths=[];
    for(let i=group.start;i<group.start+group.count;i+=3){
      paths.push(mesh.triangles.slice(i,i+3).map(j=>mesh.vertices.slice(j*3,j*3+3)));
    }
    normal=selection.planeNormal;
  }else{
    const edge=mesh.edges.find(edge=>edge.role===selection.role);
    check(edge?.points.length>1,'LostReference','The edge has no display geometry.');
    check(edge.points.length<=MAX_PATHS,'ResourceLimit','The selected edge exceeds the visual evidence sample budget.');
    paths=[edge.points];
    normal=edge.curve?.normal;
  }

  const direction=unit(normal??[1,2,3]);
  const right=unit(cross(Math.abs(direction[2])>.9?[0,1,0]:[0,0,1],direction));
  const up=cross(direction,right);
  const projected=paths.map(path=>path.map(point=>[dot(point,right),-dot(point,up)]));
  const points=projected.flat();
  const low=[0,1].map(i=>Math.min(...points.map(point=>point[i])));
  const high=[0,1].map(i=>Math.max(...points.map(point=>point[i])));
  const span=Math.max(...high.map((value,i)=>value-low[i]));
  check(Number.isFinite(span)&&span>0,'UnsupportedCapability','The target is degenerate in the evidence projection.');
  const scale=(SIZE-2*MARGIN)/span;
  const pathData=projected.map(path=>path.map((point,j)=>(j?'L':'M')+point.map((n,i)=>Math.round(SIZE/2+(n-(low[i]+high[i])/2)*scale)).join(' ')).join('')+(closed?'Z':'')).join('');
  const provenance=`<desc>Model revision ${selection.source.revision}; ${selection.source.contentHash}</desc>`;
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">'+provenance+'<path d="'+pathData+'" fill="'+(closed?'#8fbaff':'none')+'" stroke="'+(closed?'none':'#23528f')+'" stroke-width="1"/></svg>';
  check(Buffer.byteLength(svg)<=10000,'ResourceLimit','The visual evidence exceeds its SVG byte budget.');
  return {profile:'E2.M1-visual-evidence/1',selection,mime:'image/svg+xml',width:SIZE,height:SIZE,
    frame:'definition-local',projection:normal?'normal-to-target':'fixed-oblique',representation:'display tessellation, semantic measurements in selection',svg};
}
