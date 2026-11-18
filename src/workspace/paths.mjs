import {resolve,dirname,relative,sep} from 'node:path';
import {lstat,readFile} from 'node:fs/promises';
import {authorized} from '../paths.mjs';
import {check} from '../errors.mjs';
export function projectPath(value,{empty=false}={}){check(typeof value==='string'&&value.length<=512&&(empty&&value===''||value.length>0&&!value.startsWith('/')&&!value.endsWith('/')&&!value.includes('\\')&&!/[<>:"|?*\x00-\x1f]/.test(value)&&value.split('/').every(s=>s&&s!=='.'&&s!=='..'&&!s.endsWith('.')&&!s.endsWith(' ')&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(s)&&!s.startsWith('.engineer')&&!s.startsWith('.axiom'))),'InvalidInput','Choose an ordinary relative project path.');return value;}
export const parentPath=path=>path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';
export const leafName=path=>path.split('/').at(-1);
export async function projectFile(root,path,{newFile=false}={}){projectPath(path,{empty:true});const absolute=resolve(root,path),rel=relative(root,absolute);check(rel!== '..'&&!rel.startsWith('..'+sep),'PermissionDenied','Path is outside this project.');await authorized(root,newFile?dirname(absolute):absolute);if(newFile){try{await lstat(absolute);check(false,'AlreadyExists','A file with that name already exists.');}catch(e){if(e.code!=='ENOENT')throw e;}}else{const info=await lstat(absolute);check(!info.isSymbolicLink()&&(!info.isFile()||info.nlink===1),'PermissionDenied','Linked project files are not allowed.');}return absolute;}
export async function readJson(path,max=131072){const info=await lstat(path);check(info.isFile()&&!info.isSymbolicLink()&&info.nlink===1&&info.size<=max,'PermissionDenied','Expected a bounded ordinary metadata file.');return JSON.parse(await readFile(path,'utf8'));}
