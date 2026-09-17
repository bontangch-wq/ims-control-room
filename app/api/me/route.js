import { currentAccess } from '@/lib/auth/access'
export async function GET(){
 const access=await currentAccess()
 if(!access.authenticated) return Response.json({authenticated:false},{status:401})
 return Response.json({authenticated:true,user:{id:access.user.id,email:access.user.email,name:access.user.name},profile:access.profile?{id:access.profile.id,full_name:access.profile.full_name,function_name:access.profile.function_name,app_role:access.profile.app_role,active:access.profile.active}:null})
}
