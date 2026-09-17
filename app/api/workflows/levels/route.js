import { db } from '@/lib/db'
import { requireAccess } from '@/lib/auth/access'
const ADMINS=['Super Admin','IMS Admin']

async function normalize(sql,workflowId){
 const levels=await sql`select id from approval_levels where workflow_id=${workflowId} order by level_no,id`
 for(let i=0;i<levels.length;i++) await sql`update approval_levels set level_no=${i+1} where id=${levels[i].id}`
}

export async function POST(req){
 const access=await requireAccess(ADMINS); if(!access.ok) return access.response
 const b=await req.json(); if(!b.workflow_id||!b.level_name||!b.required_role) return Response.json({error:'workflow_id, level_name and required_role are required'},{status:400})
 const sql=db(); const current=await sql`select coalesce(max(level_no),0)::int max_level from approval_levels where workflow_id=${b.workflow_id}`
 const requested=Number(b.level_no||current[0].max_level+1); const levelNo=Math.max(1,Math.min(requested,current[0].max_level+1))
 if(levelNo<=current[0].max_level) await sql`update approval_levels set level_no=level_no+1 where workflow_id=${b.workflow_id} and level_no>=${levelNo}`
 const r=await sql`insert into approval_levels(workflow_id,level_no,level_name,description,required_role,required_approvals) values(${b.workflow_id},${levelNo},${b.level_name},${b.description||''},${b.required_role},${Math.max(1,Number(b.required_approvals||1))}) returning *`
 await normalize(sql,b.workflow_id)
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'ADD_LEVEL','approval_workflow',${String(b.workflow_id)},${JSON.stringify({level_no:levelNo,level_name:b.level_name,description:b.description||'',required_role:b.required_role,required_approvals:Math.max(1,Number(b.required_approvals||1))})}::jsonb)`
 return Response.json(r[0],{status:201})
}

export async function PATCH(req){
 const access=await requireAccess(ADMINS); if(!access.ok) return access.response
 const b=await req.json(); if(!b.id) return Response.json({error:'id is required'},{status:400})
 const sql=db(); const old=(await sql`select * from approval_levels where id=${b.id} limit 1`)[0]; if(!old) return Response.json({error:'level not found'},{status:404})
 const levelName=b.level_name??old.level_name,description=b.description??old.description,role=b.required_role??old.required_role,required=Math.max(1,Number(b.required_approvals??old.required_approvals))
 await sql`update approval_levels set level_name=${levelName},description=${description||''},required_role=${role},required_approvals=${required} where id=${b.id}`
 if(b.level_no&&Number(b.level_no)!==old.level_no){
  const target=Math.max(1,Number(b.level_no));
  if(target<old.level_no) await sql`update approval_levels set level_no=level_no+1 where workflow_id=${old.workflow_id} and id<>${b.id} and level_no>=${target} and level_no<${old.level_no}`
  else await sql`update approval_levels set level_no=level_no-1 where workflow_id=${old.workflow_id} and id<>${b.id} and level_no<=${target} and level_no>${old.level_no}`
  await sql`update approval_levels set level_no=${target} where id=${b.id}`
 }
 await normalize(sql,old.workflow_id)
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'UPDATE_LEVEL','approval_workflow',${String(old.workflow_id)},${JSON.stringify({level_id:b.id,level_name:levelName,description:description||'',required_role:role,required_approvals:required})}::jsonb)`
 return Response.json({ok:true})
}

export async function DELETE(req){
 const access=await requireAccess(ADMINS); if(!access.ok) return access.response
 const id=new URL(req.url).searchParams.get('id'); if(!id) return Response.json({error:'id is required'},{status:400})
 const sql=db(); const removed=await sql`delete from approval_levels where id=${id} returning workflow_id,level_no,level_name`; if(!removed.length) return Response.json({error:'level not found'},{status:404})
 await normalize(sql,removed[0].workflow_id)
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'REMOVE_LEVEL','approval_workflow',${String(removed[0].workflow_id)},${JSON.stringify({level_no:removed[0].level_no,level_name:removed[0].level_name})}::jsonb)`
 return Response.json({ok:true})
}
