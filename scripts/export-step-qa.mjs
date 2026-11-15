import {productionDemo} from '../src/step/production-demo.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {prepareStepImport,exportStepDocument} from '../src/step/exchange.mjs';
import {upgrade} from '../src/native/schema.mjs';import {blank} from '../src/document.mjs';import {stepDemo} from '../src/step/demo.mjs';
const root='test-results/step';await mkdir(root,{recursive:true});const manifest={exporter:'Pinned Engineer Wasm OCCT',cases:[]};
for(const name of ['block-mm','block-inch','drilled-plate','x-cylinder','native-boss','production-part']){const document=name==='production-part'?await productionDemo():name==='native-boss'?await stepDemo():(await prepareStepImport(upgrade(blank(name)),{featureId:'imported',name,source:{name:name+'.step',text:await readFile('tests/fixtures/step/'+name+'.step','utf8')}})).document;for(const unit of ['MM','INCH'])for(const protocol of ['AP203','AP214','AP242']){const result=await exportStepDocument(document,{unit,protocol}),file=name+'-'+unit+'-'+protocol+'.step';await writeFile(root+'/'+file,result.text);manifest.cases.push({file,sha256:result.sha256,bytes:result.bytes,...result.report});}}
await writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log('Exported '+manifest.cases.length+' STEP files for independent native CAD verification.');
