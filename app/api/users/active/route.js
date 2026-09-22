import {db} from '@/lib/db'
import {requireAccess,ACCESS} from '@/lib/auth/access'
export async function GET(){const access=await requireAccess(ACCESS.WRITE);if(!access.ok)return access.response;const sql=db();return Response.json(await sql`select id,full_name,function_name from app_users where active=true order by full_name`)}
