import { createAuthClient } from '@neondatabase/neon-js/auth'

const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL

if (!authUrl) {
  throw new Error('Neon Auth URL is not configured')
}

export const authClient = createAuthClient(authUrl)
