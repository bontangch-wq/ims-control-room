import { db } from '@/lib/db'
import { requireAccess, ACCESS } from '@/lib/auth/access'

export async function GET(){
  const access=await requireAccess(ACCESS.READ); if(!access.ok) return access.response
  const sql=db()
  return Response.json(await sql`select id,record_id,type,message,is_read,created_at from notifications where user_id=${access.profile.id} order by created_at desc limit 100`)
}

export async function PATCH(req){
  const access=await requireAccess(ACCESS.READ); if(!access.ok) return access.response
  const b=await req.json(),sql=db()
  if(b.all===true){const rows=await sql`update notifications set is_read=true where user_id=${access.profile.id} and is_read=false returning id`;return Response.json({updated:rows.length})}
  if(!b.id) return Response.json({error:'id is required'},{status:400})
  const rows=await sql`update notifications set is_read=true where id=${b.id} and user_id=${access.profile.id} returning id,is_read`
  if(!rows.length) return Response.json({error:'notification not found'},{status:404})
  return Response.json(rows[0])
}
