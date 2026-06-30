import { verifyToken } from '@clerk/backend'
import type { MiddlewareHandler } from 'hono'

export const clerkAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization header' }, 401)
  }
  const token = authHeader.slice(7)
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    })
    ;(c as any).set('clerkUserId', payload.sub)
    ;(c as any).set('clerkUserEmail', payload.email)
    await next()
  } catch (error) {
    console.error('Token verification failed:', error instanceof Error ? error.message : error)
    return c.json({ error: 'Invalid token' }, 401)
  }
}
