import { Hono } from 'hono'
import { z } from 'zod'
import { getUsersCollection } from '../db'
import { clerkAuth } from '../middleware/auth'

const users = new Hono()
users.use('*', clerkAuth)

const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
})

users.get('/', async (c) => {
  try {
    const usersCollection = getUsersCollection()
    const allUsers = await usersCollection.find({}).toArray()
    return c.json(allUsers)
  } catch (error) {
    console.error('Get users error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

users.get('/count', async (c) => {
  try {
    const usersCollection = getUsersCollection()
    const count = await usersCollection.countDocuments()
    return c.json({ count })
  } catch (error) {
    console.error('Count users error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})



users.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const usersCollection = getUsersCollection()
    let user = await usersCollection.findOne({ _id: id })
    if (!user) {
      user = await usersCollection.findOne({ clerkId: id })
    }
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    return c.json(user)
  } catch (error) {
    console.error('Get user error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

users.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = UpdateUserSchema.parse(body)
    const usersCollection = getUsersCollection()
    const result = await usersCollection.findOneAndUpdate(
      { _id: id },
      { $set: data },
      { returnDocument: 'after' }
    )
    if (!result) {
      return c.json({ error: 'User not found' }, 404)
    }
    return c.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid data', details: error.errors }, 400)
    }
    console.error('Update user error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

users.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const usersCollection = getUsersCollection()
    const result = await usersCollection.deleteOne({ _id: id })
    if (result.deletedCount === 0) {
      return c.json({ error: 'User not found' }, 404)
    }
    return c.json({ message: 'User deleted' })
  } catch (error) {
    console.error('Delete user error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default users
