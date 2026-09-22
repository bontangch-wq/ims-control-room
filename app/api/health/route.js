import { requireAccess, ACCESS } from '@/lib/auth/access'
import { db } from '@/lib/db'

export async function GET() {
  const access = await requireAccess(ACCESS.READ)
  if (!access.ok) return access.response

  try {
    const sql = db()
    await sql`select 1 as ok`
    return Response.json({ ok:true, provider:'Neon PostgreSQL' })
  } catch {
    return Response.json({ ok:false, provider:'Neon PostgreSQL', message:'Database health check failed' }, { status:503 })
  }
}
