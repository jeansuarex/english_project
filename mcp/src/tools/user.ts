import { query, queryOne } from '../db'

interface User {
  id: string
  email: string
  name: string
  createdAt: string
  role: string
}

interface GameSession {
  id: string
  userId: string
  gameType: string
  correct: number
  wrong: number
  totalRounds: number
  completedAt: string
}

interface ReadingSession {
  id: string
  userId: string
  resourceId: string
  vocabulary: string
  lastPage: number
  updatedAt: string
}

interface Resource {
  id: string
  userId: string
  title: string
  filename: string
  createdAt: string
}

export async function getUserProfile(clerkId: string) {
  const user = queryOne<User>(
    'SELECT * FROM users WHERE clerkId = ?',
    clerkId
  )

  if (!user) {
    return { error: 'User not found' }
  }

  const createdDate = new Date(user.createdAt)
  const daysSinceJoin = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

  const totalGames = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM game_sessions WHERE userId = ?',
    user.id
  )

  const totalWords = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM learned_words WHERE userId = ?',
    user.id
  )

  return {
    name: user.name,
    email: user.email,
    role: user.role,
    memberSince: user.createdAt,
    daysActive: daysSinceJoin,
    totalGamesPlayed: totalGames?.count || 0,
    totalWordsLearned: totalWords?.count || 0,
  }
}

export async function getUserByClerkId(clerkId: string) {
  return queryOne<User>('SELECT * FROM users WHERE clerkId = ?', clerkId)
}

export async function getGameHistory(clerkId: string, limit = 10) {
  const user = await getUserByClerkId(clerkId)
  if (!user) return { error: 'User not found' }

  const games = query<GameSession>(
    `SELECT * FROM game_sessions 
     WHERE userId = ? 
     ORDER BY completedAt DESC 
     LIMIT ?`,
    user.id,
    limit
  )

  return {
    games: games.map(g => ({
      type: g.gameType,
      correct: g.correct,
      wrong: g.wrong,
      totalRounds: g.totalRounds,
      accuracy: g.totalRounds > 0 ? Math.round((g.correct / g.totalRounds) * 100) : 0,
      completedAt: g.completedAt,
    })),
  }
}

export async function getRecentBooks(clerkId: string, limit = 5) {
  const user = await getUserByClerkId(clerkId)
  if (!user) return { error: 'User not found' }

  const sessions = query<ReadingSession & { rtitle: string }>(
    `SELECT rs.*, r.title as rtitle 
     FROM reading_sessions rs 
     LEFT JOIN resources r ON rs.resourceId = r.id 
     WHERE rs.userId = ? 
     ORDER BY rs.updatedAt DESC 
     LIMIT ?`,
    user.id,
    limit
  )

  return {
    books: sessions.map(s => ({
      title: s.rtitle || 'Unknown',
      lastPage: s.lastPage,
      vocabularyCount: s.vocabulary ? JSON.parse(s.vocabulary).length : 0,
      lastRead: s.updatedAt,
    })),
  }
}
