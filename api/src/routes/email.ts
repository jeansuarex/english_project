import { Hono } from 'hono'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { getMagicLinksCollection, getExamsCollection } from '../db'
import { sendMagicLinkEmail } from './email-service'

const email = new Hono()

const APP_URL = process.env.APP_URL || 'http://localhost:5173'

const SendMagicLinkSchema = z.object({
  examId: z.string(),
  email: z.string().email(),
})

email.post('/send-magic-link', async (c) => {
  try {
    const body = await c.req.json()
    const data = SendMagicLinkSchema.parse(body)

    const examsCollection = getExamsCollection()
    const exam = await examsCollection.findOne({ _id: data.examId })
    if (!exam) {
      return c.json({ error: 'Exam not found' }, 404)
    }

    const token = nanoid(32)
    const magicLink = {
      token,
      examId: data.examId,
      email: data.email,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      used: false,
    }

    const magicLinksCollection = getMagicLinksCollection()
    await magicLinksCollection.insertOne(magicLink)

    const examUrl = `${APP_URL}/exam/${token}`

    if (process.env.RESEND_API_KEY) {
      await sendMagicLinkEmail({ to: data.email, examTitle: exam.title, examUrl })
    } else {
      console.log(`[MOCK EMAIL] Sending magic link to ${data.email}`)
      console.log(`[MOCK EMAIL] Exam link: ${examUrl}`)
    }

    return c.json({
      message: 'Magic link sent successfully',
      ...(process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY
        ? { examUrl }
        : {}),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid data', details: error.errors }, 400)
    }
    console.error('Send magic link error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

email.get('/verify/:token', async (c) => {
  try {
    const token = c.req.param('token')
    const magicLinksCollection = getMagicLinksCollection()
    const magicLink = await magicLinksCollection.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    })
    if (!magicLink) {
      return c.json({ error: 'Invalid or expired magic link' }, 400)
    }
    const examsCollection = getExamsCollection()
    const exam = await examsCollection.findOne({ _id: magicLink.examId })
    if (!exam) {
      return c.json({ error: 'Exam not found' }, 404)
    }
    return c.json({ valid: true, examId: magicLink.examId, examTitle: exam.title, email: magicLink.email })
  } catch (error) {
    console.error('Verify magic link error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

email.post('/use/:token', async (c) => {
  try {
    const token = c.req.param('token')
    const magicLinksCollection = getMagicLinksCollection()
    const result = await magicLinksCollection.findOneAndUpdate(
      { token, used: false },
      { $set: { used: true, usedAt: new Date() } }
    )
    if (!result) {
      return c.json({ error: 'Invalid or already used magic link' }, 400)
    }
    return c.json({ message: 'Magic link marked as used' })
  } catch (error) {
    console.error('Use magic link error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default email
