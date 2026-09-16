import { db } from '@/lib/db'
export async function GET() {
  try { const sql=db(); const rows=await sql`select current_database() as database, now() as checked_at`; return Response.json({ok:true,provider:'Neon PostgreSQL',...rows[0]}) }
  catch(e) { return Response.json({ok:false,provider:'Neon PostgreSQL',message:e.message},{status:503}) }
}
