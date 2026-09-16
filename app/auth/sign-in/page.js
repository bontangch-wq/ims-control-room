import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/server'
import { signIn } from '@/app/actions'

export const dynamic='force-dynamic'
export default async function SignIn({searchParams}){
 const {data:session}=await auth.getSession(); if(session?.user) redirect('/')
 const p=await searchParams; const error=p?.error
 return <main className="authpage"><section className="authcard"><div className="mark">IMM</div><p className="eyebrow">PT INDOMINCO MANDIRI</p><h1>Integrated Management System</h1><p>Masuk untuk mengakses Control Room sesuai kewenangan Anda.</p>{error&&<div className="autherror">{error}</div>}<form action={signIn} className="authform"><label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><button type="submit">Masuk</button></form><small>Akses aplikasi, administrasi, approval dan dokumen dikendalikan berdasarkan role.</small></section></main>
}
