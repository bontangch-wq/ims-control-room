'use server'
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export async function signIn(formData){
 const email=String(formData.get('email')||'').trim(); const password=String(formData.get('password')||'')
 if(!email||!password) redirect('/auth/sign-in?error=Email+dan+password+wajib+diisi')
 const {error}=await auth.signIn.email({email,password})
 if(error) redirect(`/auth/sign-in?error=${encodeURIComponent(error.message||'Sign in gagal')}`)
 redirect('/')
}
export async function signOut(){ await auth.signOut(); redirect('/auth/sign-in') }
