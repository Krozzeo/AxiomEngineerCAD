import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {prepareStepImport,exportStepDocument} from '../src/step/exchange.mjs';
import {upgrade} from '../src/native/schema.mjs';import {blank} from '../src/document.mjs';import {stepDemo} from '../src/step/demo.mjs';
const root='test-results/step';await mkdir(root,{recursive:true});const manifest={exporter:'Pinned Engineer Wasm OCCT',cases:[]};
for(const name of ['block-mm','block-inch','drilled-plate','x-cylinder','native-boss']){const document=name==='native-boss'?await stepDemo():(await prepareStepImport(upgrade(blank(name)),{featureId:'imported',name,source:{name:name+'.step',text:await readFile('tests/fixtures/step/'+name+'.step','utf8')}})).document;for(const unit of ['MM','INCH']){const result=await exportStepDocument(document,{unit}),file=name+'-'+unit+'.step';await writeFile(root+'/'+file,result.text);manifest.cases.push({file,sha256:result.sha256,bytes:result.bytes,...result.report});}}
await writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log('Exported '+manifest.cases.length+' STEP files for independent native CAD verification.');
