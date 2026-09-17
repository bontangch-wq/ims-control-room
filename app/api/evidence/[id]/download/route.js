import { db } from '@/lib/db'
import { requireAccess } from '@/lib/auth/access'
const ROLES=['Super Admin','IMS Admin','Auditor','Function Owner','Viewer']

export async function GET(req,{params}){
 const access=await requireAccess(ROLES); if(!access.ok)return access.response
 const {id}=await params; const sql=db()
 const rows=await sql`select e.id,e.file_name,e.mime_type,e.file_size,coalesce(p.can_download,false) explicit_access from evidence e left join evidence_permissions p on p.evidence_id=e.id and p.user_id=${access.profile.id} where e.id=${id} limit 1`
 if(!rows.length)return Response.json({error:'evidence not found'},{status:404})
 const admin=['Super Admin','IMS Admin'].includes(access.profile.app_role)
 if(!admin&&!rows[0].explicit_access)return Response.json({error:'Download is not authorized'},{status:403})
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'DOWNLOAD_REQUEST','evidence',${String(id)},${JSON.stringify({file_name:rows[0].file_name,authorized:true})}::jsonb)`
 return Response.json({authorized:true,evidence_id:rows[0].id,file_name:rows[0].file_name,mime_type:rows[0].mime_type,file_size:rows[0].file_size,delivery:'secure-storage-adapter-required'},{status:501})
}
