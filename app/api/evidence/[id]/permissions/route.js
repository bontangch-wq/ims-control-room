import { db } from '@/lib/db'
import { requireAccess, ACCESS } from '@/lib/auth/access'
export async function GET(req,{params}){
 const access=await requireAccess(ACCESS.ADMIN); if(!access.ok)return access.response
 const {id}=await params; const sql=db()
 const evidence=(await sql`select id,file_name from evidence where id=${id} limit 1`)[0]; if(!evidence)return Response.json({error:'evidence not found'},{status:404})
 const users=await sql`select u.id,u.full_name,u.email,u.app_role,u.active,coalesce(p.can_download,false) explicit_can_download,(u.app_role in ('Super Admin','IMS Admin') or coalesce(p.can_download,false)) effective_can_download,case when u.app_role in ('Super Admin','IMS Admin') then 'admin-role' when coalesce(p.can_download,false) then 'explicit' else 'none' end permission_source from app_users u left join evidence_permissions p on p.user_id=u.id and p.evidence_id=${id} order by u.full_name`
 return Response.json({evidence,users})
}
