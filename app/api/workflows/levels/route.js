import { db } from '@/lib/db'
export async function POST(req){ const b=await req.json(); const sql=db(); const r=await sql`insert into approval_levels(workflow_id,level_no,level_name,required_role,required_approvals) values(${b.workflow_id},${b.level_no},${b.level_name},${b.required_role},${b.required_approvals||1}) returning *`; return Response.json(r[0],{status:201}) }
export async function DELETE(req){ const id=new URL(req.url).searchParams.get('id'); const sql=db(); await sql`delete from approval_levels where id=${id}`; return Response.json({ok:true}) }
