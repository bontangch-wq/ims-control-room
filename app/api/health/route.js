import { requireAccess } from '@/lib/auth/access'
import { db } from '@/lib/db'

const HEALTH_ROLES = ['Super Admin','IMS Admin','Auditor','Function Owner','Viewer']

export async function GET() {
  const access = await requireAccess(HEALTH_ROLES)
  if (!access.ok) return access.response

  try {
    const sql = db()
    await sql`select 1 as ok`
    return Response.json({ ok:true, provider:'Neon PostgreSQL' })
  } catch {
    return Response.json({ ok:false, provider:'Neon PostgreSQL', message:'Database health check failed' }, { status:503 })
  }
}
