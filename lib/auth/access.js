import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'

export const ROLES=Object.freeze({
  SUPER_ADMIN:'Super Admin',
  IMS_ADMIN:'IMS Admin',
  AUDITOR:'Auditor',
  FUNCTION_OWNER:'Function Owner',
  VIEWER:'Viewer'
})

export const ROLE_VALUES=Object.freeze(Object.values(ROLES))

export const ACCESS=Object.freeze({
  READ:Object.freeze([ROLES.SUPER_ADMIN,ROLES.IMS_ADMIN,ROLES.AUDITOR,ROLES.FUNCTION_OWNER,ROLES.VIEWER]),
  WRITE:Object.freeze([ROLES.SUPER_ADMIN,ROLES.IMS_ADMIN,ROLES.AUDITOR,ROLES.FUNCTION_OWNER]),
  GOVERNANCE:Object.freeze([ROLES.SUPER_ADMIN,ROLES.IMS_ADMIN,ROLES.AUDITOR,ROLES.FUNCTION_OWNER]),
  ASSURANCE:Object.freeze([ROLES.SUPER_ADMIN,ROLES.IMS_ADMIN,ROLES.AUDITOR]),
  ADMIN:Object.freeze([ROLES.SUPER_ADMIN,ROLES.IMS_ADMIN]),
  DOCUMENT_OWNER:Object.freeze([ROLES.SUPER_ADMIN,ROLES.IMS_ADMIN,ROLES.FUNCTION_OWNER])
})

export function hasAccess(profile,roles=[]){
  return !!profile?.active&&(!roles.length||roles.includes(profile.app_role))
}

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
  if (!hasAccess(access.profile,roles)) return { ok:false, response:Response.json({error:'Insufficient permission'},{status:403}) }
  return { ok:true, ...access }
}
