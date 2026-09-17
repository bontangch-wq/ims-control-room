import { db } from '@/lib/db'
import { requireAccess } from '@/lib/auth/access'

const ROLES=['Super Admin','IMS Admin','Auditor','Function Owner','Viewer']

export async function GET(){
 const access=await requireAccess(['Super Admin','IMS Admin']); if(!access.ok) return access.response
 const sql=db(); return Response.json(await sql`select id,email,full_name,function_name,app_role,active,auth_user_id from app_users order by full_name`)
}
export async function PATCH(req){
 const access=await requireAccess(['Super Admin','IMS Admin']); if(!access.ok) return access.response
 const b=await req.json(); if(!b.id) return Response.json({error:'id is required'},{status:400})
 if(!ROLES.includes(b.app_role)) return Response.json({error:'invalid role'},{status:400})
 const sql=db(); const target=await sql`select id,app_role from app_users where id=${b.id} limit 1`
 if(!target.length) return Response.json({error:'user not found'},{status:404})
 if(access.profile.app_role!=='Super Admin' && (target[0].app_role==='Super Admin' || b.app_role==='Super Admin')) return Response.json({error:'Only Super Admin can manage Super Admin access'},{status:403})
 if(String(access.profile.id)===String(b.id) && b.active===false) return Response.json({error:'You cannot disable your own account'},{status:400})
 const r=await sql`update app_users set app_role=${b.app_role},active=${Boolean(b.active)} where id=${b.id} returning id,email,full_name,function_name,app_role,active`
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'UPDATE_ACCESS','app_user',${String(b.id)},${JSON.stringify({app_role:b.app_role,active:Boolean(b.active)})}::jsonb)`
 return Response.json(r[0])
}
