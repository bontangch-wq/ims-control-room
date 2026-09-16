import { db } from '@/lib/db'
import { requireAccess } from '@/lib/auth/access'

export async function GET() {
 const access=await requireAccess(['IMS Admin','Auditor','Function Owner','Viewer']); if(!access.ok) return access.response
 const sql=db(); const rows=await sql`select r.id,r.record_no,r.title,r.module,r.status,r.severity,r.due_date,coalesce(u.full_name,'Unassigned') owner from ims_records r left join app_users u on u.id=r.owner_id order by r.created_at desc limit 200`; return Response.json(rows)
}
export async function POST(req) {
 const access=await requireAccess(['IMS Admin','Auditor','Function Owner']); if(!access.ok) return access.response
 const body=await req.json(); if(!body.title||!body.module) return Response.json({error:'title and module are required'},{status:400})
 const allowedSeverity=['Low','Medium','Major','Critical']; if(body.severity&&!allowedSeverity.includes(body.severity)) return Response.json({error:'invalid severity'},{status:400})
 const sql=db(); const no=`IMS-${Date.now().toString().slice(-8)}`
 const rows=await sql`insert into ims_records(record_no,title,module,status,severity,due_date,description,created_by) values(${no},${body.title},${body.module},'Open',${body.severity||'Medium'},${body.due_date||null},${body.description||''},${access.profile.id}) returning id,record_no,title,module,status,severity,due_date`
 await sql`insert into workflow_history(record_id,from_status,to_status,note,actor_id) values(${rows[0].id},null,'Open','Record created',${access.profile.id})`
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'CREATE','ims_record',${String(rows[0].id)},${JSON.stringify({record_no:no,module:body.module})}::jsonb)`
 return Response.json(rows[0],{status:201})
}
