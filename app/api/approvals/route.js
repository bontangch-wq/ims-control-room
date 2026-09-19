import { db } from '@/lib/db'
import { requireAccess } from '@/lib/auth/access'
const READ=['Super Admin','IMS Admin','Auditor','Function Owner','Viewer']
const WRITE=['Super Admin','IMS Admin','Auditor','Function Owner']
async function notifyManagers(sql,recordId,type,message,excludeId){const users=await sql`select id from app_users where active=true and app_role in ('Super Admin','IMS Admin') and id<>${excludeId}`;for(const u of users)await sql`insert into notifications(user_id,record_id,type,message) values(${u.id},${recordId},${type},${message})`}
async function notifyOwner(sql,recordId,ownerId,type,message,excludeId){if(ownerId&&String(ownerId)!==String(excludeId))await sql`insert into notifications(user_id,record_id,type,message) select id,${recordId},${type},${message} from app_users where id=${ownerId} and active=true`}

export async function GET(req){
 const access=await requireAccess(READ); if(!access.ok)return access.response
 const recordId=new URL(req.url).searchParams.get('record_id'); if(!recordId)return Response.json({error:'record_id is required'},{status:400})
 const sql=db(); const record=(await sql`select r.id,r.record_no,r.title,r.module,r.status,d.document_number,d.document_type,d.revision,d.effective_date,d.retention,d.classification,d.document_status,d.supersedes_id from ims_records r left join controlled_documents d on d.record_id=r.id where r.id=${recordId} limit 1`)[0]; if(!record)return Response.json({error:'record not found'},{status:404})
 const approvals=await sql`select a.id,a.level_no,a.decision,a.comment,a.decided_at,u.full_name approver,w.name workflow,l.level_name,l.description,l.required_role,l.required_approvals,(select count(*)::int from approval_decisions d where d.approval_id=a.id and d.decision='Approved') approved_count,(select count(*)::int from approval_decisions d where d.approval_id=a.id and d.decision='Rejected') rejected_count from approvals a left join app_users u on u.id=a.approver_id left join approval_workflows w on w.id=a.workflow_id left join approval_levels l on l.workflow_id=a.workflow_id and l.level_no=a.level_no where a.record_id=${recordId} order by a.level_no,a.created_at`
 for(const a of approvals)a.decisions=await sql`select d.id,d.approver_id,d.decision,d.comment,d.decided_at,u.full_name approver,u.app_role from approval_decisions d join app_users u on u.id=d.approver_id where d.approval_id=${a.id} order by d.decided_at`
 return Response.json({record,approvals,current_user_id:access.profile.id})
}

