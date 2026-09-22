import { db } from '@/lib/db'
import { requireAccess, ACCESS, ROLE_VALUES } from '@/lib/auth/access'

export async function GET(){
 const access=await requireAccess(ACCESS.ADMIN); if(!access.ok) return access.response
 const sql=db(); return Response.json(await sql`select id,email,full_name,function_name,app_role,active,auth_user_id from app_users order by full_name`)
}
export async function POST(req){
 const access=await requireAccess(ACCESS.ADMIN); if(!access.ok) return access.response
 const b=await req.json(),email=String(b.email||'').trim().toLowerCase(),fullName=String(b.full_name||'').trim(),role=b.app_role||'Viewer',functionName=String(b.function_name||'').trim().slice(0,120)||null
 if(!email||!fullName) return Response.json({error:'Nama dan email wajib diisi'},{status:400})
 if(email.length>254||fullName.length>160) return Response.json({error:'Nama atau email melebihi batas panjang yang diizinkan'},{status:400})
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({error:'Format email tidak valid'},{status:400})
 if(!ROLE_VALUES.includes(role)) return Response.json({error:'invalid role'},{status:400})
 if(role==='Super Admin'&&access.profile.app_role!=='Super Admin') return Response.json({error:'Only Super Admin can provision Super Admin access'},{status:403})
 const sql=db(); if((await sql`select id from app_users where lower(email)=${email} limit 1`).length) return Response.json({error:'Email sudah terdaftar'},{status:409})
 let r
 try{r=(await sql`insert into app_users(email,full_name,function_name,app_role,active,auth_user_id) values(${email},${fullName},${functionName},${role},true,null) returning id,email,full_name,function_name,app_role,active,auth_user_id`)[0]}catch(e){if(e?.code==='23505')return Response.json({error:'Email sudah terdaftar'},{status:409});throw e}
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'PROVISION_USER','app_user',${String(r.id)},${JSON.stringify({email,full_name:fullName,function_name:functionName,app_role:role})}::jsonb)`
 return Response.json(r,{status:201})
}

export async function PATCH(req){
 const access=await requireAccess(ACCESS.ADMIN); if(!access.ok) return access.response
 const b=await req.json(); if(!b.id) return Response.json({error:'id is required'},{status:400})
 const sql=db(); const target=(await sql`select id,app_role,function_name,active from app_users where id=${b.id} limit 1`)[0]
 if(!target) return Response.json({error:'user not found'},{status:404})
 const nextRole=b.app_role===undefined?target.app_role:b.app_role
 if(!ROLE_VALUES.includes(nextRole)) return Response.json({error:'invalid role'},{status:400})
 const nextActive=b.active===undefined?target.active:b.active
 if(typeof nextActive!=='boolean') return Response.json({error:'active must be boolean'},{status:400})
 const nextFunction=b.function_name===undefined?target.function_name:(String(b.function_name??'').trim().slice(0,120)||null)
 if(String(access.profile.id)===String(b.id)&&nextRole!==target.app_role) return Response.json({error:'You cannot change your own role'},{status:400})
 if(access.profile.app_role!=='Super Admin' && (target.app_role==='Super Admin'||nextRole==='Super Admin')) return Response.json({error:'Only Super Admin can manage Super Admin access'},{status:403})
 if(String(access.profile.id)===String(b.id)&&nextActive===false) return Response.json({error:'You cannot disable your own account'},{status:400})
 if(target.app_role==='Super Admin'&&(nextRole!=='Super Admin'||nextActive===false)){const admins=(await sql`select count(*)::int n from app_users where app_role='Super Admin' and active=true`)[0]?.n||0;if(admins<=1)return Response.json({error:'At least one active Super Admin must remain'},{status:409})}
 if(target.active&&(nextActive===false||nextRole!==target.app_role)){const blocked=await sql`select a.id,a.record_id,l.level_no,l.required_role,l.required_approvals,(select count(*)::int from approval_decisions d where d.approval_id=a.id and d.decision='Approved') approved_count,(select count(distinct u.id)::int from app_users u where u.active=true and u.id<>${b.id} and (u.app_role=l.required_role or u.app_role in ('Super Admin','IMS Admin')) and not exists(select 1 from approval_decisions d join approvals ax on ax.id=d.approval_id where ax.record_id=a.record_id and d.approver_id=u.id and d.decision='Approved')) available_new from approvals a join approval_levels l on l.workflow_id=a.workflow_id and l.level_no=a.level_no where a.decision='Pending' and (${target.app_role}=l.required_role or ${target.app_role} in ('Super Admin','IMS Admin')) and not exists(select 1 from approval_decisions td join approvals ta on ta.id=td.approval_id where ta.record_id=a.record_id and td.approver_id=${b.id} and td.decision='Approved')`;const unsafe=blocked.find(x=>Number(x.approved_count)+Number(x.available_new)<Number(x.required_approvals));if(unsafe)return Response.json({error:`Access change would leave a pending approval without enough eligible approvers at level ${unsafe.level_no}`},{status:409})}
 const r=(await sql`update app_users set app_role=${nextRole},active=${nextActive},function_name=${nextFunction} where id=${b.id} returning id,email,full_name,function_name,app_role,active`)[0]
 await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'UPDATE_ACCESS','app_user',${String(b.id)},${JSON.stringify({app_role:nextRole,previous_app_role:target.app_role,active:nextActive,previous_active:target.active,function_name:nextFunction,previous_function_name:target.function_name})}::jsonb)`
 return Response.json(r)
}
