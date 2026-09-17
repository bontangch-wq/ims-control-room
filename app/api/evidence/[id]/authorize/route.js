import { db } from '@/lib/db'
import { requireAccess } from '@/lib/auth/access'

export async function POST(req,{params}){
  const access=await requireAccess(['Super Admin','IMS Admin']); if(!access.ok) return access.response
  const {id}=await params; const b=await req.json(); if(!b.user_id) return Response.json({error:'user_id is required'},{status:400})
  const sql=db(); const evidence=await sql`select id from evidence where id=${id} limit 1`; if(!evidence.length) return Response.json({error:'evidence not found'},{status:404})
  const rows=await sql`insert into evidence_permissions(evidence_id,user_id,can_download,granted_by) values(${id},${b.user_id},${b.can_download!==false},${access.profile.id}) on conflict(evidence_id,user_id) do update set can_download=excluded.can_download,granted_by=excluded.granted_by returning evidence_id,user_id,can_download`
  await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'SET_DOWNLOAD_ACCESS','evidence',${String(id)},${JSON.stringify({user_id:b.user_id,can_download:b.can_download!==false})}::jsonb)`
  return Response.json(rows[0])
}
