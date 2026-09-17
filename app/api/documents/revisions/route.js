import { db } from '@/lib/db'
import { requireAccess } from '@/lib/auth/access'
const WRITE=['Super Admin','IMS Admin','Auditor','Function Owner']

export async function POST(req){
 const access=await requireAccess(WRITE); if(!access.ok)return access.response
 const b=await req.json(); if(!b.source_record_id||!b.revision)return Response.json({error:'source_record_id and revision are required'},{status:400})
 const sql=db(); const source=(await sql`select r.id,r.record_no,r.title,r.severity,r.description,d.id document_id,d.document_number,d.document_type,d.revision,d.retention,d.classification,d.document_status from ims_records r join controlled_documents d on d.record_id=r.id where r.id=${b.source_record_id} limit 1`)[0]; if(!source)return Response.json({error:'controlled document not found'},{status:404})
 if(source.document_status!=='Effective')return Response.json({error:'Only Effective documents can be revised'},{status:409})
 if(source.revision===String(b.revision))return Response.json({error:'New revision must differ from current revision'},{status:400})
 const no=`IMS-${Date.now().toString().slice(-8)}`
 try{
  const record=(await sql`insert into ims_records(record_no,title,module,status,severity,description,created_by) values(${no},${b.title||source.title},'Document & Record Control','Open',${source.severity},${b.description||source.description||''},${access.profile.id}) returning id,record_no,title,status`)[0]
  const doc=(await sql`insert into controlled_documents(record_id,document_number,document_type,revision,retention,classification,document_status,supersedes_id) values(${record.id},${source.document_number},${source.document_type},${String(b.revision)},${source.retention},${source.classification},'Draft',${source.document_id}) returning id,document_number,revision,document_status`)[0]
  await sql`insert into workflow_history(record_id,from_status,to_status,note,actor_id) values(${record.id},null,'Open',${`Revision ${doc.revision} created from ${source.document_number} Rev ${source.revision}`},${access.profile.id})`
  await sql`insert into audit_log(actor_id,action,entity_type,entity_id,detail) values(${access.profile.id},'CREATE_REVISION','controlled_document',${String(doc.id)},${JSON.stringify({document_number:source.document_number,from_revision:source.revision,to_revision:doc.revision,supersedes_id:source.document_id})}::jsonb)`
  return Response.json({record,document:doc},{status:201})
 }catch(e){if(String(e?.message||'').includes('uq_controlled_documents_number_revision'))return Response.json({error:'This document revision already exists'},{status:409});throw e}
}
