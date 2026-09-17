import {S3Client,PutObjectCommand,GetObjectCommand} from '@aws-sdk/client-s3'
import {getSignedUrl} from '@aws-sdk/s3-request-presigner'
const bucket=process.env.NEON_STORAGE_BUCKET||'ims-controlled-documents'
function client(){const endpoint=process.env.NEON_STORAGE_ENDPOINT,accessKeyId=process.env.AWS_ACCESS_KEY_ID,secretAccessKey=process.env.AWS_SECRET_ACCESS_KEY;if(!endpoint||!accessKeyId||!secretAccessKey)throw new Error('storage-not-configured');return new S3Client({endpoint,region:process.env.AWS_REGION||'ap-southeast-1',forcePathStyle:true,credentials:{accessKeyId,secretAccessKey}})}
export async function presignUpload(key,contentType){return getSignedUrl(client(),new PutObjectCommand({Bucket:bucket,Key:key,ContentType:contentType}),{expiresIn:300})}
export async function presignDownload(key,fileName){return getSignedUrl(client(),new GetObjectCommand({Bucket:bucket,Key:key,ResponseContentDisposition:`attachment; filename="${String(fileName||'document').replace(/["\r\n]/g,'_')}"`}),{expiresIn:120})}
export function safeObjectKey(recordId,fileName){const clean=String(fileName||'file').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-160);return `records/${recordId}/${crypto.randomUUID()}-${clean}`}
