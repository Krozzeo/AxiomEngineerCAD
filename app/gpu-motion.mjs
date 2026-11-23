// Rigid preview transforms run on the GPU; immutable tessellation stays uploaded.
import {qmul,inverse,rotate,sub} from '/assembly/math.mjs';
const shader=`struct Motion {q:vec4f,t:vec4f,start:u32,count:u32,pad:vec2u};
@group(0) @binding(0) var<storage,read> source:array<f32>;
@group(0) @binding(1) var<storage,read_write> outputVertices:array<f32>;
@group(0) @binding(2) var<uniform> m:Motion;
fn rotateQ(v:vec3f)->vec3f{return v+2.*cross(m.q.xyz,cross(m.q.xyz,v)+m.q.w*v);}
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3u){if(id.x>=m.count){return;}let i=(m.start+id.x)*9u;
let p=rotateQ(vec3f(source[i],source[i+1u],source[i+2u]))+m.t.xyz;
let n=rotateQ(vec3f(source[i+3u],source[i+4u],source[i+5u]));
outputVertices[i]=p.x;outputVertices[i+1u]=p.y;outputVertices[i+2u]=p.z;outputVertices[i+3u]=n.x;outputVertices[i+4u]=n.y;outputVertices[i+5u]=n.z;
outputVertices[i+6u]=source[i+6u];outputVertices[i+7u]=source[i+7u];outputVertices[i+8u]=source[i+8u];}`;
export class GPUMotion{
 constructor(device){this.device=device;this.pipeline=device.createComputePipeline({layout:'auto',compute:{module:device.createShaderModule({code:shader}),entryPoint:'main'}});this.resources=[];this.dispatches=0;}
 reset(scene,buffers,ranges){for(const b of this.resources)b.destroy();this.resources=[];this.ranges=[];const encoder=this.device.createCommandEncoder(),sources={};for(const [name,target]of Object.entries(buffers)){const source=this.device.createBuffer({size:target.size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});encoder.copyBufferToBuffer(target,0,source,0,target.size);sources[name]=source;this.resources.push(source);}
  for(const range of ranges){const pose=scene.occurrences.find(o=>JSON.stringify(o.path)===JSON.stringify(range.path));if(!pose)continue;const uniform=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.resources.push(uniform);this.ranges.push({...range,base:{position:[...pose.position],quaternion:[...pose.quaternion]},uniform,bind:this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:sources[range.buffer]}},{binding:1,resource:{buffer:buffers[range.buffer]}},{binding:2,resource:{buffer:uniform}}]})});}
  this.device.queue.submit([encoder.finish()]);
 }
 update(scene){if(!this.ranges?.length)return false;const encoder=this.device.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(this.pipeline);for(const range of this.ranges){const pose=scene.occurrences.find(o=>JSON.stringify(o.path)===JSON.stringify(range.path));if(!pose){pass.end();return false;}const q=qmul(pose.quaternion,inverse(range.base.quaternion)),t=sub(pose.position,rotate(q,range.base.position)),data=new ArrayBuffer(48);new Float32Array(data).set([...q,...t,0]);new Uint32Array(data,32).set([range.start,range.count,0,0]);this.device.queue.writeBuffer(range.uniform,0,data);pass.setBindGroup(0,range.bind);pass.dispatchWorkgroups(Math.ceil(range.count/64));}pass.end();this.device.queue.submit([encoder.finish()]);this.dispatches++;return true;}
}
