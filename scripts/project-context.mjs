// Compact local navigation, not a substitute for current remote publication checks.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,path),'utf8');
const state=JSON.parse(await read('docs/PROJECT_STATE.json'));
const pkg=JSON.parse(await read('package.json'));
const product=JSON.parse(await read('platform/product.json'));
const digest=createHash('sha256').update((await read('MASTER_DESIGN.md')).replace(/\r\n/g,'\n'),'utf8').digest('hex');
const errors=[];
if(state.schemaVersion!==1||state.canonical?.path!=='MASTER_DESIGN.md'||state.canonical?.normalization!=='utf8-lf')errors.push('Unsupported context schema, canonical path or normalization.');
if(digest!==state.canonical?.sha256)errors.push('Master changed: review the full design and update the verified brief before using it.');
if(pkg.version!==product.productVersion)errors.push('Working package and product versions differ.');
for(const path of ['docs/PROJECT_CONTEXT.md',...Object.values(state.navigation??{})]){
  if(!existsSync(resolve(root,path)))errors.push('Missing navigation file: '+path);
}
if(process.argv.includes('--check')){
  console.log(JSON.stringify({contextValid:!errors.length,workingVersion:pkg.version,errors}));
}else{
  const git=process.platform==='win32'&&existsSync('C:/Program Files/Git/cmd/git.exe')?'C:/Program Files/Git/cmd/git.exe':'git';
  const query=args=>{try{return execFileSync(git,['-c','safe.directory='+root.replaceAll('\\','/'),...args],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore'],windowsHide:true}).trim();}catch{return null;}};
  console.log(JSON.stringify({
    contextValid:!errors.length,errors,canonical:state.canonical,
    working:{version:pkg.version,branch:query(['branch','--show-current']),commit:query(['rev-parse','HEAD']),changes:query(['status','--short'])},
    milestone:state.milestone,candidate:state.candidate??null,lastDelivered:state.lastDelivered,
    constraints:state.constraints,navigation:state.navigation,
    start:'Read AGENTS.md and docs/PROJECT_CONTEXT.md; select affected contracts/functions. Do not dump the full tool catalogue or old logs.'
  },null,2));
}
if(errors.length)process.exitCode=1;