export async function POST(req){
 const access=await requireAccess(WRITE); if(!access.ok)return access.response
 const b=await req.json(); if(!b.record_id)return Response.json({error:'record_id is required'},{status:400})
 const sql=db(),record=(await sql`select id,record_no,module,status,owner_id from ims_records where id=${b.record_id} limit 1`)[0]; if(!record)return Response.json({error:'record not found'},{status:404}); if(record.module!=='Document & Record Control')return Response.json({error:'Approval workflow is only available for Document & Record Control'},{status:409});const docState=(await sql`select document_status from controlled_documents where record_id=${record.id} limit 1`)[0]?.document_status;if(!docState)return Response.json({error:'Controlled document metadata is missing'},{status:409});if(docState!=='Draft'||record.status!=='Open')return Response.json({error:'Approval can only start for an Open controlled document in Draft status'},{status:409});if(!record.owner_id)return Response.json({error:'Controlled document must have an accountable PIC before approval can start'},{status:409});const owner=(await sql`select active,app_role from app_users where id=${record.owner_id} limit 1`)[0];if(!owner||!owner.active||!['Super Admin','IMS Admin','Function Owner'].includes(owner.app_role))return Response.json({error:'Controlled document PIC must be an active Function Owner, IMS Admin, or Super Admin before approval can start'},{status:409})
 const workflow=(await sql`select id,name from approval_workflows where module=${record.module} and active=true order by id limit 1`)[0]; if(!workflow)return Response.json({error:'No active approval workflow configured for this module'},{status:409})
 const first=(await sql`select level_no,required_role,required_approvals from approval_levels where workflow_id=${workflow.id} order by level_no limit 1`)[0]; if(!first)return Response.json({error:'Approval workflow has no levels'},{status:409})
 if((await sql`select id from approvals where record_id=${record.id} limit 1`).length)return Response.json({error:'Approval workflow already exists for this document. Create a new revision record to start a new approval cycle.'},{status:409})
 const eligible=(await sql`select count(*)::int n from app_users where active=true and app_role=${first.required_role}`)[0].n,adminOverride=(await sql`select count(*)::int n from app_users where active=true and app_role in ('Super Admin','IMS Admin') and app_role<>${first.required_role}`)[0].n,available=eligible+adminOverride;if(available<first.required_approvals){await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'APPROVAL_START_BLOCKED_CAPACITY','ims_record',${String(record.id)},${JSON.stringify({workflow:workflow.name,level:first.level_no,required_approvals:first.required_approvals,available_approvers:available})}::jsonb)`;return Response.json({error:`Workflow cannot start: level ${first.level_no} requires ${first.required_approvals} distinct approver(s), but only ${available} eligible approver(s) are available`},{status:409})}
 await sql`insert into approvals(record_id,workflow_id,level_no,decision) values(${record.id},${workflow.id},${first.level_no},'Pending')`
 const targets=await sql`select id from app_users where active=true and (app_role=${first.required_role} or app_role in ('Super Admin','IMS Admin'))`
 for(const u of targets)await sql`insert into notifications(user_id,record_id,type,message) values(${u.id},${record.id},'APPROVAL_REQUIRED',${`${record.record_no} requires ${first.required_approvals} approval(s) at level ${first.level_no}`})`
 await sql`update ims_records set status='In Review',updated_at=now() where id=${record.id}`
 if(record.module==='Document & Record Control')await sql`update controlled_documents set document_status='In Review',updated_at=now() where record_id=${record.id}`
 await sql`insert into workflow_history(record_id,from_status,to_status,note,actor_id) values(${record.id},${record.status},'In Review',${`Approval workflow started: ${workflow.name}`},${access.profile.id})`
 return Response.json({ok:true,workflow:workflow.name,level:first.level_no},{status:201})
}

export async function PATCH(req){
 const access=await requireAccess(WRITE); if(!access.ok)return access.response
 const b=await req.json(),comment=String(b.comment||'').trim(); if(!b.record_id||!['Approved','Rejected'].includes(b.decision))return Response.json({error:'record_id and valid decision are required'},{status:400}); if(!comment)return Response.json({error:'Keterangan / komentar wajib diisi pada setiap level approval'},{status:400})
 const sql=db(),pending=(await sql`select a.id,a.workflow_id,a.level_no,l.required_role,l.required_approvals,l.level_name from approvals a join approval_levels l on l.workflow_id=a.workflow_id and l.level_no=a.level_no where a.record_id=${b.record_id} and a.decision='Pending' order by a.level_no limit 1`)[0]; if(!pending)return Response.json({error:'No pending approval found'},{status:404})
 if(!['Super Admin','IMS Admin'].includes(access.profile.app_role)&&access.profile.app_role!==pending.required_role)return Response.json({error:'Your role is not authorized for this approval level'},{status:403});const lifecycle=(await sql`select r.status,d.document_status from ims_records r join controlled_documents d on d.record_id=r.id where r.id=${b.record_id} limit 1`)[0];if(!lifecycle||lifecycle.status!=='In Review'||lifecycle.document_status!=='In Review')return Response.json({error:'Approval decision is only allowed while the controlled document is In Review'},{status:409})
 if((await sql`select id from approval_decisions where approval_id=${pending.id} and approver_id=${access.profile.id}`).length)return Response.json({error:'You have already submitted a decision for this approval level'},{status:409})
 if(b.decision==='Approved'){
  const approvedBefore=(await sql`select count(*)::int n from approval_decisions where approval_id=${pending.id} and decision='Approved'`)[0].n
  if(approvedBefore+1>=pending.required_approvals){
   const nextCapacity=(await sql`select level_no,required_role,required_approvals from approval_levels where workflow_id=${pending.workflow_id} and level_no>${pending.level_no} order by level_no limit 1`)[0]
   if(nextCapacity){const eligibleNext=(await sql`select count(*)::int n from app_users where active=true and app_role=${nextCapacity.required_role}`)[0].n,adminOverrideNext=(await sql`select count(*)::int n from app_users where active=true and app_role in ('Super Admin','IMS Admin') and app_role<>${nextCapacity.required_role}`)[0].n,availableNext=eligibleNext+adminOverrideNext;if(availableNext<nextCapacity.required_approvals){await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'APPROVAL_BLOCKED_CAPACITY','ims_record',${String(b.record_id)},${JSON.stringify({completed_level:pending.level_no,next_level:nextCapacity.level_no,required_approvals:nextCapacity.required_approvals,available_approvers:availableNext})}::jsonb)`;return Response.json({error:`Approval cannot complete level ${pending.level_no}: next level ${nextCapacity.level_no} requires ${nextCapacity.required_approvals} distinct approver(s), but only ${availableNext} eligible approver(s) are available`},{status:409})}}
  }
 }
 await sql`insert into approval_decisions(approval_id,approver_id,decision,comment) values(${pending.id},${access.profile.id},${b.decision},${comment})`
 const record=(await sql`select record_no,title,status,module,owner_id from ims_records where id=${b.record_id}`)[0]
 if(b.decision==='Rejected'){
  await sql`update approvals set decision='Rejected',comment=${comment},approver_id=${access.profile.id},decided_at=now() where id=${pending.id}`; await sql`update ims_records set status='Open',updated_at=now() where id=${b.record_id}`
  if(record.module==='Document & Record Control')await sql`update controlled_documents set document_status='Draft',updated_at=now() where record_id=${b.record_id}`
  await sql`insert into workflow_history(record_id,from_status,to_status,note,actor_id) values(${b.record_id},${record.status},'Open',${`Level ${pending.level_no} rejected: ${comment}`},${access.profile.id})`
  const rejectedMessage=`${record.record_no} ditolak pada level ${pending.level_no} (${pending.level_name}). Keterangan: ${comment}`
  await notifyManagers(sql,b.record_id,'APPROVAL_REJECTED',rejectedMessage,access.profile.id);await notifyOwner(sql,b.record_id,record.owner_id,'APPROVAL_REJECTED',rejectedMessage,access.profile.id)
 }else{
  const count=(await sql`select count(*)::int n from approval_decisions where approval_id=${pending.id} and decision='Approved'`)[0].n
  if(count>=pending.required_approvals){
   await sql`update approvals set decision='Approved',comment=${`Approval threshold completed (${count}/${pending.required_approvals})`},approver_id=${access.profile.id},decided_at=now() where id=${pending.id}`
   const next=(await sql`select level_no,required_role,required_approvals from approval_levels where workflow_id=${pending.workflow_id} and level_no>${pending.level_no} order by level_no limit 1`)[0]
   if(next){await sql`insert into approvals(record_id,workflow_id,level_no,decision) values(${b.record_id},${pending.workflow_id},${next.level_no},'Pending')`;const targets=await sql`select id from app_users where active=true and (app_role=${next.required_role} or app_role in ('Super Admin','IMS Admin'))`;for(const u of targets)await sql`insert into notifications(user_id,record_id,type,message) values(${u.id},${b.record_id},'APPROVAL_REQUIRED',${`${record.record_no} requires ${next.required_approvals} approval(s) at level ${next.level_no}`})`;await notifyOwner(sql,b.record_id,record.owner_id,'APPROVAL_PROGRESS',`${record.record_no} telah menyelesaikan level ${pending.level_no} (${pending.level_name}) dan masuk ke level ${next.level_no}.`,access.profile.id)}
   else{
    await sql`update ims_records set status='Approved',updated_at=now() where id=${b.record_id}`
    let finalMessage=`${record.record_no} telah menyelesaikan seluruh level approval.`
    if(record.module==='Document & Record Control'){
     const doc=(await sql`update controlled_documents set document_status='Effective',effective_date=coalesce(effective_date,current_date),updated_at=now() where record_id=${b.record_id} returning id,document_number,revision,supersedes_id`)[0]
     if(doc){finalMessage=`${doc.document_number} Rev. ${doc.revision} telah Effective setelah seluruh level approval selesai.`}
     if(doc?.supersedes_id){const old=(await sql`update controlled_documents set document_status='Obsolete',updated_at=now() where id=${doc.supersedes_id} and document_status='Effective' returning id,record_id,revision`)[0];if(old){await sql`update ims_records set status='Closed',updated_at=now() where id=${old.record_id}`;await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'SUPERSEDE_DOCUMENT','controlled_document',${String(old.id)},${JSON.stringify({document_number:doc.document_number,obsolete_revision:old.revision,effective_revision:doc.revision})}::jsonb)`}}
    }
    await sql`insert into workflow_history(record_id,from_status,to_status,note,actor_id) values(${b.record_id},${record.status},'Approved','All configured approval levels completed',${access.profile.id})`
    await notifyManagers(sql,b.record_id,record.module==='Document & Record Control'?'DOCUMENT_EFFECTIVE':'APPROVAL_COMPLETED',finalMessage,access.profile.id);await notifyOwner(sql,b.record_id,record.owner_id,record.module==='Document & Record Control'?'DOCUMENT_EFFECTIVE':'APPROVAL_COMPLETED',finalMessage,access.profile.id)
   }
  }
 }
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'APPROVAL_DECISION','ims_record',${String(b.record_id)},${JSON.stringify({level:pending.level_no,level_name:pending.level_name,decision:b.decision,comment,required_approvals:pending.required_approvals})}::jsonb)`
 const approved=(await sql`select count(*)::int n from approval_decisions where approval_id=${pending.id} and decision='Approved'`)[0].n
 return Response.json({ok:true,decision:b.decision,level:pending.level_no,comment,approved_count:approved,required_approvals:pending.required_approvals,level_completed:b.decision==='Rejected'||approved>=pending.required_approvals})
}
