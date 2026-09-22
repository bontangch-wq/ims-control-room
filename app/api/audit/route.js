import { db } from '@/lib/db'
import { requireAccess, ACCESS } from '@/lib/auth/access'

export async function GET(){
  const access=await requireAccess(ACCESS.ASSURANCE); if(!access.ok) return access.response
  const sql=db()
  return Response.json(await sql`select a.*,u.full_name actor from audit_log a left join app_users u on u.id=a.actor_id order by a.created_at desc limit 200`)
}
