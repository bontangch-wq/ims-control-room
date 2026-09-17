import {db} from '@/lib/db'
import {requireAccess} from '@/lib/auth/access'
const ASSIGN=['Super Admin','IMS Admin','Auditor','Function Owner']
export async function GET(){const access=await requireAccess(ASSIGN);if(!access.ok)return access.response;const sql=db();return Response.json(await sql`select id,full_name,function_name from app_users where active=true order by full_name`)}
