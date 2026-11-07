import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {branchName,repositoryName} from 'axiom-platform/github';
import {check} from '../errors.mjs';
import {hash} from '../native/schema.mjs';
import {readProjectPreferences,writeProjectPreferences} from './assistant.mjs';

const settingsFile='.engineer-github.json';

export class CadGitHub {
  constructor(adapter){this.adapter=adapter;this.doc=adapter.doc;this.plan=null;this.working=false;}
  get peer(){return this.adapter.sharedGitHub;}
  get prefix(){return 'axiom-engineer/'+this.doc.value.documentId.split('://')[1]+'/';}
  async settings(){return readProjectPreferences(this.doc,settingsFile,{branch:'axiom-publication',history:[]});}
  async status(){
    const settings=await this.settings(),account=this.peer?.account??null;
    return {connected:!!account,account,accountMatches:!!account&&settings.accountId===account.id,
      settings,projectName:this.doc.value.metadata.name,dirty:this.doc.status().dirty||!!this.doc.pending(),platformOrigin:this.adapter.embeddingOrigin};
  }
  async execute(input){
    check(this.peer?.account,'PermissionDenied','Connect GitHub in Axiom Platform Settings.');
    check(!this.working,'projectBusy','A GitHub operation is running.');
    this.working=true;
    try{
      const settings=await this.settings(),account=this.peer.account,epoch=this.peer.epoch;
      const sameAccount=()=>check(!this.doc.closed&&epoch===this.peer.epoch&&account.id===this.peer.account?.id,'RevisionConflict','The GitHub account changed.');
      const save=async data=>{sameAccount();await writeProjectPreferences(this.doc,settingsFile,data);};
      if(input.action==='repositories')return (await this.peer.repositories()).filter(repo=>repo.canPush);
      if(input.action==='create'){
        check(typeof input.name==='string'&&typeof input.private==='boolean','InvalidInput','Enter a repository name and visibility.');
        return this.peer.create(input.name,input.private);
      }
      if(input.action==='configure'){
        check(!settings.pending,'projectBusy','Check the previous publication before changing the destination.');
        const repository=await this.peer.repository(repositoryName(input.repository)),branch=branchName(input.branch);
        let head=await this.peer.head(repository.name,branch);
        if(!head&&input.createBranch===true){
          const base=await this.peer.head(repository.name,repository.branch);
          check(base,'LostReference','Initialize the repository before creating a publication branch.');
          await this.peer.createBranch(repository.name,branch,base);
          head=await this.peer.head(repository.name,branch);
        }
        check(head,'LostReference','Choose an existing branch or allow branch creation.');
        this.plan=null;
        await save({...settings,accountId:account.id,repository:repository.name,branch});
        return this.status();
      }
      check(settings.accountId===account.id&&settings.repository,'PermissionDenied','Choose a repository for this account.');
      if(input.action==='reconcile'){
        const pending=settings.pending;
        check(pending,'LostReference','There is no pending publication.');
        const found=await this.peer.findPublication(settings.repository,settings.branch,pending.id,pending.snapshotHash,this.prefix);
        if(!found){
          const head=await this.peer.head(settings.repository,settings.branch);
          check(head===pending.head,'RevisionConflict','The remote changed. Verify the branch on GitHub.');
          await save({...settings,pending:null});
          return {published:false,message:'The branch still has the reviewed head. Review again before retrying.'};
        }
        await save({...settings,pending:null,history:[{...found,revision:pending.revision,at:new Date().toISOString()},...settings.history].slice(0,25)});
        return {published:true,...found};
      }
      check(!settings.pending,'projectBusy','Check the pending publication before creating another.');
      check(!this.doc.status().dirty&&!this.doc.pending(),'projectBusy','Save MAIN before reviewing a publication.');
      const revision=this.doc.value.revision;
      check(!this.doc.value.native?.graph.dependencies.length,'UnsupportedCapability','Publish a self-contained CAD document without external dependencies.');
      const bytes=await readFile(this.doc.path);
      check(bytes.length<=4*1024*1024,'ResourceLimit','The saved CAD snapshot exceeds 4 MiB.');
      const snapshotHash=hash(bytes);
      const head=await this.peer.head(settings.repository,settings.branch);
      sameAccount();
      check(head,'LostReference','The publication branch was removed.');
      if(input.action==='review'){
        const previous=await this.peer.manifest(settings.repository,this.prefix,head);
        sameAccount();
        check(previous?.snapshotHash!==snapshotHash,'InvalidInput','This saved snapshot is already published.');
        this.plan={id:randomUUID(),head,snapshotHash,revision,epoch,change:previous?'Update':'Add'};
        return {...this.plan,repository:settings.repository,branch:settings.branch,file:this.prefix+'project.engineer-provisional.json',bytes:bytes.length};
      }
      const plan=this.plan;
      check(input.action==='publish'&&plan?.id===input.id&&plan.revision===revision&&plan.head===head&&plan.snapshotHash===snapshotHash
        &&plan.epoch===epoch&&!this.doc.status().dirty&&!this.doc.pending(),'RevisionConflict','The project or remote changed. Review publication again.');
      const message=typeof input.message==='string'?input.message.trim():'';
      check(message.length<=120&&!/[\r\n]/.test(message),'InvalidInput','Use a single commit summary up to 120 characters.');
      this.plan=null;
      await save({...settings,pending:plan});
      const manifest={publicationId:plan.id,snapshotHash,revision,documentId:this.doc.value.documentId};
      const result=await this.peer.commit({repository:settings.repository,branch:settings.branch,expectedHead:head,
        additions:[{path:this.prefix+'project.engineer-provisional.json',bytes},
          {path:this.prefix+'publication.json',bytes:Buffer.from(JSON.stringify(manifest))}],deletions:[],
        publicationId:plan.id,snapshotHash,message:message||'Publish CAD revision '+revision});
      await save({...settings,pending:null,history:[{...result,revision,at:new Date().toISOString()},...settings.history].slice(0,25)});
      return {published:true,...result};
    }finally{this.working=false;}
  }
}
