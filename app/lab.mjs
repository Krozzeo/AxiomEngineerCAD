const $=id=>document.getElementById(id);
let documentState,labState,lastReport=null,active=null,loading=false,triangles=[],selected=null,sketchTransform=null,rasterHits=null;
const token=()=>new URLSearchParams(location.hash.slice(1)).get('token')??sessionStorage.getItem('engineer-token');
async function api(path,data){const r=await fetch('/v1/'+path,{method:data?'POST':'GET',headers:{Authorization:'Bearer '+token(),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify({...data,operationId:crypto.randomUUID()}):undefined});const value=await r.json();if(!r.ok)throw Error((value.code??'OperationFailed')+': '+value.message);return value;}
const status=text=>{$('lab-status').textContent=text;};
function spec(){return {scenario:$('lab-scenario').value,unit:$('lab-unit').value,...Object.fromEntries(['width','height','depth','radius','count'].map(k=>[k,Number($('lab-'+k).value)]))};}
function fillSpec(value){for(const key of ['scenario','unit','width','height','depth','radius','count'])$('lab-'+key).value=value[key];}
async function run(kind,payload={}){try{documentState=await api('document');labState=await api('lab/run',{kind,...payload,expectedRevision:documentState.status.revision});active=labState.job.id;status('Running '+kind+' in an isolated local worker…');$('lab-cancel').disabled=false;$('lab-keep').disabled=true;}catch(e){status(e.message);}}
$('lab-form').addEventListener('submit',e=>{e.preventDefault();run('geometry',{spec:spec()});});
$('lab-suite').addEventListener('click',()=>run('suite'));
$('sketch-solve').addEventListener('click',()=>run('sketch',{fixture:$('sketch-fixture').value}));
$('sketch-drag').addEventListener('click',()=>{$('sketch-fixture').value='free-circle';run('sketch',{fixture:'free-circle',drag:{pointId:'center',x:20,y:15}});});
$('lab-cancel').addEventListener('click',async()=>{try{await api('lab/cancel',{});status('Cancellation requested; committed document is unchanged.');}catch(e){status(e.message);}});
$('lab-keep').addEventListener('click',async()=>{try{documentState=await api('document');const applied=await api('lab/apply',{expectedRevision:documentState.status.revision,jobId:labState.preview.jobId});window.dispatchEvent(new CustomEvent('engineer-document-changed',{detail:applied}));$('lab-keep').disabled=true;status('Experiment recipe kept in the working document. Save document to persist it.');}catch(e){status(e.message);}});
$('lab-report').addEventListener('click',()=>{if(!lastReport)return;const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(lastReport,null,2)],{type:'application/json'}));a.href=url;a.download='Axiom-E0-M2-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
function drawModel(result){
  const canvas=$('lab-canvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);triangles=[];
  if(!result?.mesh)return;
  const {vertices,triangles:indices,faceGroups}=result.mesh;
  const project=(x,y,z)=>[(x-y)*Math.cos(Math.PI/6),(x+y)*0.5-z];
  const projected=[];for(let i=0;i<vertices.length;i+=3)projected.push(project(...vertices.slice(i,i+3)));
  const xs=projected.map(p=>p[0]),ys=projected.map(p=>p[1]);const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min((canvas.width-100)/Math.max(1,maxX-minX),(canvas.height-45)/Math.max(1,maxY-minY));
  const screen=projected.map(([x,y])=>[(x-(minX+maxX)/2)*scale+canvas.width/2,(y-(minY+maxY)/2)*scale+canvas.height/2]);
  for(let i=0;i<indices.length;i+=3){const group=faceGroups.find(g=>i>=g.start&&i<g.start+g.count),ids=indices.slice(i,i+3),normal=result.mesh.normals.slice(ids[0]*3,ids[0]*3+3);
    triangles.push({points:ids.map(j=>screen[j]),depths:ids.map(j=>vertices[j*3]+vertices[j*3+1]+vertices[j*3+2]),group,shade:Math.max(.25,Math.min(1,.6+normal[2]*.25+normal[0]*.15))});}
  // CPU depth buffer avoids treating triangle painter order as geometric visibility.
  const image=ctx.createImageData(canvas.width,canvas.height),depth=new Float64Array(canvas.width*canvas.height);depth.fill(-Infinity);rasterHits=new Uint32Array(depth.length);
  triangles.forEach((t,index)=>{const [a,b,c]=t.points,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-12)return;
    const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(canvas.width-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(canvas.height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
    const color=t.group===selected?[209,173,89]:[65,190,165].map(n=>Math.round(n*t.shade));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/den,v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/den,w=1-u-v;if(u<0||v<0||w<0)continue;const z=u*t.depths[0]+v*t.depths[1]+w*t.depths[2],pixel=y*canvas.width+x;if(z<=depth[pixel])continue;depth[pixel]=z;rasterHits[pixel]=index+1;image.data.set([...color,255],pixel*4);}
  });ctx.putImageData(image,0,0);
}
$('lab-canvas').addEventListener('click',event=>{const box=event.currentTarget.getBoundingClientRect(),p=[Math.floor((event.clientX-box.left)*900/box.width),Math.floor((event.clientY-box.top)*330/box.height)];const hit=triangles[(rasterHits?.[p[1]*900+p[0]]??0)-1];selected=hit?.group??null;
  $('lab-selection').textContent=selected?.semantic?'Selected semantic reference: '+JSON.stringify(selected.semantic)+' · '+labState.preview.reference.state:hit?'Selected derived face has no persistent producer role in this bounded probe.':'No face selected.';drawModel(labState?.preview);
});
function showGeometry(result){selected=null;drawModel(result);const metrics=$('lab-metrics');metrics.replaceChildren();for(const [name,value]of [['Volume (mm³)',result.volumeMm3.toFixed(6)],['Analytic oracle',result.expectedVolumeMm3.toFixed(6)],['B-Rep',result.validity.brepValid?'Valid':'Invalid'],['Solids',result.validity.solids],['Reference',result.reference.state]]){const box=document.createElement('div'),label=document.createElement('small'),v=document.createElement('strong');label.textContent=name;v.textContent=value;box.append(label,v);metrics.append(box);}
  $('lab-preview-label').textContent=`Last valid preview: ${result.spec.scenario} · ${result.spec.width} × ${result.spec.height} × ${result.spec.depth} ${result.spec.unit}. Form changes require a new build.`;
  $('lab-detail').textContent=JSON.stringify({kernel:result.kernel,profile:result.numericProfile,reference:result.reference,validity:result.validity,areaMm2:result.areaMm2,bounds:result.bounds,history:result.history,step:result.step,resources:labState.job.resources},null,2);
  $('lab-keep').disabled=result.validity.solids===0;$('lab-selection').textContent='Select a face in the preview. No transient renderer index is saved.';
}
function showSketch(result){
  $('sketch-status').textContent=result.status+' · remaining DOF: '+(result.remainingDOF??'indeterminate')+' · residual: '+result.evidence.maxResidualMm.toExponential(2)+' mm'+(result.conflicts.length?' · conflicts: '+result.conflicts.join(', '):'')+(result.redundant.length?' · redundant: '+result.redundant.join(', '):'');
  const canvas=$('sketch-canvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,900,210);const ids=new Map(result.primitives.map(p=>[p.id,p]));
  const points=result.primitives.filter(p=>p.type==='point');const max=Math.max(40,...points.flatMap(p=>[Math.abs(p.x),Math.abs(p.y)]));const scale=150/max;
  sketchTransform={x:200,y:180,scale};const screen=p=>[200+p.x*scale,180-p.y*scale];
  ctx.strokeStyle=result.status==='Inconsistent'?'#ff9c8c':result.remainingDOF===0?'#d9e2ee':'#69baff';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=2;
  for(const p of result.primitives){if(p.type==='line'){const a=screen(ids.get(p.p1_id)),b=screen(ids.get(p.p2_id));ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}if(p.type==='circle'){const c=screen(ids.get(p.c_id));ctx.beginPath();ctx.arc(...c,p.radius*scale,0,2*Math.PI);ctx.stroke();}}
  for(const p of points){ctx.beginPath();ctx.arc(...screen(p),4,0,2*Math.PI);ctx.fill();ctx.fillText(p.id,...screen({...p,x:p.x+2,y:p.y+2}));}
}
$('sketch-canvas').addEventListener('pointerdown',e=>{if($('sketch-fixture').value==='free-circle'&&labState?.sketch){e.currentTarget.setPointerCapture(e.pointerId);}});
$('sketch-canvas').addEventListener('pointerup',e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId)||!sketchTransform)return;e.currentTarget.releasePointerCapture(e.pointerId);const box=e.currentTarget.getBoundingClientRect(),x=(e.clientX-box.left)*900/box.width,y=(e.clientY-box.top)*210/box.height;run('sketch',{fixture:'free-circle',drag:{pointId:'center',x:(x-sketchTransform.x)/sketchTransform.scale,y:(sketchTransform.y-y)/sketchTransform.scale}});});
function showSuite(suite){$('suite-details').open=true;$('suite-summary').textContent=`Passed ${suite.passed} / ${suite.total} · Failed ${suite.failed}`;const target=$('suite-results');target.replaceChildren();for(const c of suite.cases){const row=document.createElement('details'),summary=document.createElement('summary'),text=document.createElement('pre');summary.textContent=(c.passed?'PASS · ':'FAIL · ')+c.id;text.textContent=JSON.stringify({expected:c.expected,actual:c.actual,error:c.error,elapsedMs:c.elapsedMs},null,2);row.append(summary,text);target.append(row);}}
async function poll(){if(loading)return;loading=true;try{labState=await api('lab');const job=labState.job;if(job?.state==='running'){$('lab-cancel').disabled=false;return;}if(job&&active===job.id){active=null;$('lab-cancel').disabled=true;if(job.state==='completed'){status('Completed '+job.kind+' · peak worker RSS '+(job.resources.peakRssBytes/1024/1024).toFixed(1)+' MiB');if(job.kind==='geometry')showGeometry(labState.preview);if(job.kind==='sketch')showSketch(labState.sketch);if(job.kind==='suite')showSuite(labState.suite);lastReport={job,geometry:labState.preview?{...labState.preview,mesh:undefined}:null,sketch:labState.sketch,suite:labState.suite};$('lab-report').disabled=false;}else status(job.state+' · '+(job.error?.message??'No committed change.'));}}catch{}finally{loading=false;}}
(async()=>{try{documentState=await api('document');if(documentState.document.experiment)fillSpec(documentState.document.experiment.spec);}catch(e){status(e.message);}setInterval(poll,350);})();

window.addEventListener('engineer-document-changed',event=>{const value=event.detail?.document?.experiment?.spec;if(value)fillSpec(value);});
