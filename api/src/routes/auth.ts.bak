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
      await users.insertOne({ ...userData, _id: clerkUserId, clerkId: clerkUserId })
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

auth.post('/sync', clerkAuth, async (c) => {
  try {
    const clerkUserId = (c as any).get('clerkUserId')
    const { email, name } = await c.req.json()
    const users = getUsersCollection()

    const user = await users.findOne({ clerkId: clerkUserId })
    if (user) {
      await users.updateOne({ clerkId: clerkUserId }, { $set: { email, name } })
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Sync error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default auth
