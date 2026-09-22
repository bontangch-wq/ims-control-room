'use client'

export default function Error({reset}){
 return <main className="authpage"><section className="authcard"><div className="mark">IMM</div><p className="eyebrow">INTEGRATED MANAGEMENT SYSTEM</p><h1>Aplikasi tidak dapat dimuat</h1><p>Terjadi gangguan saat memuat halaman ini. Data yang sudah tersimpan tidak berubah.</p><div className="authform"><button type="button" onClick={()=>reset()}>Coba Muat Ulang</button><a href="/">Kembali ke Dashboard</a></div><small>Jika sesi Anda telah berakhir, sistem akan mengarahkan kembali ke halaman masuk.</small></section></main>
}
