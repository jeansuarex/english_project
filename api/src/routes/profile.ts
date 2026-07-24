import { Hono } from 'hono'
import { getUsersCollection, getGameSessionsCollection, getReadingSessionsCollection } from '../db'

const profile = new Hono()

const BADGE_DEFS = [
  { id: 'vocab', name: 'Wordsmith', icon: '📖', desc: 'Add words to your vocabulary', bronze: 10, silver: 50, gold: 200, unit: 'words' },
  { id: 'definitions', name: 'Definition Ace', icon: '📝', desc: 'Complete definition rounds', bronze: 5, silver: 25, gold: 100, unit: 'rounds' },
  { id: 'transformations', name: 'Transformer', icon: '🔄', desc: 'Complete transformation rounds', bronze: 5, silver: 25, gold: 100, unit: 'rounds' },
  { id: 'listening', name: 'Listener', icon: '🎧', desc: 'Complete listening rounds', bronze: 5, silver: 25, gold: 100, unit: 'rounds' },
  { id: 'phrasal', name: 'Phrasal Pro', icon: '⭐', desc: 'Perfect phrasal verb rounds', bronze: 3, silver: 10, gold: 30, unit: 'perfect rounds' },
] as const

profile.get('/:username', async (c) => {
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

    const badges = BADGE_DEFS.map((badge) => ({
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

export default profile