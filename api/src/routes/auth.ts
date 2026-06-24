import { Hono } from 'hono'
import { verifyToken } from '@clerk/backend'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { getUsersCollection, getSessionsCollection } from '../db'

const auth = new Hono()

const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000

auth.use('/clerk-auth', async (c, next) => {
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
    return c.json({ error: 'Invalid token' }, 401)
  }
})

auth.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { email, name } = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    }).parse(body)

    const usersCollection = getUsersCollection()
    const existing = await usersCollection.findOne({ email })
    if (existing) {
      return c.json({ error: 'User already exists' }, 400)
    }

    const user = {
      email,
      name,
      createdAt: new Date(),
      plan: 'individual',
      examsRemaining: 0,
      examsCompleted: 0,
      totalScore: 0,
      averageScore: 0,
    }
    const result = await usersCollection.insertOne(user)
    const userId = result.insertedId.toString()

    const sessionToken = nanoid(32)
    const sessions = getSessionsCollection()
    await sessions.insertOne({
      token: sessionToken,
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + SESSION_EXPIRY),
    })

    return c.json({
      id: userId,
      email,
      name,
      plan: user.plan,
      sessionToken,
    }, 201)
  } catch (error) {
    console.error('Register error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { email } = z.object({
      email: z.string().email(),
    }).parse(body)

    const usersCollection = getUsersCollection()
    const user = await usersCollection.findOne({ email })
    if (!user) {
      return c.json({ error: 'User not found. Please register first.' }, 404)
    }

    const sessionToken = nanoid(32)
    const sessions = getSessionsCollection()
    await sessions.insertOne({
      token: sessionToken,
      userId: user._id.toString(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + SESSION_EXPIRY),
    })

    return c.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      plan: user.plan,
      sessionToken,
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

auth.post('/logout', async (c) => {
  try {
    const { sessionToken } = await c.req.json()
    const sessions = getSessionsCollection()
    await sessions.deleteOne({ token: sessionToken })
    return c.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

auth.get('/me', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const sessions = getSessionsCollection()
    const session = await sessions.findOne({
      token,
      expiresAt: { $gt: new Date() },
    })
    if (!session) {
      return c.json({ error: 'Session expired' }, 401)
    }
    const users = getUsersCollection()
    const user = await users.findOne({ _id: session.userId })
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    return c.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      plan: user.plan,
      examsRemaining: user.examsRemaining,
      examsCompleted: user.examsCompleted,
      averageScore: user.averageScore,
    })
  } catch (error) {
    console.error('Get me error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default auth
