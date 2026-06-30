import { Hono } from 'hono'
import { z } from 'zod'
import { getGameSessionsCollection, getReadingSessionsCollection, getLearnedWordsCollection } from '../db'
import { clerkAuth } from '../middleware/auth'

const progress = new Hono()
progress.use('*', clerkAuth)

const GameSessionSchema = z.object({
  gameType: z.enum(['listening', 'definitions', 'transformations', 'phrasal-verbs']),
  correct: z.number().int().min(0),
  wrong: z.number().int().min(0),
  totalRounds: z.number().int().min(1),
})

progress.post('/game-session', async (c) => {
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

const BADGE_DEFS = [
  { id: 'vocab', name: 'Scholar', icon: '📖', desc: 'Add words to your vocabulary', bronze: 10, silver: 50, gold: 200 },
  { id: 'definitions', name: 'Definition Ace', icon: '📝', desc: 'Complete definition rounds', bronze: 5, silver: 25, gold: 100 },
  { id: 'transformations', name: 'Transformer', icon: '🔄', desc: 'Complete transformation rounds', bronze: 5, silver: 25, gold: 100 },
  { id: 'listening', name: 'Listener', icon: '🎧', desc: 'Complete listening rounds', bronze: 5, silver: 25, gold: 100 },
  { id: 'phrasal', name: 'Phrasal Pro', icon: '⭐', desc: 'Perfect phrasal verb rounds', bronze: 3, silver: 10, gold: 30 },
] as const

progress.get('/badges', async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')

    // Vocab: count unique words across all reading sessions
    const readingCollection = getReadingSessionsCollection()
    const sessions = await readingCollection.find({ userId }).toArray()
    const allWords = new Set<string>()
    for (const s of sessions) {
      const words: string[] = s.vocabulary || []
      for (const w of words) if (w) allWords.add(w)
    }
    const vocabCount = allWords.size

    // Game sessions
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

export default progress
