import { db } from '@/lib/db'
import { requireAccess } from '@/lib/auth/access'
const READ=['Super Admin','IMS Admin','Auditor','Function Owner','Viewer']
export async function GET(req,{params}){
 const access=await requireAccess(READ);if(!access.ok)return access.response
 const {id}=await params;const sql=db()
 const record=(await sql`select id,record_no,title from ims_records where id=${id} limit 1`)[0]
 if(!record)return Response.json({error:'record not found'},{status:404})
 const audit=await sql`select a.id,a.action,a.entity_type,a.entity_id,a.detail,a.created_at,u.full_name actor,u.app_role from audit_log a left join app_users u on u.id=a.actor_id where (a.entity_type='ims_record' and a.entity_id=${String(id)}) or (a.entity_type='controlled_document' and a.entity_id in (select d.id::text from controlled_documents d where d.record_id=${id})) or (a.entity_type='evidence' and a.entity_id in (select e.id::text from evidence e where e.record_id=${id})) or (a.entity_type='approval' and a.entity_id in (select ap.id::text from approvals ap where ap.record_id=${id})) order by a.created_at desc limit 200`
 const workflow=await sql`select w.id,w.from_status,w.to_status,w.note,w.created_at,u.full_name actor,u.app_role from workflow_history w left join app_users u on u.id=w.actor_id where w.record_id=${id} order by w.created_at desc`
 return Response.json({record,audit,workflow})
}
