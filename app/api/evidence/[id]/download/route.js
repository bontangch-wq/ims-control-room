import { db } from '@/lib/db'
import { requireAccess } from '@/lib/auth/access'
import {presignDownload} from '@/lib/storage'
const ROLES=['Super Admin','IMS Admin','Auditor','Function Owner','Viewer']
export async function GET(req,{params}){
 const access=await requireAccess(ROLES);if(!access.ok)return access.response
 const {id}=await params;const sql=db()
 const rows=await sql`select e.id,e.file_name,e.mime_type,e.file_size,e.storage_path,coalesce(p.can_download,false) explicit_access from evidence e left join evidence_permissions p on p.evidence_id=e.id and p.user_id=${access.profile.id} where e.id=${id} limit 1`
 if(!rows.length)return Response.json({error:'evidence not found'},{status:404})
 const item=rows[0],admin=['Super Admin','IMS Admin'].includes(access.profile.app_role)
 if(!admin&&!item.explicit_access)return Response.json({error:'Download is not authorized'},{status:403})
 if(!item.storage_path)return Response.json({error:'storage object is not registered'},{status:409})
 try{const url=await presignDownload(item.storage_path,item.file_name);await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'DOWNLOAD_AUTHORIZED','evidence',${String(id)},${JSON.stringify({file_name:item.file_name})}::jsonb)`;return Response.json({authorized:true,url,expires_in:120,file_name:item.file_name})}catch(e){return Response.json({error:e.message==='storage-not-configured'?'secure storage is not configured':'unable to create secure download'},{status:503})}
}
