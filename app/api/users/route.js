import { db } from '@/lib/db'
export async function GET(){ const sql=db(); return Response.json(await sql`select id,email,full_name,function_name,app_role,active,auth_user_id from app_users order by full_name`) }
export async function PATCH(req){ const b=await req.json(); const sql=db(); const r=await sql`update app_users set app_role=${b.app_role},active=${b.active} where id=${b.id} returning id,email,full_name,function_name,app_role,active`; return Response.json(r[0]) }
