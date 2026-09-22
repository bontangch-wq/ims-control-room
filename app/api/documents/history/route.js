import { db } from '@/lib/db'
import { requireAccess, ACCESS } from '@/lib/auth/access'
export async function GET(req){
 const access=await requireAccess(ACCESS.READ); if(!access.ok)return access.response
 const recordId=new URL(req.url).searchParams.get('record_id'); if(!recordId)return Response.json({error:'record_id is required'},{status:400})
 const sql=db(); const current=(await sql`select document_number from controlled_documents where record_id=${recordId} limit 1`)[0]; if(!current)return Response.json([])
 const rows=await sql`select d.id,d.record_id,d.document_number,d.document_type,d.revision,d.effective_date,d.classification,d.document_status,d.supersedes_id,r.record_no,r.title,r.status record_status from controlled_documents d join ims_records r on r.id=d.record_id where d.document_number=${current.document_number} order by d.created_at desc`
 return Response.json(rows)
}
