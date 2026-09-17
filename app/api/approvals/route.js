import { db } from '@/lib/db'
import { requireAccess } from '@/lib/auth/access'

const ROLES=['Super Admin','IMS Admin','Auditor','Function Owner']

export async function GET(req){
 const access=await requireAccess(ROLES); if(!access.ok) return access.response
 const recordId=new URL(req.url).searchParams.get('record_id'); if(!recordId) return Response.json({error:'record_id is required'},{status:400})
 const sql=db();
 const record=(await sql`select id,record_no,title,module,status from ims_records where id=${recordId} limit 1`)[0]; if(!record) return Response.json({error:'record not found'},{status:404})
 const approvals=await sql`select a.id,a.level_no,a.decision,a.comment,a.decided_at,u.full_name approver,w.name workflow,l.level_name,l.description,l.required_role,l.required_approvals from approvals a left join app_users u on u.id=a.approver_id left join approval_workflows w on w.id=a.workflow_id left join approval_levels l on l.workflow_id=a.workflow_id and l.level_no=a.level_no where a.record_id=${recordId} order by a.level_no,a.created_at`
 return Response.json({record,approvals})
}

export async function POST(req){
 const access=await requireAccess(ROLES); if(!access.ok) return access.response
 const b=await req.json(); if(!b.record_id) return Response.json({error:'record_id is required'},{status:400})
 const sql=db(); const record=(await sql`select id,record_no,module,status from ims_records where id=${b.record_id} limit 1`)[0]; if(!record) return Response.json({error:'record not found'},{status:404})
 const workflow=(await sql`select id,name from approval_workflows where module=${record.module} and active=true order by id limit 1`)[0]; if(!workflow) return Response.json({error:'No active approval workflow configured for this module'},{status:409})
 const first=(await sql`select level_no,required_role from approval_levels where workflow_id=${workflow.id} order by level_no limit 1`)[0]; if(!first) return Response.json({error:'Approval workflow has no levels'},{status:409})
 const existing=await sql`select id from approvals where record_id=${record.id} limit 1`; if(existing.length) return Response.json({error:'Approval workflow already started'},{status:409})
 await sql`insert into approvals(record_id,workflow_id,level_no,decision) values(${record.id},${workflow.id},${first.level_no},'Pending')`
 const targets=await sql`select id from app_users where active=true and app_role=${first.required_role}`
 for(const u of targets) await sql`insert into notifications(user_id,record_id,type,message) values(${u.id},${record.id},'APPROVAL_REQUIRED',${`${record.record_no} requires your approval at level ${first.level_no}`})`
 await sql`update ims_records set status='In Review',updated_at=now() where id=${record.id}`
 await sql`insert into workflow_history(record_id,from_status,to_status,note,actor_id) values(${record.id},${record.status},'In Review',${`Approval workflow started: ${workflow.name}`},${access.profile.id})`
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'START_APPROVAL','ims_record',${String(record.id)},${JSON.stringify({workflow:workflow.name,level:first.level_no})}::jsonb)`
 return Response.json({ok:true,workflow:workflow.name,level:first.level_no},{status:201})
}

export async function PATCH(req){
 const access=await requireAccess(ROLES); if(!access.ok) return access.response
 const b=await req.json(); if(!b.record_id||!['Approved','Rejected'].includes(b.decision)) return Response.json({error:'record_id and valid decision are required'},{status:400})
 const comment=String(b.comment||'').trim(); if(!comment) return Response.json({error:'Keterangan / komentar wajib diisi pada setiap level approval'},{status:400})
 const sql=db(); const pending=(await sql`select a.id,a.workflow_id,a.level_no,l.required_role,l.required_approvals,l.level_name from approvals a join approval_levels l on l.workflow_id=a.workflow_id and l.level_no=a.level_no where a.record_id=${b.record_id} and a.decision='Pending' order by a.level_no limit 1`)[0]; if(!pending) return Response.json({error:'No pending approval found'},{status:404})
 if(!['Super Admin','IMS Admin'].includes(access.profile.app_role)&&access.profile.app_role!==pending.required_role) return Response.json({error:'Your role is not authorized for this approval level'},{status:403})
 await sql`update approvals set decision=${b.decision},comment=${comment},approver_id=${access.profile.id},decided_at=now() where id=${pending.id}`
 const record=(await sql`select record_no,status from ims_records where id=${b.record_id}`)[0]
 if(b.decision==='Rejected'){
  await sql`update ims_records set status='Open',updated_at=now() where id=${b.record_id}`
  await sql`insert into workflow_history(record_id,from_status,to_status,note,actor_id) values(${b.record_id},${record.status},'Open',${`Level ${pending.level_no} rejected: ${comment}`},${access.profile.id})`
 } else {
  const next=(await sql`select level_no,required_role from approval_levels where workflow_id=${pending.workflow_id} and level_no>${pending.level_no} order by level_no limit 1`)[0]
  if(next){
   await sql`insert into approvals(record_id,workflow_id,level_no,decision) values(${b.record_id},${pending.workflow_id},${next.level_no},'Pending')`
   const targets=await sql`select id from app_users where active=true and app_role=${next.required_role}`
   for(const u of targets) await sql`insert into notifications(user_id,record_id,type,message) values(${u.id},${b.record_id},'APPROVAL_REQUIRED',${`${record.record_no} requires your approval at level ${next.level_no}`})`
  } else {
   await sql`update ims_records set status='Approved',updated_at=now() where id=${b.record_id}`
   await sql`insert into workflow_history(record_id,from_status,to_status,note,actor_id) values(${b.record_id},${record.status},'Approved',${`Final approval completed: ${comment}`},${access.profile.id})`
  }
 }
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'APPROVAL_DECISION','ims_record',${String(b.record_id)},${JSON.stringify({level:pending.level_no,level_name:pending.level_name,decision:b.decision,comment})}::jsonb)`
 return Response.json({ok:true,decision:b.decision,level:pending.level_no,comment})
}
