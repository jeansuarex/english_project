import { Hono } from 'hono'
import { z } from 'zod'
import { getUsersCollection, getSubscriptionsCollection, getTestsCollection, getAttemptsCollection } from '../db'

const users = new Hono()

const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  plan: z.enum(['individual', 'anthology', 'globe']).nullable().optional(),
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

users.get('/status/:id', async (c) => {
  try {
    const userId = c.req.param('id')
    const usersCollection = getUsersCollection()
    let user = await usersCollection.findOne({ _id: userId })
    if (!user) {
      user = await usersCollection.findOne({ clerkId: userId })
    }
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    const subscriptionsCollection = getSubscriptionsCollection()
    const subscription = await subscriptionsCollection.findOne({ userId, status: 'active' })
    const testsCollection = getTestsCollection()
    const activeTest = await testsCollection.findOne({ userId, status: 'active' })
    const pendingTest = await testsCollection.findOne({ userId, status: 'pending' })
    const lastCompletedTest = await testsCollection.findOne({ userId, status: 'completed' })

    let daysRemaining = 0
    let testAvailable = false
    let testStatus = 'locked'

    if (activeTest?.expiresAt) {
      const diff = new Date(activeTest.expiresAt).getTime() - Date.now()
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
      testAvailable = true
      testStatus = 'active'
    } else if (pendingTest) {
      const now = new Date()
      const scheduled = new Date(pendingTest.scheduledDate)
      if (now >= scheduled) {
        testAvailable = true
        testStatus = 'ready'
      } else {
        const daysUntil = Math.ceil((scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        testStatus = `scheduled:${daysUntil}`
      }
    }

    let subscriptionInfo = null
    if (subscription) {
      const planLimits: Record<string, { tests: number; intervalDays: number }> = {
        basic: { tests: 1, intervalDays: 0 },
        annual: { tests: 4, intervalDays: 90 },
        enterprise: { tests: 999, intervalDays: 30 },
      }
      const limits = planLimits[subscription.plan as string] || { tests: 0, intervalDays: 0 }
      subscriptionInfo = {
        plan: subscription.plan,
        status: subscription.status,
        testsUsed: await testsCollection.countDocuments({ userId, status: 'completed' }),
        testsAllowed: limits.tests,
        nextTestDate: pendingTest?.scheduledDate || null,
        daysUntilNextTest: pendingTest
          ? Math.ceil((new Date(pendingTest.scheduledDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      }
    }

    return c.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
      },
      subscription: subscriptionInfo,
      testStatus: {
        current: activeTest ? {
          id: activeTest._id,
          expiresIn: daysRemaining,
          expiresAt: activeTest.expiresAt,
        } : null,
        next: pendingTest ? {
          id: pendingTest._id,
          scheduledDate: pendingTest.scheduledDate,
          daysUntil: Math.ceil((new Date(pendingTest.scheduledDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        } : null,
        lastCompleted: lastCompletedTest ? {
          score: lastCompletedTest.score,
          proficiencyLevel: lastCompletedTest.proficiencyLevel,
          completedAt: lastCompletedTest.completedAt,
        } : null,
        status: testStatus,
        available: testAvailable,
      },
    })
  } catch (error) {
    console.error('Get user status error:', error)
    return c.json({ error: 'Failed to get user status' }, 500)
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
    const attemptsCollection = getAttemptsCollection()
    const userAttempts = await attemptsCollection.find({ userId: id }).toArray()
    return c.json({ ...user, attempts: userAttempts })
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
