import { db } from '@/lib/db'
import { requireAccess, ACCESS } from '@/lib/auth/access'

export async function POST(req,{params}){
  const access=await requireAccess(ACCESS.ADMIN); if(!access.ok) return access.response
  const {id}=await params; const b=await req.json(); if(!b.user_id) return Response.json({error:'user_id is required'},{status:400})
  const sql=db(); const evidence=await sql`select id from evidence where id=${id} limit 1`; if(!evidence.length) return Response.json({error:'evidence not found'},{status:404})
  const target=(await sql`select id,app_role,active from app_users where id=${b.user_id} limit 1`)[0]; if(!target)return Response.json({error:'target user not found'},{status:404});if(!target.active)return Response.json({error:'download access cannot be granted to an inactive user'},{status:409});if(['Super Admin','IMS Admin'].includes(target.app_role))return Response.json({error:'Admin roles are always authorized by role and do not require explicit file permission'},{status:409})
  if(typeof b.can_download!=='boolean')return Response.json({error:'can_download must be boolean'},{status:400})
  const canDownload=b.can_download
  const existing=(await sql`select can_download from evidence_permissions where evidence_id=${id} and user_id=${b.user_id} limit 1`)[0]; if(existing&&existing.can_download===canDownload)return Response.json({evidence_id:id,user_id:b.user_id,can_download:canDownload,unchanged:true})
  const rows=await sql`insert into evidence_permissions(evidence_id,user_id,can_download,granted_by) values(${id},${b.user_id},${canDownload},${access.profile.id}) on conflict(evidence_id,user_id) do update set can_download=excluded.can_download,granted_by=excluded.granted_by returning evidence_id,user_id,can_download`
  await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'SET_DOWNLOAD_ACCESS','evidence',${String(id)},${JSON.stringify({user_id:b.user_id,can_download:canDownload})}::jsonb)`
  return Response.json(rows[0])
}
