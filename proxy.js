import { auth } from '@/lib/auth/server'

export default auth.middleware({ loginUrl:'/auth/sign-in' })

export const config = {
  matcher: ['/','/admin/:path*','/api/me','/api/records/:path*','/api/users/:path*','/api/workflows/:path*','/api/audit/:path*','/api/notifications/:path*','/api/evidence/:path*']
}
