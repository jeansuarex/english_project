import { Hono } from 'hono'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { getExamSessionsCollection, getExamsCollection, getUsersCollection } from '../db'

const sessions = new Hono()

const CreateSessionSchema = z.object({
  userId: z.string(),
})

const SubmitExamSchema = z.object({
  sessionId: z.string(),
  answers: z.record(z.string(), z.string()),
})

sessions.post('/create', async (c) => {
  try {
    const body = await c.req.json()
    const { userId } = CreateSessionSchema.parse(body)

    const usersCollection = getUsersCollection()
    let user = null
    if (typeof userId === 'string') {
      user = await usersCollection.findOne({ _id: userId })
    }
    if (!user) {
      user = await usersCollection.findOne({ clerkId: userId })
    }
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    if ((user.examsRemaining || 0) <= 0) {
      return c.json({ error: 'No exams available. Please upgrade your plan.' }, 403)
    }

    const examsCollection = getExamsCollection()
    const exam = await examsCollection.findOne({ isActive: true })
    if (!exam) {
      return c.json({ error: 'No exam available at the moment' }, 404)
    }

    const sessionToken = nanoid(16)
    const sessionCode = Math.floor(100000 + Math.random() * 900000).toString()

    const sessionsCollection = getExamSessionsCollection()
    const session = {
      userId,
      examId: exam._id.toString(),
      sessionToken,
      sessionCode,
      status: 'pending',
      startedAt: null,
      submittedAt: null,
      answers: {},
      score: null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }

    const result = await sessionsCollection.insertOne(session)
    return c.json({
      id: result.insertedId.toString(),
      sessionToken,
      sessionCode,
      examTitle: exam.title,
      examDuration: exam.duration,
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid data', details: error.errors }, 400)
    }
    console.error('Create session error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

sessions.get('/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const sessionsCollection = getExamSessionsCollection()
    const examsCollection = getExamsCollection()

    const userSessions = await sessionsCollection.find({ userId }).sort({ createdAt: -1 }).toArray()
    const sessionsWithExam = await Promise.all(
      userSessions.map(async (session) => {
        const exam = await examsCollection.findOne({ _id: session.examId })
        return {
          id: session._id.toString(),
          sessionToken: session.sessionToken,
          sessionCode: session.sessionCode,
          examTitle: exam?.title || 'Unknown',
          status: session.status,
          score: session.score,
          createdAt: session.createdAt,
          startedAt: session.startedAt,
          submittedAt: session.submittedAt,
        }
      })
    )

    return c.json(sessionsWithExam)
  } catch (error) {
    console.error('Get user sessions error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

sessions.get('/token/:token', async (c) => {
  try {
    const token = c.req.param('token')
    const sessionsCollection = getExamSessionsCollection()
    const examsCollection = getExamsCollection()

    const session = await sessionsCollection.findOne({
      sessionToken: token,
      expiresAt: { $gt: new Date() },
    })
    if (!session) {
      return c.json({ error: 'Session not found or expired' }, 404)
    }

    const exam = await examsCollection.findOne({ _id: session.examId })
    if (!exam) {
      return c.json({ error: 'Exam not found' }, 404)
    }

    return c.json({
      id: session._id.toString(),
      sessionToken: session.sessionToken,
      examTitle: exam.title,
      examDuration: exam.duration,
      questions: exam.questions,
      status: session.status,
    })
  } catch (error) {
    console.error('Get session by token error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

sessions.post('/start/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const sessionsCollection = getExamSessionsCollection()
    const session = await sessionsCollection.findOne({ _id: id })
    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }
    if (session.status !== 'pending') {
      return c.json({ error: 'Exam already started or completed' }, 400)
    }
    await sessionsCollection.updateOne(
      { _id: id },
      { $set: { status: 'in_progress', startedAt: new Date() } }
    )
    return c.json({ message: 'Exam started', status: 'in_progress' })
  } catch (error) {
    console.error('Start session error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

sessions.post('/submit', async (c) => {
  try {
    const body = await c.req.json()
    const { sessionId, answers } = SubmitExamSchema.parse(body)

    const sessionsCollection = getExamSessionsCollection()
    const session = await sessionsCollection.findOne({ _id: sessionId })
    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }
    if (session.status === 'completed') {
      return c.json({ error: 'Exam already submitted' }, 400)
    }

    const examsCollection = getExamsCollection()
    const exam = await examsCollection.findOne({ _id: session.examId })
    if (!exam) {
      return c.json({ error: 'Exam not found' }, 404)
    }

    let totalPoints = 0
    let earnedPoints = 0
    for (const question of exam.questions) {
      totalPoints += question.points
      const userAnswer = answers[question.id]
      if (question.type === 'essay') {
        if (userAnswer && userAnswer.trim().length > 20) {
          earnedPoints += question.points
        }
      } else if (userAnswer === question.correctAnswer) {
        earnedPoints += question.points
      }
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
    const passed = score >= (exam.passingScore || 70)

    await sessionsCollection.updateOne(
      { _id: sessionId },
      { $set: { status: 'completed', submittedAt: new Date(), answers, score, passed } }
    )

    const usersCollection = getUsersCollection()
    let user = null
    if (typeof session.userId === 'string') {
      user = await usersCollection.findOne({ _id: session.userId })
    }
    if (!user) {
      user = await usersCollection.findOne({ clerkId: session.userId })
    }
    if (user) {
      const newExamsCompleted = (user.examsCompleted || 0) + 1
      const newTotalScore = (user.totalScore || 0) + score
      const newAverageScore = Math.round(newTotalScore / newExamsCompleted)
      const newExamsRemaining = Math.max(0, (user.examsRemaining || 1) - 1)
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            examsCompleted: newExamsCompleted,
            totalScore: newTotalScore,
            averageScore: newAverageScore,
            examsRemaining: newExamsRemaining,
          },
        }
      )
    }

    return c.json({ score, passed, passingScore: exam.passingScore })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid data', details: error.errors }, 400)
    }
    console.error('Submit session error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default sessions
