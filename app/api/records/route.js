import { db } from '@/lib/db'
export async function GET() {
 const sql=db(); const rows=await sql`select r.id,r.record_no,r.title,r.module,r.status,r.severity,r.due_date,coalesce(u.full_name,'Unassigned') owner from ims_records r left join app_users u on u.id=r.owner_id order by r.created_at desc limit 200`; return Response.json(rows)
}
export async function POST(req) {
 const body=await req.json(); if(!body.title||!body.module) return Response.json({error:'title and module are required'},{status:400}); const sql=db(); const no=`IMS-${Date.now().toString().slice(-8)}`; const rows=await sql`insert into ims_records(record_no,title,module,status,severity,due_date,description) values(${no},${body.title},${body.module},'Open',${body.severity||'Medium'},${body.due_date||null},${body.description||''}) returning id,record_no,title,module,status,severity,due_date`; return Response.json(rows[0],{status:201})
}
