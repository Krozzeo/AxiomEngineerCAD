import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile(new URL('../legal/source-manifest.json',import.meta.url),'utf8'));
const destination=resolve('node_modules/.axiom-corresponding-source');await mkdir(destination,{recursive:true});
const records=[];
for(const source of manifest.archives){
  if(!/^[\w.-]+\/[\w.-]+$/.test(source.repository)||!/^[a-f0-9]{40}$/.test(source.commit)||!/^[\w.-]+\.tar\.gz$/.test(source.name))throw Error('Invalid source manifest');
  const url=`https://codeload.github.com/${source.repository}/tar.gz/${source.commit}`;
  const path=join(destination,source.name);let bytes=await readFile(path).catch(()=>null);
  if(!bytes){const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('Corresponding source unavailable: '+source.repository);bytes=Buffer.from(await response.arrayBuffer());await writeFile(path,bytes);}
  if(bytes.length>110*1024*1024)throw Error('Source archive exceeds delivery budget');
  const sha256=createHash('sha256').update(bytes).digest('hex');
  if(source.sha256&&sha256!==source.sha256)throw Error('Corresponding source checksum mismatch: '+source.name);
  records.push({...source,url,bytes:bytes.length,sha256});console.log(source.name,bytes.length,sha256);
}
await writeFile(join(destination,'sources.json'),JSON.stringify({description:manifest.description,archives:records},null,2)+'\n');
console.log('Corresponding source bytes',records.reduce((sum,r)=>sum+r.bytes,0));
