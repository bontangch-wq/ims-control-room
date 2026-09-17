import {db} from '@/lib/db'
import {requireAccess} from '@/lib/auth/access'
import {presignUpload} from '@/lib/storage'
const WRITE=['Super Admin','IMS Admin','Auditor','Function Owner']
const MAX_SIZE=25*1024*1024
const SAFE_TYPES=['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
export async function POST(req){
 const access=await requireAccess(WRITE);if(!access.ok)return access.response
 const b=await req.json();if(!b.record_id||!b.file_name)return Response.json({error:'record_id and file_name are required'},{status:400})
 if(Number(b.file_size||0)>MAX_SIZE)return Response.json({error:'File maximum is 25 MB'},{status:413})
 if(b.mime_type&&!SAFE_TYPES.includes(b.mime_type))return Response.json({error:'File type is not allowed'},{status:415})
 const sql=db(),record=(await sql`select id,record_no from ims_records where id=${b.record_id} limit 1`)[0];if(!record)return Response.json({error:'record not found'},{status:404})
 const safe=String(b.file_name).replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-160),key=`records/${record.id}/${crypto.randomUUID()}-${safe}`
 try{const upload_url=await presignUpload(key,b.mime_type||'application/octet-stream');return Response.json({upload_url,storage_path:key,expires_in:300})}catch(e){return Response.json({error:'Secure storage is not configured',detail:e.message},{status:503})}
}
