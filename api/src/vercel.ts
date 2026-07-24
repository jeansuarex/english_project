import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { connectDB, getUsersCollection, getSessionsCollection, getVerificationCodesCollection, getResourcesCollection, getReadingSessionsCollection, getStudyActivityCollection, getLearnedWordsCollection, getGameSessionsCollection, getExamSessionsCollection, getPurchasesCollection, getStripeEventsCollection, getSubscriptionTransactionsCollection, getBookedSessionsCollection, getOffersCollection, getOutputHistoryCollection } from './db.postgres'
import { clerkAuth, adminAuth } from './middleware/auth'
import Stripe from 'stripe'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-06-24.dahlia'
})

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  credentials: true,
}))

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ============= AUTH ROUTES =============
app.get('/api/auth/me', clerkAuth, async (c) => {
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

app.post('/api/auth/sync', clerkAuth, async (c) => {
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

// ============= USERS ROUTES =============
const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
})

app.get('/api/users/', clerkAuth, async (c) => {
  try {
    const usersCollection = getUsersCollection()
    const allUsers = await usersCollection.find({}).toArray()
    return c.json(allUsers)
  } catch (error) {
    console.error('Get users error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/users/count', clerkAuth, async (c) => {
  try {
    const usersCollection = getUsersCollection()
    const count = await usersCollection.countDocuments()
    return c.json({ count })
  } catch (error) {
    console.error('Count users error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/users/:id', clerkAuth, async (c) => {
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

app.put('/api/users/:id', clerkAuth, async (c) => {
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

app.delete('/api/users/:id', clerkAuth, async (c) => {
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

// ============= RESOURCES ROUTES =============
function getUserId(c: any): string {
  return (c as any).get('clerkUserId')
}

function genId(): string {
  return randomBytes(12).toString('hex')
}

app.post('/api/resources/upload', clerkAuth, async (c) => {
  try {
    const contentType = c.req.header('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return c.json({ error: 'Content-Type must be multipart/form-data' }, 400)
    }

    const body = await c.req.parseBody()
    const file = body['file'] as File | undefined
    const title = body['title'] as string | undefined

    if (!file) {
      return c.json({ error: 'File is required' }, 400)
    }

    if (file.type !== 'application/pdf') {
      return c.json({ error: 'Only PDF files are allowed' }, 400)
    }

    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: 'File size must be under 5MB' }, 400)
    }

    const userId = getUserId(c)

    const resourcesCollection = getResourcesCollection()
    const count = await resourcesCollection.countDocuments({ userId })
    if (count >= 5) {
      return c.json({ error: 'Maximum 5 PDFs per user' }, 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const resource = {
      userId,
      title: title || file.name,
      filename: file.name,
      data: buffer,
      createdAt: new Date(),
    }

    const result = await resourcesCollection.insertOne(resource)

    return c.json({
      id: result.insertedId,
      title: resource.title,
      filename: resource.filename,
      createdAt: resource.createdAt,
    }, 201)
  } catch (error) {
    console.error('Upload error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/resources/', clerkAuth, async (c) => {
  try {
    const userId = getUserId(c)
    const resourcesCollection = getResourcesCollection()
    const items = await resourcesCollection.find({ userId }).sort({ createdAt: -1 }).toArray()

    return c.json(items.map((r: any) => ({
      id: r._id,
      title: r.title,
      filename: r.filename,
      createdAt: r.createdAt,
    })))
  } catch (error) {
    console.error('List resources error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/resources/:id', clerkAuth, async (c) => {
  try {
    const id = c.req.param('id')
    const resourcesCollection = getResourcesCollection()
    const resource = await resourcesCollection.findOne({ _id: id })

    if (!resource) {
      return c.json({ error: 'Resource not found' }, 404)
    }

    return c.json({
      id: resource._id,
      title: resource.title,
      filename: resource.filename,
      createdAt: resource.createdAt,
    })
  } catch (error) {
    console.error('Get resource error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.delete('/api/resources/:id', clerkAuth, async (c) => {
  try {
    const id = c.req.param('id')
    const userId = getUserId(c)
    const resourcesCollection = getResourcesCollection()
    const resource = await resourcesCollection.findOne({ _id: id })

    if (!resource) {
      return c.json({ error: 'Resource not found' }, 404)
    }

    if (resource.userId !== userId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    await resourcesCollection.deleteOne({ _id: id })

    return c.json({ message: 'Resource deleted' })
  } catch (error) {
    console.error('Delete resource error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/resources/:id/file', clerkAuth, async (c) => {
  try {
    const id = c.req.param('id')
    const userId = getUserId(c)
    const resourcesCollection = getResourcesCollection()
    const resource = await resourcesCollection.findOne({ _id: id })

    if (!resource) {
      return c.json({ error: 'Resource not found' }, 404)
    }

    if (resource.userId !== userId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    if (!resource.data) {
      return c.json({ error: 'File data not found' }, 404)
    }

    const buffer = resource.data.buffer || resource.data

    return c.newResponse(buffer, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${resource.filename}"`,
      'Content-Length': (buffer.length || buffer.byteLength).toString(),
    })
  } catch (error) {
    console.error('Serve file error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/resources/vocabulary', clerkAuth, async (c) => {
  try {
    const userId = getUserId(c)
    const sessionsCollection = getReadingSessionsCollection()
    const sessions = await sessionsCollection.find({ userId }).toArray()
    const allWords = new Set<string>()
    for (const session of sessions) {
      const words: string[] = session.vocabulary || []
      for (const word of words) {
        if (word) allWords.add(word)
      }
    }
    return c.json([...allWords].sort())
  } catch (error) {
    console.error('Get vocabulary error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

const SaveReadingSchema = z.object({
  resourceId: z.string(),
  vocabulary: z.array(z.string()),
  lastPage: z.number().optional(),
})

app.post('/api/resources/reading/save', clerkAuth, async (c) => {
  try {
    const userId = getUserId(c)
    const body = await c.req.json()
    const { resourceId, vocabulary, lastPage } = SaveReadingSchema.parse(body)

    const sessionsCollection = getReadingSessionsCollection()
    const existing = await sessionsCollection.findOne({ userId, resourceId })

    if (existing) {
      await sessionsCollection.updateOne(
        { _id: existing._id },
        { $set: { vocabulary, lastPage: lastPage || 1, updatedAt: new Date() } }
      )
      return c.json({ message: 'Reading session updated' })
    }

    await sessionsCollection.insertOne({
      userId,
      resourceId,
      vocabulary,
      lastPage: lastPage || 1,
      updatedAt: new Date(),
    })

    return c.json({ message: 'Reading session created' }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid data', details: error.errors }, 400)
    }
    console.error('Save reading error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/resources/reading/:resourceId', clerkAuth, async (c) => {
  try {
    const resourceId = c.req.param('resourceId')
    const userId = getUserId(c)
    const sessionsCollection = getReadingSessionsCollection()
    const session = await sessionsCollection.findOne({ userId, resourceId })

    if (!session) {
      return c.json({ vocabulary: [], lastPage: 1 })
    }

    return c.json({
      vocabulary: session.vocabulary || [],
      lastPage: session.lastPage || 1,
      updatedAt: session.updatedAt,
    })
  } catch (error) {
    console.error('Load reading error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============= ACTIVITY ROUTES =============
app.post('/api/activity/log', clerkAuth, async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
    const today = new Date().toISOString().slice(0, 10)
    const collection = getStudyActivityCollection()
    const existing = await collection.findOne({ userId, date: today })
    if (existing) {
      await collection.updateOne({ userId, date: today }, { $set: { count: existing.count + 1 } })
    } else {
      await collection.insertOne({ userId, date: today, count: 1 })
    }
    return c.json({ ok: true })
  } catch (error) {
    console.error('Log activity error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/activity/', clerkAuth, async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
    const days = Math.min(365, Math.max(1, parseInt(c.req.query('days') || '365', 10)))
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString().slice(0, 10)
    const collection = getStudyActivityCollection()
    const rows = await collection.find({ userId, date: { $gte: sinceStr } }).toArray()
    return c.json(rows.map((r: any) => ({ date: r.date, count: r.count })))
  } catch (error) {
    console.error('Get activity error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============= VOCABULARY ROUTES =============
app.get('/api/vocabulary/learned', clerkAuth, async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
    const collection = getLearnedWordsCollection()
    const rows = await collection.find({ userId }).sort({ learnedAt: -1 }).toArray()
    return c.json(rows.map((r: any) => ({ word: r.word, learnedAt: r.learnedAt })))
  } catch (error) {
    console.error('Get learned words error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.post('/api/vocabulary/learn', clerkAuth, async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
    const { word } = await c.req.json()
    if (!word || typeof word !== 'string') {
      return c.json({ error: 'Word is required' }, 400)
    }
    const cleaned = word.trim().toLowerCase()
    if (!cleaned) return c.json({ error: 'Invalid word' }, 400)

    const collection = getLearnedWordsCollection()
    const existing = await collection.findOne({ userId, word: cleaned })
    if (!existing) {
      await collection.insertOne({ userId, word: cleaned, learnedAt: new Date().toISOString() })
    }
    return c.json({ word: cleaned, learnedAt: existing?.learnedAt || new Date().toISOString() })
  } catch (error) {
    console.error('Learn word error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.delete('/api/vocabulary/learn', clerkAuth, async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
    const { word } = await c.req.json()
    if (!word || typeof word !== 'string') {
      return c.json({ error: 'Word is required' }, 400)
    }
    const cleaned = word.trim().toLowerCase()
    if (!cleaned) return c.json({ error: 'Invalid word' }, 400)

    const collection = getLearnedWordsCollection()
    await collection.deleteOne({ userId, word: cleaned })
    return c.json({ message: 'Word unlearned' })
  } catch (error) {
    console.error('Unlearn word error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============= PROGRESS ROUTES =============
const GameSessionSchema = z.object({
  gameType: z.enum(['listening', 'definitions', 'transformations', 'phrasal-verbs']),
  correct: z.number().int().min(0),
  wrong: z.number().int().min(0),
  totalRounds: z.number().int().min(1),
})

const BADGE_DEFS = [
  { id: 'vocab', name: 'Wordsmith', icon: '/images/WORDSMITH', desc: 'Add words to your vocabulary', bronze: 10, silver: 50, gold: 200, unit: 'words' },
  { id: 'definitions', name: 'Definition Ace', icon: '📝', desc: 'Complete definition rounds', bronze: 5, silver: 25, gold: 100, unit: 'rounds' },
  { id: 'transformations', name: 'Transformer', icon: '🔄', desc: 'Complete transformation rounds', bronze: 5, silver: 25, gold: 100, unit: 'rounds' },
  { id: 'listening', name: 'Listener', icon: '🎧', desc: 'Complete listening rounds', bronze: 5, silver: 25, gold: 100, unit: 'rounds' },
  { id: 'phrasal', name: 'Phrasal Pro', icon: '⭐', desc: 'Perfect phrasal verb rounds', bronze: 3, silver: 10, gold: 30, unit: 'perfect rounds' },
] as const

app.post('/api/progress/game-session', clerkAuth, async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
    const body = await c.req.json()
    const data = GameSessionSchema.parse(body)
    const collection = getGameSessionsCollection()
    await collection.insertOne({
      userId,
      gameType: data.gameType,
      correct: data.correct,
      wrong: data.wrong,
      totalRounds: data.totalRounds,
      completedAt: new Date().toISOString(),
    })
    return c.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid data', details: error.errors }, 400)
    }
    console.error('Save game session error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/progress/badges', clerkAuth, async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')

    const readingCollection = getReadingSessionsCollection()
    const sessions = await readingCollection.find({ userId }).toArray()
    const allWords = new Set<string>()
    for (const s of sessions) {
      const words: string[] = s.vocabulary || []
      for (const w of words) if (w) allWords.add(w)
    }
    const vocabCount = allWords.size

    const gamesCollection = getGameSessionsCollection()
    const allGames = await gamesCollection.find({ userId }).toArray()

    const defCount = allGames.filter((g: any) => g.gameType === 'definitions').length
    const transformCount = allGames.filter((g: any) => g.gameType === 'transformations').length
    const listenCount = allGames.filter((g: any) => g.gameType === 'listening').length
    const perfectPhrasal = allGames.filter((g: any) => g.gameType === 'phrasal-verbs' && g.wrong === 0).length

    const current: Record<string, number> = {
      vocab: vocabCount,
      definitions: defCount,
      transformations: transformCount,
      listening: listenCount,
      phrasal: perfectPhrasal,
    }

    return c.json(
      BADGE_DEFS.map((badge) => ({
        ...badge,
        current: current[badge.id] || 0,
      }))
    )
  } catch (error) {
    console.error('Get badges error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============= OUTPUT (AI) ROUTES =============
function genOutputId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

interface QnA {
  question: string
  answer: string
}

interface AnalyzeRequest {
  answers: QnA[]
}

app.post('/api/output/analyze', clerkAuth, async (c) => {
  const { answers } = await c.req.json<AnalyzeRequest>()

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return c.json({ error: 'No answers provided' }, 400)
  }

  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) {
    return c.json({ error: 'Minimax API key not configured' }, 500)
  }

  const formattedAnswers = answers
    .map((a, i) => `Question ${i + 1}: ${a.question}\nAnswer: ${a.answer}`)
    .join('\n\n')

  const systemPrompt = `You are a strict, expert English language evaluator specializing in CEFR (Common European Framework of Reference) levels. Your evaluations must be accurate and honest. Do NOT inflate scores.

CEFR Level Definitions (be strict!):
- C2: Native-like fluency. Complex ideas expressed effortlessly. Near-perfect grammar, vocabulary, and coherence. Can handle abstract, academic, and specialized topics with complete mastery.
- C1: Advanced but not native-like. Can express complex ideas clearly. Good range of vocabulary and complex grammatical structures. May have occasional minor errors that don't impede communication.
- B2: Upper-intermediate. Can express opinions and discuss topics reasonably clearly. Vocabulary is adequate but not rich. Some grammatical errors present but communication is generally effective.
- B1: Intermediate. Basic sentences with limited vocabulary. Frequent grammatical errors that sometimes impede understanding. Simple ideas expressed but lacks complexity and fluency.
- A2: Basic. Very simple sentences. Frequent errors that significantly impede communication. Limited to predictable, routine situations.
- A1: Beginner. Can only produce isolated words or very short phrases.

Evaluation Criteria (apply strictly):
1. Grammar: Count errors. 0-1 minor errors = C+, frequent errors = B or lower
2. Vocabulary: Rich and varied = C+, repetitive/basic = B or lower
3. Coherence: Logical flow, transitions = C+, choppy/disconnected = B or lower
4. Complexity: Complex sentences with clauses = C+, mostly simple sentences = B or lower
5. Task Achievement: Fully addresses prompt = C+, partially or superficially = B or lower

IMPORTANT: Be HONEST. Most non-native speakers are B1-B2. If the answer has frequent errors, simple vocabulary, and choppy sentences, rate it B1. Do NOT give B2 or higher to avoid disappointing users - that harms their learning.

Respond ONLY with a valid JSON object in this exact format, no markdown, no extra text:
{
  "level": "A1" | "A2" | "B1" | "B2" | "C1" | "C2" (your strict CEFR estimate based on all answers),
  "levelReason": "A brief 1-2 sentence explanation of why you assigned this level, mentioning specific weaknesses)",
  "feedback": [
    {
      "question": "the question text",
      "strengths": "what the user did well (1-2 sentences, be specific)",
      "improvements": "specific constructive feedback on grammar, vocabulary, or expression (2-3 sentences, be harsh and specific about errors)",
      "example": "an improved version of part of their answer, or an example sentence relevant to the question (in quotes)"
    }
  ],
  "overallFeedback": "2-3 sentences of general advice on what to focus on next, be specific about weaknesses"
}`

  const userPrompt = `Please evaluate these answers to English language questions:\n\n${formattedAnswers}`

  try {
    const response = await fetch('https://api.minimaxi.chat/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Minimax API error:', response.status, errorText)
      return c.json({ error: 'AI analysis service unavailable' }, 503)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return c.json({ error: 'No response from AI' }, 500)
    }

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      console.error('Failed to parse AI response as JSON:', content)
      return c.json({ error: 'Failed to parse AI response' }, 500)
    }

    try {
      const historyCollection = getOutputHistoryCollection()
      const userId = (c as any).get('clerkUserId')

      for (const answer of answers) {
        const feedbackItem = parsed.feedback?.find((f: any) => f.question === answer.question)
        await historyCollection.insertOne({
          id: genOutputId(),
          userId,
          question: answer.question,
          level: parsed.level,
          levelReason: parsed.levelReason || '',
          feedback: JSON.stringify(feedbackItem || {}),
          completedAt: new Date().toISOString()
        })
      }
    } catch (err) {
      console.error('Failed to save to history:', err)
    }

    return c.json(parsed)
  } catch (error) {
    console.error('Analyze error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/output/history', clerkAuth, async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
    const historyCollection = getOutputHistoryCollection()

    const history = await historyCollection
      .find({ userId })
      .sort({ completedAt: -1 })
      .limit(50)
      .toArray()

    return c.json(history.map((h: any) => ({
      id: h.id,
      question: h.question,
      level: h.level,
      levelReason: h.levelReason,
      completedAt: h.completedAt
    })))
  } catch (error) {
    console.error('Get output history error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============= EXAM ROUTES =============
app.post('/api/exam/session', clerkAuth, async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
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

    const result = await collection.insertOne(newSession)
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

app.post('/api/exam/submit', clerkAuth, async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
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

app.get('/api/exam/history', clerkAuth, async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
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

app.get('/api/exam/session/today', clerkAuth, async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
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

// ============= SUBSCRIPTION ROUTES =============
const SUBSCRIPTION_PLANS = {
  MONTHLY: { days: 30, priceId: process.env.STRIPE_PRICE_30_DAYS || '', name: '30 Days' },
  YEARLY: { days: 365, priceId: process.env.STRIPE_PRICE_365_DAYS || '', name: '365 Days' },
  TRIAL: { days: 3, priceId: null, name: '3 Free Days' }
} as const

function calculateNewExpirationDate(
  currentEndDate: string | null | undefined,
  daysToAdd: number,
  isPaidPlan: boolean = false
): { startDate: Date; endDate: Date } {
  const now = new Date()
  let startDate: Date
  let endDate: Date

  if (!currentEndDate) {
    startDate = now
    endDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
  } else {
    const existingEnd = new Date(currentEndDate)
    if (existingEnd <= now) {
      startDate = now
      endDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    } else {
      startDate = existingEnd
      endDate = new Date(existingEnd.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    }
  }

  return { startDate, endDate }
}

function getDaysFromPriceId(priceId: string): number {
  for (const plan of Object.values(SUBSCRIPTION_PLANS)) {
    if (plan.priceId === priceId) {
      return plan.days
    }
  }
  return 30
}

async function processFreeDays(clerkUserId: string) {
  const usersCollection = getUsersCollection()
  const user = await usersCollection.findOne({ clerkId: clerkUserId })

  if (!user) {
    return { success: false, error: 'User not found' }
  }

  if (user.has_used_free_days === 1 || user.has_used_free_days === true) {
    return { success: false, error: 'Already used free days' }
  }

  const now = new Date()
  const endDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  await usersCollection.updateOne(
    { clerkId: clerkUserId },
    {
      $set: {
        days_left: 3,
        subscription_end: endDate.toISOString(),
        subscription_start_date: now.toISOString(),
        subscription_status: 'trial',
        is_new_user: 0,
        has_used_free_days: 1,
        updatedAt: now.toISOString()
      }
    }
  )

  await getSubscriptionTransactionsCollection().insertOne({
    id: genOutputId(),
    userId: clerkUserId,
    stripe_session_id: null,
    stripe_subscription_id: null,
    price_id: null,
    days_added: 3,
    amount_paid: 0,
    status: 'completed',
    transaction_date: now.toISOString(),
    createdAt: now.toISOString()
  })

  return {
    success: true,
    daysLeft: 3,
    endDate: endDate.toISOString(),
    startDate: now.toISOString(),
    status: 'trial'
  }
}

async function getSubscriptionStatus(clerkUserId: string) {
  const usersCollection = getUsersCollection()
  const user = await usersCollection.findOne({ clerkId: clerkUserId })

  if (!user) {
    return {
      daysLeft: 0,
      endDate: null,
      startDate: null,
      status: 'none',
      hasAccess: false,
      isNewUser: true,
      hasUsedFreeDays: false
    }
  }

  const now = new Date()
  let daysLeft = user.days_left || 0
  let status = (user.subscription_status) || 'none'

  if (user.subscription_end) {
    const endDate = new Date(user.subscription_end)
    if (endDate <= now) {
      daysLeft = 0
      if (status !== 'canceled' && status !== 'expired') {
        status = 'expired'
        await usersCollection.updateOne(
          { clerkId: clerkUserId },
          { $set: { days_left: 0, subscription_status: 'expired' } }
        )
      }
    } else {
      const diffMs = endDate.getTime() - now.getTime()
      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    }
  }

  const hasAccess = daysLeft > 0 && ['active', 'trial', 'past_due'].includes(status)

  return {
    daysLeft,
    endDate: user.subscription_end || null,
    startDate: user.subscription_start_date || null,
    status,
    hasAccess,
    isNewUser: user.is_new_user === 1 || user.is_new_user === true,
    hasUsedFreeDays: user.has_used_free_days === 1 || user.has_used_free_days === true
  }
}

async function isEventProcessed(eventId: string): Promise<boolean> {
  const existing = getStripeEventsCollection().findOne({ id: eventId })
  return existing !== null
}

async function markEventProcessed(eventId: string, eventType: string): Promise<boolean> {
  try {
    await getStripeEventsCollection().insertOne({
      id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString()
    })
    return true
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return false
    }
    throw err
  }
}

async function processPaymentCompletion(
  clerkUserId: string,
  stripeSessionId: string,
  stripeSubscriptionId: string,
  priceId: string,
  amountPaid: number,
  stripeCustomerId?: string
) {
  const usersCollection = getUsersCollection()
  let user = await usersCollection.findOne({ clerkId: clerkUserId })

  if (!user) {
    const now = new Date()
    await usersCollection.insertOne({
      id: clerkUserId,
      clerkId: clerkUserId,
      email: stripeCustomerId || '',
      name: 'User',
      createdAt: now.toISOString(),
      role: 'user',
      days_left: 0,
      subscription_end: null,
      is_new_user: 0,
      has_used_free_days: 0
    })
    user = await usersCollection.findOne({ clerkId: clerkUserId })
  }

  const days = getDaysFromPriceId(priceId)
  const { startDate, endDate } = calculateNewExpirationDate(
    user.subscription_end,
    days
  )

  const now = new Date()
  const diffMs = endDate.getTime() - now.getTime()
  const actualDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

  const updateFields: Record<string, any> = {
    days_left: actualDaysLeft,
    subscription_end: endDate.toISOString(),
    subscription_start_date: user.subscription_start_date || startDate.toISOString(),
    subscription_status: 'active',
    last_payment_date: now.toISOString(),
    updatedAt: now.toISOString()
  }

  if (stripeCustomerId) {
    updateFields.stripe_customer_id = stripeCustomerId
  }
  if (stripeSubscriptionId) {
    updateFields.stripe_subscription_id = stripeSubscriptionId
  }

  await usersCollection.updateOne(
    { clerkId: clerkUserId },
    { $set: updateFields }
  )

  await getSubscriptionTransactionsCollection().insertOne({
    id: genOutputId(),
    userId: clerkUserId,
    stripe_session_id: stripeSessionId,
    stripe_subscription_id: stripeSubscriptionId,
    price_id: priceId,
    days_added: days,
    amount_paid: amountPaid,
    status: 'completed',
    transaction_date: now.toISOString(),
    createdAt: now.toISOString()
  })

  return {
    success: true,
    daysLeft: actualDaysLeft,
    endDate: endDate.toISOString(),
    startDate: startDate.toISOString(),
    status: 'active'
  }
}

app.get('/api/subscription/', clerkAuth, async (c) => {
  const clerkUserId = (c as any).get('clerkUserId')
  const status = await getSubscriptionStatus(clerkUserId)

  return c.json({
    days_left: status.daysLeft,
    subscription_end: status.endDate,
    subscription_start: status.startDate,
    subscription_status: status.status,
    has_access: status.hasAccess,
    is_new_user: status.isNewUser,
    has_used_free_days: status.hasUsedFreeDays
  })
})

app.post('/api/subscription/create-checkout-session', clerkAuth, async (c) => {
  const { price_id } = await c.req.json()
  const clerkUserId = (c as any).get('clerkUserId')
  const appUrl = process.env.APP_URL || 'http://localhost:5173'

  if (!price_id) {
    return c.json({ error: 'price_id is required' }, 400)
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { clerkUserId }
    })
    return c.json({ url: session.url })
  } catch (err: any) {
    console.error('Error creating checkout session:', err)
    return c.json({ error: 'Failed to create checkout session' }, 500)
  }
})

app.post('/api/subscription/create-session-checkout', clerkAuth, async (c) => {
  const { price_id, teacherId, teacherName, dateTime, topic } = await c.req.json()
  const clerkUserId = (c as any).get('clerkUserId')
  const appUrl = process.env.APP_URL || 'http://localhost:5173'

  if (!price_id) {
    return c.json({ error: 'price_id is required' }, 400)
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${appUrl}/dashboard?tab=schedule&payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard?tab=schedule&payment=cancelled`,
      metadata: {
        clerkUserId,
        type: 'session_booking',
        teacherId,
        teacherName,
        dateTime,
        topic
      }
    })
    return c.json({ url: session.url })
  } catch (err: any) {
    console.error('Error creating session checkout:', err)
    return c.json({ error: 'Failed to create checkout session' }, 500)
  }
})

app.post('/api/subscription/create-exam-checkout', clerkAuth, async (c) => {
  const { price_id } = await c.req.json()
  const clerkUserId = (c as any).get('clerkUserId')
  const appUrl = process.env.APP_URL || 'http://localhost:5173'

  if (!price_id) {
    return c.json({ error: 'price_id is required' }, 400)
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${appUrl}/exam?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard?tab=exam&payment=cancelled`,
      metadata: {
        clerkUserId,
        type: 'exam'
      }
    })
    return c.json({ url: session.url })
  } catch (err: any) {
    console.error('Error creating exam checkout:', err)
    return c.json({ error: 'Failed to create checkout session' }, 500)
  }
})

app.post('/api/subscription/use-free-days', clerkAuth, async (c) => {
  const clerkUserId = (c as any).get('clerkUserId')
  const result = await processFreeDays(clerkUserId)

  if (!result.success) {
    return c.json({ error: result.error }, 400)
  }

  return c.json({
    success: true,
    days_left: result.daysLeft,
    subscription_end: result.endDate
  })
})

app.get('/api/subscription/verify-session/:sessionId', clerkAuth, async (c) => {
  const sessionId = c.req.param('sessionId')
  const clerkUserId = (c as any).get('clerkUserId')

  if (!sessionId) {
    return c.json({ error: 'session_id is required' }, 400)
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return c.json({ verified: false, status: session.payment_status })
    }

    const stripeSubscriptionId = session.subscription as string

    let priceId = (session as any).subscription_details?.price_id ||
      session.line_items?.data?.[0]?.price?.id || ''

    if (!priceId && stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        priceId = sub.items.data[0]?.price.id || ''
      } catch (err: any) {
        console.log('Error retrieving subscription for price:', err.message)
      }
    }

    const result = await processPaymentCompletion(
      clerkUserId,
      session.id,
      stripeSubscriptionId,
      priceId,
      session.amount_total || 0,
      session.customer as string
    )

    return c.json({
      verified: true,
      success: result.success,
      days_left: result.daysLeft,
      subscription_end: result.endDate
    })
  } catch (err: any) {
    console.error('Error verifying session:', err.message, err.stack)
    return c.json({ error: 'Failed to verify session', details: err.message }, 500)
  }
})

app.post('/api/subscription/webhook', async (c) => {
  const sig = c.req.header('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig) {
    return c.json({ error: 'Missing signature' }, 400)
  }

  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET not configured - skipping webhook verification in dev mode')

    try {
      const body = await c.req.text()
      const event = JSON.parse(body)

      if (await isEventProcessed(event.id)) {
        return c.json({ received: true, status: 'already_processed' })
      }

      await markEventProcessed(event.id, event.type)

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object
          const clerkUserId = session.metadata?.clerkUserId

          if (!clerkUserId) break

          await processPaymentCompletion(
            clerkUserId,
            session.id,
            session.subscription,
            session.line_items?.data?.[0]?.price?.id || '',
            session.amount_total || 0,
            session.customer
          )
          break
        }

        case 'customer.subscription.deleted': {
          const usersCollection = getUsersCollection()
          await usersCollection.updateOne(
            { stripe_subscription_id: event.data.object.id },
            { $set: { subscription_status: 'canceled', updatedAt: new Date().toISOString() } }
          )
          break
        }

        case 'customer.subscription.updated': {
          const usersCollection = getUsersCollection()
          await usersCollection.updateOne(
            { stripe_subscription_id: event.data.object.id },
            { $set: { subscription_status: event.data.object.status, updatedAt: new Date().toISOString() } }
          )
          break
        }
      }

      return c.json({ received: true })
    } catch (err: any) {
      console.error('Error processing webhook:', err)
      return c.json({ error: err.message }, 500)
    }
  }

  let event: Stripe.Event
  const body = await c.req.text()

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return c.json({ error: 'Invalid signature' }, 400)
  }

  if (await isEventProcessed(event.id)) {
    console.log(`Skipping duplicate event: ${event.id}`)
    return c.json({ received: true, status: 'already_processed' })
  }

  try {
    await markEventProcessed(event.id, event.type)
  } catch (err) {
    return c.json({ received: true, status: 'processing' })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const clerkUserId = session.metadata?.clerkUserId

        if (!clerkUserId) {
          console.error('No clerkUserId in session metadata')
          break
        }

        if (session.status !== 'complete') {
          break
        }

        const stripeSubscriptionId = session.subscription as string
        const priceId = session.line_items?.data?.[0]?.price?.id || ''

        await processPaymentCompletion(
          clerkUserId,
          session.id,
          stripeSubscriptionId,
          priceId,
          session.amount_total || 0,
          session.customer as string
        )
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        console.log(`Subscription deleted: ${sub.id}`)
        const usersCollection = getUsersCollection()
        await usersCollection.updateOne(
          { stripe_subscription_id: sub.id },
          { $set: { subscription_status: 'canceled', updatedAt: new Date().toISOString() } }
        )
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        console.log(`Subscription updated: ${sub.id}, status: ${sub.status}`)
        const usersCollection = getUsersCollection()
        await usersCollection.updateOne(
          { stripe_subscription_id: sub.id },
          { $set: { subscription_status: sub.status, updatedAt: new Date().toISOString() } }
        )
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        if (invoice.subscription) {
          const usersCollection = getUsersCollection()
          await usersCollection.updateOne(
            { stripe_subscription_id: invoice.subscription as string },
            { $set: { subscription_status: 'past_due', updatedAt: new Date().toISOString() } }
          )
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`Error processing event ${event.id}:`, err)
    throw err
  }

  return c.json({ received: true })
})

app.get('/api/subscription/check', clerkAuth, async (c) => {
  const clerkUserId = (c as any).get('clerkUserId')
  const status = await getSubscriptionStatus(clerkUserId)

  return c.json({
    has_access: status.hasAccess,
    days_left: status.daysLeft
  })
})

// ============= ADMIN ROUTES =============
app.get('/api/admin/stats', adminAuth, async (c) => {
  try {
    const usersCollection = getUsersCollection()
    const transactionsCollection = getSubscriptionTransactionsCollection()

    const allUsers = await usersCollection.find({}).toArray()
    const totalUsers = allUsers.length

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const activeSubscriptions = allUsers.filter(u => {
      if (!u.subscription_end) return false
      return new Date(u.subscription_end) > now
    }).length

    const trialUsers = allUsers.filter(u => {
      return u.subscription_status === 'trial'
    }).length

    const pastDueUsers = allUsers.filter(u => {
      return u.subscription_status === 'past_due'
    }).length

    const newUsersThisMonth = allUsers.filter(u => {
      if (!u.createdAt) return false
      return new Date(u.createdAt) > thirtyDaysAgo
    }).length

    const transactions = await transactionsCollection.find({
      status: 'completed',
      amount_paid: { $gt: 0 }
    }).toArray()

    const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount_paid || 0), 0)

    return c.json({
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      trialUsers,
      pastDueUsers,
      newUsersThisMonth
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/admin/users', adminAuth, async (c) => {
  try {
    const usersCollection = getUsersCollection()
    const users = await usersCollection.find({}).toArray()
    return c.json(users)
  } catch (error) {
    console.error('Admin users error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/admin/user/:clerkId', adminAuth, async (c) => {
  try {
    const clerkId = c.req.param('clerkId')
    const usersCollection = getUsersCollection()
    const user = await usersCollection.findOne({ clerkId })

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      ...user,
      publicMetadata: {}
    })
  } catch (error) {
    console.error('Admin user detail error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/admin/transactions', adminAuth, async (c) => {
  try {
    const transactionsCollection = getSubscriptionTransactionsCollection()
    const transactions = await transactionsCollection.find({}).toArray()
    return c.json(transactions)
  } catch (error) {
    console.error('Admin transactions error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.get('/api/admin/offers', adminAuth, async (c) => {
  try {
    const offersCollection = getOffersCollection()
    const offers = await offersCollection.find({}).toArray()
    return c.json(offers)
  } catch (error) {
    console.error('Admin offers error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.post('/api/admin/offers', adminAuth, async (c) => {
  try {
    const { code, discount, type, description } = await c.req.json()

    const offer = {
      id: genOutputId(),
      code: code.toUpperCase(),
      discount,
      type,
      description: description || '',
      active: true,
      createdAt: new Date().toISOString()
    }

    const offersCollection = getOffersCollection()
    await offersCollection.insertOne(offer)

    return c.json(offer)
  } catch (error) {
    console.error('Admin create offer error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.delete('/api/admin/offers/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id')
    const offersCollection = getOffersCollection()
    const result = await offersCollection.deleteOne({ id })
    
    if (result.deletedCount === 0) {
      return c.json({ error: 'Offer not found' }, 404)
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Admin delete offer error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============= SESSIONS ROUTES (BOOKINGS) =============
app.get('/api/sessions/', async (c) => {
  const bookedSessions = getBookedSessionsCollection()
  const users = getUsersCollection()
  const clerkUserId = c.req.query('clerkUserId')

  let sessions
  if (clerkUserId) {
    sessions = await bookedSessions.find({ student_id: clerkUserId }).toArray()
  } else {
    sessions = await bookedSessions.find({}).toArray()
  }

  const result = []
  for (const session of sessions) {
    let teacher = await users.findOne({ clerkId: session.teacher_id })
    if (!teacher) {
      const allUsers = await users.find({}).toArray()
      teacher = allUsers.find(u => u.name?.toLowerCase() === session.teacher_id?.toLowerCase())
    }
    const student = await users.findOne({ clerkId: session.student_id })
    result.push({
      id: session.id,
      teacherName: teacher?.name || teacher?.email || session.teacher_id || 'Unknown',
      studentName: student?.name || student?.email || 'Unknown',
      sessionDatetime: session.session_datetime,
      topic: session.topic,
      status: session.status,
      price: session.price,
      createdAt: session.created_at
    })
  }

  return c.json({ sessions: result })
})

app.post('/api/sessions/', clerkAuth, async (c) => {
  const { teacherId, studentId, sessionDatetime, topic } = await c.req.json()
  const bookedSessions = getBookedSessionsCollection()

  const now = new Date().toISOString()
  const session = {
    id: genOutputId(),
    teacher_id: teacherId,
    student_id: studentId,
    session_datetime: sessionDatetime,
    topic: topic || 'English Conversation',
    status: 'pending',
    price: 50,
    created_at: now
  }

  await bookedSessions.insertOne(session)

  return c.json({ success: true, session })
})

app.patch('/api/sessions/:id/confirm', clerkAuth, async (c) => {
  const { id } = c.req.param()
  const bookedSessions = getBookedSessionsCollection()

  await bookedSessions.updateOne({ id }, { $set: { status: 'confirmed' } })

  return c.json({ success: true })
})

app.delete('/api/sessions/:id', clerkAuth, async (c) => {
  const { id } = c.req.param()
  const bookedSessions = getBookedSessionsCollection()

  await bookedSessions.deleteOne({ id })

  return c.json({ success: true })
})

// ============= PROFILE ROUTES =============
const PROFILE_BADGE_DEFS = [
  { id: 'vocab', name: 'Wordsmith', icon: '📖', desc: 'Add words to your vocabulary', bronze: 10, silver: 50, gold: 200, unit: 'words' },
  { id: 'definitions', name: 'Definition Ace', icon: '📝', desc: 'Complete definition rounds', bronze: 5, silver: 25, gold: 100, unit: 'rounds' },
  { id: 'transformations', name: 'Transformer', icon: '🔄', desc: 'Complete transformation rounds', bronze: 5, silver: 25, gold: 100, unit: 'rounds' },
  { id: 'listening', name: 'Listener', icon: '🎧', desc: 'Complete listening rounds', bronze: 5, silver: 25, gold: 100, unit: 'rounds' },
  { id: 'phrasal', name: 'Phrasal Pro', icon: '⭐', desc: 'Perfect phrasal verb rounds', bronze: 3, silver: 10, gold: 30, unit: 'perfect rounds' },
] as const

app.get('/api/profile/:username', async (c) => {
  try {
    const username = c.req.param('username')
    const usersCollection = getUsersCollection()

    let user = await usersCollection.findOne({ clerkId: username })

    if (!user) {
      user = await usersCollection.findOne({ email: { $ne: null } })
      const emailPrefix = username.toLowerCase()
      const allUsers = await usersCollection.find({}).toArray()
      user = allUsers.find((u: any) => u.email && u.email.toLowerCase().split('@')[0] === emailPrefix) || null
    }

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    const readingCollection = getReadingSessionsCollection()
    const sessions = await readingCollection.find({ userId: user._id.toString() }).toArray()
    const allWords = new Set<string>()
    for (const s of sessions) {
      const words: string[] = s.vocabulary || []
      for (const w of words) if (w) allWords.add(w)
    }
    const vocabCount = allWords.size

    const gamesCollection = getGameSessionsCollection()
    const allGames = await gamesCollection.find({ userId: user._id.toString() }).toArray()

    const defCount = allGames.filter((g: any) => g.gameType === 'definitions').length
    const transformCount = allGames.filter((g: any) => g.gameType === 'transformations').length
    const listenCount = allGames.filter((g: any) => g.gameType === 'listening').length
    const perfectPhrasal = allGames.filter((g: any) => g.gameType === 'phrasal-verbs' && g.wrong === 0).length

    const current: Record<string, number> = {
      vocab: vocabCount,
      definitions: defCount,
      transformations: transformCount,
      listening: listenCount,
      phrasal: perfectPhrasal,
    }

    const badges = PROFILE_BADGE_DEFS.map((badge) => ({
      ...badge,
      current: current[badge.id] || 0,
    }))

    return c.json({
      name: user.name || user.email?.split('@')[0] || 'Anonymous',
      email: user.email,
      createdAt: user.createdAt,
      badges,
    })
  } catch (error) {
    console.error('Get public profile error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

await connectDB()

export default app
