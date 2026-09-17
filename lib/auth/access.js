import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'

export async function currentAccess() {
  const { data: session, error } = await auth.getSession()
  if (error || !session?.user) return { authenticated:false, user:null, profile:null }
  const sql = db()
  const rows = await sql`select id,email,full_name,function_name,app_role,active,auth_user_id from app_users where auth_user_id=${session.user.id} limit 1`
  return { authenticated:true, user:session.user, profile:rows[0] || null }
}

export async function requireAccess(roles=[]) {
  const access = await currentAccess()
  if (!access.authenticated) return { ok:false, response:Response.json({error:'Unauthenticated'},{status:401}) }
  if (!access.profile || !access.profile.active) return { ok:false, response:Response.json({error:'IMS access is not provisioned or is disabled'},{status:403}) }
  if (roles.length && !roles.includes(access.profile.app_role)) return { ok:false, response:Response.json({error:'Insufficient permission'},{status:403}) }
  return { ok:true, ...access }
}
