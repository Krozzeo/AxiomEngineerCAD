import {randomUUID} from 'node:crypto';
import {blank,validate} from '../document.mjs';
import {upgrade,hash} from './schema.mjs';
import {createVersion} from './session.mjs';
import {runWorker} from '../lab/jobs.mjs';
import {recipe,KERNEL} from '../lab/profile.mjs';
export async function nativeDemo(){
  const source=upgrade({...blank('E0.M4 Source Plate'),provisional:'E0.M2',experiment:{profile:'E0.M2-probe-v0',kernel:KERNEL,spec:recipe({scenario:'extrude'})}});
  const original=Buffer.from('width_mm,height_mm,depth_mm\n40,30,10\n');source.native.graph.sources.push({id:'source-specification',filename:'source-dimensions.csv',bytes:original.length,sha256:hash(original),base64:original.toString('base64'),translator:{id:'authored-fixture',version:'1'},fidelity:'Original bytes retained; no CAD feature-history reconstruction claimed.'});
  const proof=(await runWorker('native-verify',{document:source})).result,version=createVersion(source,proof);source.native.versions.push(version);source.native.publications.push({id:randomUUID(),kind:'publication',versionId:version.id,channel:'main',sequence:1});
  const consumer=upgrade({...blank('E0.M4 Native Version Lab'),provisional:'E0.M2',experiment:{profile:'E0.M2-probe-v0',kernel:KERNEL,spec:recipe()}}),g=consumer.native.graph;g.definitions[0].kind='assembly';
  g.dependencies.push({id:'dependency-source',documentId:source.documentId,definitionId:'definition-main',policy:'Latest',channel:'main',effectiveVersion:version.id,snapshot:version.content,locator:'../E0-M4-Source/project.engineer-provisional.json'});
  for(const [id,x]of [['instance-first',0],['instance-second',60]])g.instances.push({id,ownerDefinitionId:g.primaryDefinitionId,definitionId:'definition-main',dependencyId:'dependency-source',transform:{position:[x,0,0],quaternion:[0,0,0,1]}});
  const consumerProof=(await runWorker('native-verify',{document:consumer})).result;consumer.native.versions.push(createVersion(consumer,consumerProof));validate(source);validate(consumer);return {source,consumer};
}
