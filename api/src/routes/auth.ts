import { Hono } from 'hono'
import { getUsersCollection } from '../db'
import { clerkAuth } from '../middleware/auth'

const auth = new Hono()

auth.get('/me', clerkAuth, async (c) => {
  try {
    const clerkUserId = (c as any).get('clerkUserId')
    const users = getUsersCollection()
    let user = await users.findOne({ clerkId: clerkUserId })

    if (!user) {
      user = {
        _id: clerkUserId,
        clerkId: clerkUserId,
        email: (c as any).get('clerkUserEmail') || '',
        name: (c as any).get('clerkUserEmail') || '',
        createdAt: new Date(),
        role: 'user',
      }
      const userData = { ...user, id: undefined, _id: undefined }
      users.insertOne({ ...userData, _id: clerkUserId, clerkId: clerkUserId })
    }

    return c.json({
      id: user._id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  } catch (error) {
    console.error('Get me error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default auth
