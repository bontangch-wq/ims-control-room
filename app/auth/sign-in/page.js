import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/server'
import { signIn, activateAccount } from '@/app/actions'

export const dynamic='force-dynamic'
export default async function SignIn({searchParams}){
 const {data:session}=await auth.getSession(); if(session?.user) redirect('/')
 const p=await searchParams; const error=p?.error; const activate=p?.activate==='1'
 return <main className="authpage"><section className="authcard"><div className="mark">IMM</div><p className="eyebrow">PT INDOMINCO MANDIRI</p><h1>Integrated Management System</h1><p>{activate?'Aktifkan akun yang telah disiapkan oleh administrator.':'Masuk untuk mengakses Control Room sesuai kewenangan Anda.'}</p>{error&&<div className="autherror">{error}</div>}{activate?<form action={activateAccount} className="authform"><label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Password baru<input name="password" type="password" autoComplete="new-password" minLength={8} required/></label><label>Konfirmasi password<input name="confirm_password" type="password" autoComplete="new-password" minLength={8} required/></label><button type="submit">Aktifkan Akun</button><a href="/auth/sign-in">Kembali ke Masuk</a></form>:<form action={signIn} className="authform"><label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><button type="submit">Masuk</button><a href="/auth/sign-in?activate=1">Aktivasi Akun Pertama</a></form>}<small>Akses aplikasi, administrasi, approval dan dokumen dikendalikan berdasarkan role.</small></section></main>
}
