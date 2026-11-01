// Display-only world-space primitives share the model's submitted matrix and depth buffer.
// The ID attachment is write-masked: feedback never changes picking or CAD identity.
const code=`struct U{matrix:mat4x4f,selected:f32,width:f32,height:f32,pad:f32};
@group(0) @binding(0) var<uniform> u:U;
struct O{@builtin(position) position:vec4f,@location(0) color:vec3f,@location(1) uv:vec2f};
const corners=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(1,1),vec2f(-1,-1),vec2f(1,1),vec2f(-1,1));
@vertex fn line(@builtin(vertex_index) i:u32,@location(0) a:vec3f,@location(1) b:vec3f,@location(2) color:vec3f,@location(3) size:f32)->O{
 var o:O;let p=u.matrix*vec4f(a,1);let q=u.matrix*vec4f(b,1);let c=corners[i];let d=(q.xy/q.w-p.xy/p.w)*vec2f(u.width,u.height);let magnitude=max(length(d),.00001);let n=vec2f(-d.y,d.x)/magnitude;var position=mix(p,q,(c.x+1.)*.5);position.x+=n.x*c.y*size/u.width*position.w;position.y+=n.y*c.y*size/u.height*position.w;position.z-=.00002*position.w;o.position=position;o.color=color;o.uv=c;return o;}
@vertex fn point(@builtin(vertex_index) i:u32,@location(0) a:vec3f,@location(1) b:vec3f,@location(2) color:vec3f,@location(3) size:f32)->O{
 var o:O;var p=u.matrix*vec4f(a,1);let c=corners[i];p.x+=c.x*size/u.width*p.w;p.y+=c.y*size/u.height*p.w;p.z-=.00002*p.w;o.position=p;o.color=color;o.uv=c;return o;}
struct P{@location(0) color:vec4f,@location(1) id:u32};
@fragment fn solid(v:O)->P{var o:P;o.color=vec4f(v.color,1);o.id=0u;return o;}
@fragment fn circle(v:O)->P{if(dot(v.uv,v.uv)>1.){discard;}var o:P;o.color=vec4f(v.color,1);o.id=0u;return o;}`;
export class GPUHighlights{
 constructor(device,format,layout){this.device=device;const module=device.createShaderModule({code}),pipelineLayout=device.createPipelineLayout({bindGroupLayouts:[layout]});const make=(entry,fragment)=>device.createRenderPipeline({layout:pipelineLayout,vertex:{module,entryPoint:entry,buffers:[{arrayStride:40,stepMode:'instance',attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'},{shaderLocation:2,offset:24,format:'float32x3'},{shaderLocation:3,offset:36,format:'float32'}]}]},fragment:{module,entryPoint:fragment,targets:[{format},{format:'r32uint',writeMask:0}]},primitive:{topology:'triangle-list'},depthStencil:{format:'depth24plus',depthWriteEnabled:false,depthCompare:'less-equal'}});this.lines=make('line','solid');this.points=make('point','circle');this.signature='';}
 set(lines=[],points=[]){const signature=JSON.stringify([lines,points]);if(signature===this.signature)return false;this.signature=signature;const upload=(items,old)=>{old?.destroy();if(!items.length)return null;const values=new Float32Array(items.flat());const b=this.device.createBuffer({size:values.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});this.device.queue.writeBuffer(b,0,values);return b;};this.lineBuffer=upload(lines,this.lineBuffer);this.pointBuffer=upload(points,this.pointBuffer);this.lineCount=lines.length;this.pointCount=points.length;return true;}
 draw(pass){for(const [pipeline,buffer,count]of [[this.lines,this.lineBuffer,this.lineCount],[this.points,this.pointBuffer,this.pointCount]])if(buffer&&count){pass.setPipeline(pipeline);pass.setVertexBuffer(0,buffer);pass.draw(6,count);}}
 destroy(){this.lineBuffer?.destroy();this.pointBuffer?.destroy();}
}
