import test from 'node:test';import assert from 'node:assert/strict';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';import {resolve,join,sep} from 'node:path';import {pathToFileURL} from 'node:url';
import {extrusionDemo} from '../src/extrusion/demo.mjs';import {command} from '../src/commands/domain.mjs';
test('delivered 0.1.6 reader accepts unchanged M5 source and refuses suppression, inferred-unit and oriented-plane additions without writes',async t=>{
 await mkdir(resolve('.axiom'),{recursive:true});const folder=await mkdtemp(resolve('.axiom/editing-older-reader-'));assert.ok(folder.startsWith(resolve('.axiom')+sep));t.after(()=>rm(folder,{recursive:true,force:true}));
 const exec=promisify(execFile),git=process.platform==='win32'?'C:/Program Files/Git/cmd/git.exe':'git';
 const archive=await exec(git,['-c','safe.directory='+resolve('.').replaceAll('\\','/'),'archive','--format=tar','d6bab409a319d3fa9a65531bfb2dc74fd79e7bdc','src','platform','package.json','package-lock.json'],{encoding:'buffer',maxBuffer:4*1024*1024});
 const tar=join(folder,'source.tar');await writeFile(tar,archive.stdout);await exec('tar',['-xf',tar,'-C',folder]);
 const original=await extrusionDemo(),disabled=command(original,'cad.feature.enable.v1',{featureId:'extrusion-plate',enabled:false}),automatic=command(original,'cad.parameter.set.v1',{parameter:{id:'auto',name:'Auto',definitionId:null,unit:'auto',expression:'5'}}),oriented=structuredClone(original);oriented.native.graph.features[0].data.plane.orientation={reverseNormal:true,rightQuarterTurns:1};
 for(const [name,value,accepted]of [['original',original,true],['disabled',disabled,false],['automatic',automatic,false],['oriented',oriented,false]]){
  const path=join(folder,name+'.engineer.json');await writeFile(path,JSON.stringify(value));const bytes=await readFile(path),code=`import {readDocument} from ${JSON.stringify(pathToFileURL(join(folder,'src/document.mjs')).href)};try{await readDocument(${JSON.stringify(path)});console.log('READ_ACCEPTED');}catch(error){console.log(error.code);}`;
  const output=await exec(process.execPath,['--input-type=module','-e',code]);if(accepted)assert.match(output.stdout,/READ_ACCEPTED/);else {assert.doesNotMatch(output.stdout,/READ_ACCEPTED/);assert.match(output.stdout,/InvalidInput|InvalidNativeGraph|LostReference|incompatibleVersion/);}assert.deepEqual(await readFile(path),bytes);
 }
});
