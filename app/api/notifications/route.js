import { db } from '@/lib/db'
export async function GET(req){ const uid=new URL(req.url).searchParams.get('user_id'); const sql=db(); return Response.json(uid ? await sql`select * from notifications where user_id=${uid} order by created_at desc limit 100` : []) }
