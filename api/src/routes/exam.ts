import { Hono } from 'hono'
import { z } from 'zod'
import { getExamSessionsCollection } from '../db'
import { clerkAuth } from '../middleware/auth'

const exam = new Hono()
exam.use('*', clerkAuth)

exam.post('/session', async (c) => {
  try {
    const userId = c.get('clerkUserId') as string
    const body = await c.req.json()
    const { section } = body

    if (!section || !['reading', 'listening', 'writing', 'speaking'].includes(section)) {
      return c.json({ error: 'Invalid section' }, 400)
    }

    const collection = getExamSessionsCollection()

    const existing = await collection.findOne({ userId })
    const sessionDate = new Date().toISOString().split('T')[0]

    if (existing && existing.sessionDate === sessionDate) {
      const sessionData = JSON.parse(existing[section] || '{}')
      return c.json({
        ok: true,
        sessionId: existing.id,
        existing: true,
        sectionData: sessionData,
      })
    }

    const newSession = {
      userId,
      sessionDate,
      reading: '{}',
      listening: '{}',
      writing: '{}',
      speaking: '{}',
    }

    const result = collection.insertOne(newSession)
    return c.json({
      ok: true,
      sessionId: result.insertedId,
      existing: false,
    })
  } catch (error) {
    console.error('Create exam session error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

const AnswerSchema = z.object({
  questionId: z.string().optional(),
  type: z.string().optional(),
  userAnswer: z.any(),
  correctAnswer: z.number().optional(),
  text: z.string().optional(),
  userAnswerText: z.string().optional(),
})

const SubmitSchema = z.object({
  section: z.enum(['reading', 'listening', 'writing', 'speaking']),
  answers: z.union([
    z.array(AnswerSchema).optional(),
    z.record(z.string()).optional(),
  ]).optional(),
  prompt: z.string().optional(),
  answer: z.string().optional(),
  wordCount: z.number().optional(),
  totalTime: z.number().optional(),
})

exam.post('/submit', async (c) => {
  try {
    const userId = c.get('clerkUserId') as string
    const body = await c.req.json()
    const data = SubmitSchema.parse(body)

    const collection = getExamSessionsCollection()
    const sessionDate = new Date().toISOString().split('T')[0]

    let session = await collection.findOne({ userId, sessionDate })

    const sectionData = {
      submitted: true,
      submittedAt: new Date().toISOString(),
      data: data.answers || data.answer || null,
      wordCount: data.wordCount || null,
      prompt: data.prompt || null,
      totalTime: data.totalTime || null,
    }

    if (!session) {
      const newSession = {
        userId,
        sessionDate,
        reading: data.section === 'reading' ? JSON.stringify(sectionData) : '{}',
        listening: data.section === 'listening' ? JSON.stringify(sectionData) : '{}',
        writing: data.section === 'writing' ? JSON.stringify(sectionData) : '{}',
        speaking: data.section === 'speaking' ? JSON.stringify(sectionData) : '{}',
      }
    const result = await collection.insertOne(newSession)
      return c.json({ ok: true, section: data.section })
    }

    await collection.updateOne(
      { id: session.id },
      { $set: { [data.section]: JSON.stringify(sectionData) } }
    )

    return c.json({ ok: true, section: data.section })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid data', details: error.errors }, 400)
    }
    console.error('Submit error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

exam.get('/history', async (c) => {
  try {
    const userId = c.get('clerkUserId') as string
    const collection = getExamSessionsCollection()

    const sessions = await collection
      .find({ userId })
      .sort({ sessionDate: -1 })
      .limit(30)
      .toArray()

    const result = sessions.map((s: any) => ({
      id: s.id,
      sessionDate: s.sessionDate,
      reading: s.reading ? JSON.parse(s.reading) : null,
      listening: s.listening ? JSON.parse(s.listening) : null,
      writing: s.writing ? JSON.parse(s.writing) : null,
      speaking: s.speaking ? JSON.parse(s.speaking) : null,
    }))

    return c.json(result)
  } catch (error) {
    console.error('Get exam history error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

exam.get('/session/today', async (c) => {
  try {
    const userId = c.get('clerkUserId') as string
    const collection = getExamSessionsCollection()
    const sessionDate = new Date().toISOString().split('T')[0]

    const session = await collection.findOne({ userId, sessionDate })

    if (!session) {
      return c.json({ exists: false })
    }

    return c.json({
      exists: true,
      session: {
        id: session.id,
        sessionDate: session.sessionDate,
        reading: session.reading ? JSON.parse(session.reading) : null,
        listening: session.listening ? JSON.parse(session.listening) : null,
        writing: session.writing ? JSON.parse(session.writing) : null,
        speaking: session.speaking ? JSON.parse(session.speaking) : null,
      },
    })
  } catch (error) {
    console.error('Get today session error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default exam
