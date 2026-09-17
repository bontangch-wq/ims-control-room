import { db } from '@/lib/db'
import { requireAccess } from '@/lib/auth/access'

const READ=['Super Admin','IMS Admin','Auditor','Function Owner','Viewer']
const WRITE=['Super Admin','IMS Admin','Auditor','Function Owner']
const STATUSES=['Open','In Review','Approved','Closed']

export async function GET() {
 const access=await requireAccess(READ); if(!access.ok) return access.response
 const sql=db(); const rows=await sql`select r.id,r.record_no,r.title,r.module,r.status,r.severity,r.due_date,r.description,coalesce(u.full_name,'Unassigned') owner,d.document_number,d.document_type,d.revision,d.effective_date,d.retention,d.classification,d.document_status from ims_records r left join app_users u on u.id=r.owner_id left join controlled_documents d on d.record_id=r.id order by r.created_at desc limit 200`; return Response.json(rows)
}
export async function POST(req) {
 const access=await requireAccess(WRITE); if(!access.ok) return access.response
 const body=await req.json(); if(!body.title||!body.module) return Response.json({error:'title and module are required'},{status:400})
 const allowedSeverity=['Low','Medium','Major','Critical']; if(body.severity&&!allowedSeverity.includes(body.severity)) return Response.json({error:'invalid severity'},{status:400})
 const sql=db(); const no=`IMS-${Date.now().toString().slice(-8)}`
 const rows=await sql`insert into ims_records(record_no,title,module,status,severity,due_date,description,created_by) values(${no},${body.title},${body.module},'Open',${body.severity||'Medium'},${body.due_date||null},${body.description||''},${access.profile.id}) returning id,record_no,title,module,status,severity,due_date,description`
 if(body.module==='Document & Record Control'){
  const d=body.document||{}; if(!d.document_number||!d.document_type) return Response.json({error:'Document number and document type are required'},{status:400})
  await sql`insert into controlled_documents(record_id,document_number,document_type,revision,effective_date,retention,classification,document_status) values(${rows[0].id},${d.document_number},${d.document_type},${d.revision||'00'},${d.effective_date||null},${d.retention||null},${d.classification||'Internal'},'Draft')`
 }
 await sql`insert into workflow_history(record_id,from_status,to_status,note,actor_id) values(${rows[0].id},null,'Open','Record created',${access.profile.id})`
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'CREATE','ims_record',${String(rows[0].id)},${JSON.stringify({record_no:no,module:body.module})}::jsonb)`
 return Response.json(rows[0],{status:201})
}
export async function PATCH(req){
 const access=await requireAccess(WRITE); if(!access.ok) return access.response
 const b=await req.json(); if(!b.id||!STATUSES.includes(b.status)) return Response.json({error:'valid id and status are required'},{status:400})
 if(['Approved','Closed'].includes(b.status)&&!['Super Admin','IMS Admin','Auditor'].includes(access.profile.app_role)) return Response.json({error:'Approval or closure requires assurance authority'},{status:403})
 const sql=db(); const current=await sql`select id,status,record_no from ims_records where id=${b.id} limit 1`; if(!current.length) return Response.json({error:'record not found'},{status:404})
 const r=await sql`update ims_records set status=${b.status},updated_at=now() where id=${b.id} returning id,record_no,status`
 await sql`insert into workflow_history(record_id,from_status,to_status,note,actor_id) values(${b.id},${current[0].status},${b.status},${b.note||'Status updated'},${access.profile.id})`
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'STATUS_CHANGE','ims_record',${String(b.id)},${JSON.stringify({record_no:current[0].record_no,from:current[0].status,to:b.status,note:b.note||''})}::jsonb)`
 return Response.json(r[0])
}
