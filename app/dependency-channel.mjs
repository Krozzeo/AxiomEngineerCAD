import {context} from './cad-commands.mjs';
const session=await context().catch(()=>null),identity=crypto.randomUUID(),channel=new BroadcastChannel('engineer-dependencies-'+(session?.scope.sessionId??identity)),listeners=new Set(),openListeners=new Set();let selection=null,stamp=[0,''],clock=0,closed=false;
const newer=(a,b)=>a[0]>b[0]||a[0]===b[0]&&a[1]>b[1];
function receive(message){if(message.kind==='open'){for(const fn of openListeners)fn();return;}if(message.kind==='request'){channel.postMessage({kind:'selection',selection,stamp});return;}if(message.kind!=='selection'||!Array.isArray(message.stamp)||!Number.isSafeInteger(message.stamp[0])||typeof message.stamp[1]!=='string'||!newer(message.stamp,stamp))return;clock=Math.max(clock,message.stamp[0]);stamp=message.stamp;selection=message.selection;for(const fn of listeners)fn(selection,stamp[1]===identity);}
channel.onmessage=({data})=>{if(!closed&&data&&JSON.stringify(data).length<=8192)receive(data);};
export function setDependencySelection(row,{mode}={}){if(closed)return;const next=row?{...row,mode:mode??(selection?.key===row.key?selection.mode:'trace')}:null;if(JSON.stringify(next)===JSON.stringify(selection))return;const message={kind:'selection',selection:next,stamp:[++clock,identity]};receive(message);channel.postMessage(message);}
export function dependencySelection(){return selection;}
export function subscribeDependencies(fn){listeners.add(fn);fn(selection,false);return()=>listeners.delete(fn);}
export function onOpenDependencies(fn){openListeners.add(fn);return()=>openListeners.delete(fn);}
export function openDependencies(){if(closed)return;const message={kind:'open'};receive(message);channel.postMessage(message);}
channel.postMessage({kind:'request'});
window.addEventListener('pagehide',()=>{if(closed)return;if(stamp[1]===identity&&selection)channel.postMessage({kind:'selection',selection:null,stamp:[++clock,identity]});closed=true;channel.close();},{once:true});
