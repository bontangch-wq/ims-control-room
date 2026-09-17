import { db } from '@/lib/db'
import { requireAccess } from '@/lib/auth/access'
const READ=['Super Admin','IMS Admin','Auditor','Function Owner','Viewer']
const WRITE=['Super Admin','IMS Admin','Auditor','Function Owner']

export async function GET(req){
 const access=await requireAccess(READ); if(!access.ok)return access.response
 const recordId=new URL(req.url).searchParams.get('record_id'); if(!recordId)return Response.json({error:'record_id is required'},{status:400})
 const sql=db(); const rows=await sql`select e.id,e.file_name,e.mime_type,e.file_size,e.created_at,u.full_name uploaded_by,case when ${access.profile.app_role} in ('Super Admin','IMS Admin') then true else coalesce(p.can_download,false) end can_download from evidence e left join app_users u on u.id=e.uploaded_by left join evidence_permissions p on p.evidence_id=e.id and p.user_id=${access.profile.id} where e.record_id=${recordId} order by e.created_at desc`
 return Response.json(rows)
}

export async function POST(req){
 const access=await requireAccess(WRITE); if(!access.ok)return access.response
 const b=await req.json(); if(!b.record_id||!b.file_name||!b.storage_path)return Response.json({error:'record_id, file_name and storage_path are required'},{status:400})
 const sql=db(); const record=(await sql`select id,record_no,module from ims_records where id=${b.record_id} limit 1`)[0]; if(!record)return Response.json({error:'record not found'},{status:404})
 const rows=await sql`insert into evidence(record_id,file_name,storage_path,mime_type,file_size,uploaded_by) values(${record.id},${b.file_name},${b.storage_path},${b.mime_type||null},${b.file_size||null},${access.profile.id}) returning id,record_id,file_name,mime_type,file_size,created_at`
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'REGISTER_EVIDENCE','evidence',${String(rows[0].id)},${JSON.stringify({record_no:record.record_no,module:record.module,file_name:b.file_name})}::jsonb)`
 return Response.json(rows[0],{status:201})
}
