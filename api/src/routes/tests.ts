import { Hono } from 'hono'
import crypto from 'crypto'
import { getTestsCollection, getTestLinksCollection, getSubscriptionsCollection } from '../db'

const tests = new Hono()

tests.post('/schedule', async (c) => {
  try {
    const { userId } = await c.req.json()
    const subscriptionsCollection = getSubscriptionsCollection()
    const subscription = await subscriptionsCollection.findOne({ userId, status: 'active' })
    if (!subscription) {
      return c.json({ error: 'No active subscription' }, 400)
    }

    let intervalDays = 90
    if (subscription.plan === 'basic') {
      intervalDays = 0
    }

    const scheduledDate = new Date()
    if (intervalDays > 0) {
      scheduledDate.setDate(scheduledDate.getDate() + intervalDays)
    }

    const testsCollection = getTestsCollection()
    const existingPendingTest = await testsCollection.findOne({ userId, status: 'pending' })
    if (existingPendingTest) {
      return c.json({ error: 'Test already scheduled' }, 400)
    }

    const test = {
      userId,
      status: 'pending',
      scheduledDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = await testsCollection.insertOne(test)
    return c.json({ test: { ...test, _id: result.insertedId } })
  } catch (error) {
    console.error('Schedule test error:', error)
    return c.json({ error: 'Failed to schedule test' }, 500)
  }
})

tests.post('/activate/:id', async (c) => {
  try {
    const testsCollection = getTestsCollection()
    const test = await testsCollection.findOne({ _id: c.req.param('id') })
    if (!test) {
      return c.json({ error: 'Test not found' }, 404)
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 15)

    await testsCollection.updateOne(
      { _id: test._id },
      {
        $set: {
          status: 'active',
          activatedAt: new Date(),
          expiresAt,
          updatedAt: new Date(),
        },
      }
    )
    return c.json({ test: { ...test, status: 'active', activatedAt: new Date(), expiresAt } })
  } catch (error) {
    console.error('Activate test error:', error)
    return c.json({ error: 'Failed to activate test' }, 500)
  }
})

tests.post('/submit/:id', async (c) => {
  try {
    const { responses } = await c.req.json()
    const testsCollection = getTestsCollection()
    const test = await testsCollection.findOne({ _id: c.req.param('id') })
    if (!test) {
      return c.json({ error: 'Test not found' }, 404)
    }
    if (test.status !== 'active') {
      return c.json({ error: 'Test is not active' }, 400)
    }
    if (test.expiresAt && new Date() > new Date(test.expiresAt)) {
      await testsCollection.updateOne({ _id: test._id }, { $set: { status: 'expired', updatedAt: new Date() } })
      return c.json({ error: 'Test has expired' }, 400)
    }

    const correctAnswers = { q1: 'b', q2: 'a', q3: 'c', q4: 'd', q5: 'b' }
    let correctCount = 0
    for (const [key, correctAnswer] of Object.entries(correctAnswers)) {
      if (responses[key]?.toLowerCase() === correctAnswer) {
        correctCount++
      }
    }
    const score = Math.round((correctCount / Object.keys(correctAnswers).length) * 100)
    let proficiencyLevel = 'A1'
    if (score >= 80) proficiencyLevel = 'C1'
    else if (score >= 60) proficiencyLevel = 'B2'
    else if (score >= 40) proficiencyLevel = 'B1'

    const feedback = [
      score >= 80 ? 'Excellent performance!' : score >= 60 ? 'Good job!' : 'Keep practicing!',
      `Your score: ${score}%`,
      `Proficiency level: ${proficiencyLevel}`,
    ]

    await testsCollection.updateOne(
      { _id: test._id },
      {
        $set: {
          responses,
          score,
          proficiencyLevel,
          feedback,
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    )

    return c.json({ test: { ...test, responses, score, proficiencyLevel, feedback, status: 'completed' }, score, proficiencyLevel, feedback })
  } catch (error) {
    console.error('Submit test error:', error)
    return c.json({ error: 'Failed to submit test' }, 500)
  }
})

tests.get('/status/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const testsCollection = getTestsCollection()
    const activeTest = await testsCollection.findOne({ userId, status: 'active' })
    const nextTest = await testsCollection.findOne({ userId, status: 'pending' })
    const lastTest = await testsCollection.findOne({ userId, status: 'completed' })

    let daysRemaining = 0
    if (activeTest?.expiresAt) {
      const diff = new Date(activeTest.expiresAt).getTime() - Date.now()
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }

    return c.json({
      currentTest: activeTest ? { id: activeTest._id, expiresIn: daysRemaining } : null,
      nextTest: nextTest?.scheduledDate || null,
      lastTest: lastTest ? { score: lastTest.score, proficiencyLevel: lastTest.proficiencyLevel, completedAt: lastTest.completedAt } : null,
    })
  } catch (error) {
    console.error('Get test status error:', error)
    return c.json({ error: 'Failed to get test status' }, 500)
  }
})

tests.post('/generate-link', async (c) => {
  try {
    const { userId } = await c.req.json()
    const subscriptionsCollection = getSubscriptionsCollection()
    const subscription = await subscriptionsCollection.findOne({ userId, status: 'active' })
    if (!subscription) {
      return c.json({ error: 'No active subscription' }, 400)
    }

    const testsCollection = getTestsCollection()
    let activeTest = await testsCollection.findOne({ userId, status: 'active' })
    if (!activeTest) {
      const pendingTest = await testsCollection.findOne({ userId, status: 'pending' })
      if (!pendingTest) {
        const scheduledDate = new Date()
        scheduledDate.setDate(scheduledDate.getDate() + (subscription.plan === 'basic' ? 30 : 90))
        const result = await testsCollection.insertOne({
          userId,
          status: 'pending',
          scheduledDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        activeTest = await testsCollection.findOne({ _id: result.insertedId })!
      } else {
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 15)
        await testsCollection.updateOne(
          { _id: pendingTest._id },
          { $set: { status: 'active', activatedAt: new Date(), expiresAt, updatedAt: new Date() } }
        )
        activeTest = { ...pendingTest, status: 'active', activatedAt: new Date(), expiresAt } as any
      }
    }

    if (!activeTest) {
      return c.json({ error: 'Failed to create test' }, 500)
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const testLinksCollection = getTestLinksCollection()
    await testLinksCollection.insertOne({
      token,
      testId: activeTest._id.toString(),
      userId,
      used: false,
      expiresAt,
      createdAt: new Date(),
    })

    const baseUrl = process.env.APP_URL || 'http://localhost:5173'
    const testUrl = `${baseUrl}/test/${token}`

    return c.json({
      testLink: testUrl,
      token,
      testId: activeTest._id.toString(),
      expiresAt,
    })
  } catch (error) {
    console.error('Generate test link error:', error)
    return c.json({ error: 'Failed to generate test link' }, 500)
  }
})

tests.get('/verify-link/:token', async (c) => {
  try {
    const token = c.req.param('token')
    const testLinksCollection = getTestLinksCollection()
    const testLink = await testLinksCollection.findOne({ token })
    if (!testLink) {
      return c.json({ error: 'Invalid link', valid: false }, 400)
    }
    if (testLink.used) {
      return c.json({ error: 'Link already used', valid: false }, 400)
    }
    if (new Date() > new Date(testLink.expiresAt)) {
      return c.json({ error: 'Link expired', valid: false }, 400)
    }

    const testsCollection = getTestsCollection()
    const test = await testsCollection.findOne({ _id: testLink.testId })
    if (!test || test.status !== 'active') {
      return c.json({ error: 'Test not available', valid: false }, 400)
    }

    return c.json({ valid: true, testId: testLink.testId })
  } catch (error) {
    console.error('Verify test link error:', error)
    return c.json({ error: 'Failed to verify link', valid: false }, 500)
  }
})

tests.get('/:id', async (c) => {
  try {
    const testsCollection = getTestsCollection()
    const test = await testsCollection.findOne({ _id: c.req.param('id') })
    if (!test) {
      return c.json({ error: 'Test not found' }, 404)
    }
    return c.json({ test })
  } catch (error) {
    console.error('Get test error:', error)
    return c.json({ error: 'Failed to get test' }, 500)
  }
})

tests.get('/', async (c) => {
  try {
    const testsCollection = getTestsCollection()
    const tests = await testsCollection.find().sort({ createdAt: -1 }).limit(50).toArray()
    return c.json({ tests })
  } catch (error) {
    console.error('List tests error:', error)
    return c.json({ error: 'Failed to list tests' }, 500)
  }
})

export default tests
