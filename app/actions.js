'use server'
import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'

export async function signIn(formData){
 const email=String(formData.get('email')||'').trim().toLowerCase(); const password=String(formData.get('password')||'')
 if(!email||!password) redirect('/auth/sign-in?error=Email+dan+password+wajib+diisi')
 const {error}=await auth.signIn.email({email,password})
 if(error) redirect(`/auth/sign-in?error=${encodeURIComponent(error.message||'Sign in gagal')}`)
 redirect('/')
}
export async function activateAccount(formData){
 const email=String(formData.get('email')||'').trim().toLowerCase(); const password=String(formData.get('password')||''); const confirm=String(formData.get('confirm_password')||'')
 if(!email||!password) redirect('/auth/sign-in?activate=1&error=Email+dan+password+wajib+diisi')
 if(password.length<8) redirect('/auth/sign-in?activate=1&error=Password+minimal+8+karakter')
 if(password!==confirm) redirect('/auth/sign-in?activate=1&error=Konfirmasi+password+tidak+sama')
 const sql=db()
 const provisioned=(await sql`select id,email,full_name,active,auth_user_id from app_users where lower(email)=${email} limit 1`)[0]
 if(!provisioned||!provisioned.active) redirect('/auth/sign-in?activate=1&error=Akun+belum+diizinkan+oleh+administrator')
 if(provisioned.auth_user_id) redirect('/auth/sign-in?error=Akun+sudah+aktif.+Silakan+masuk')
 const {data,error}=await auth.signUp.email({email,password,name:provisioned.full_name})
 if(error) redirect(`/auth/sign-in?activate=1&error=${encodeURIComponent(error.message||'Aktivasi akun gagal')}`)
 const authUserId=data?.user?.id
 if(!authUserId) redirect('/auth/sign-in?activate=1&error=Aktivasi+akun+belum+selesai')
 const linked=await sql`update app_users set auth_user_id=${authUserId} where id=${provisioned.id} and auth_user_id is null returning id`
 if(!linked.length){ try{await auth.signOut()}catch{}; redirect('/auth/sign-in?error=Akun+sudah+diaktifkan+dari+sesi+lain') }
 redirect('/')
}
export async function signOut(){ await auth.signOut(); redirect('/auth/sign-in') }
