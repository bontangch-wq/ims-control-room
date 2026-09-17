import {db} from '@/lib/db'
import {requireAccess} from '@/lib/auth/access'
const READ=['Super Admin','IMS Admin','Auditor','Function Owner','Viewer']
export async function GET(){const access=await requireAccess(READ);if(!access.ok)return access.response;const sql=db();return Response.json(await sql`select id,full_name,function_name,app_role from app_users where active=true order by full_name`)}
