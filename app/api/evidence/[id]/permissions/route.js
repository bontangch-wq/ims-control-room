import { db } from '@/lib/db'
import { requireAccess } from '@/lib/auth/access'
export async function GET(req,{params}){
 const access=await requireAccess(['Super Admin','IMS Admin']); if(!access.ok)return access.response
 const {id}=await params; const sql=db()
 const evidence=(await sql`select id,file_name from evidence where id=${id} limit 1`)[0]; if(!evidence)return Response.json({error:'evidence not found'},{status:404})
 const users=await sql`select u.id,u.full_name,u.email,u.app_role,u.active,coalesce(p.can_download,false) can_download from app_users u left join evidence_permissions p on p.user_id=u.id and p.evidence_id=${id} order by u.full_name`
 return Response.json({evidence,users})
}
