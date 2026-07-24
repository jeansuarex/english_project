import { query } from '../db'
import { getUserByClerkId } from './user'
import { getProgressStats, getStreak, getBadges } from './progress'
import { getVocabulary } from './vocabulary'

interface GameSession {
  id: string
  userId: string
  gameType: string
  correct: number
  wrong: number
  totalRounds: number
  completedAt: string
}

export async function getRecommendation(clerkId: string) {
  const user = await getUserByClerkId(clerkId)
  if (!user) return { error: 'User not found' }

  const stats = await getProgressStats(clerkId)
  const streak = await getStreak(clerkId)
  const badges = await getBadges(clerkId)

  if ('error' in stats) return stats

  const recommendations: { priority: 'high' | 'medium' | 'low'; action: string; reason: string }[] = []

  if (streak.currentStreak === 0 && streak.totalDays > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Resume your streak!',
      reason: `You haven't studied today. Get back to it!`,
    })
  }

  if (streak.currentStreak > 0 && streak.currentStreak % 7 === 0) {
    recommendations.push({
      priority: 'medium',
      action: 'Weekly streak milestone!',
      reason: `You're on a ${streak.currentStreak}-day streak. Keep it up!`,
    })
  }

  const vocab = await getVocabulary(clerkId, 200)
  if (!('error' in vocab) && vocab.totalCount < 20) {
    recommendations.push({
      priority: 'high',
      action: 'Build your vocabulary',
      reason: `You only have ${vocab.totalCount} words. Read some content to learn more!`,
    })
  }

  const weakestGame = Object.entries(stats.byGameType)
    .map(([type, data]) => ({
      type,
      accuracy: data.totalRounds > 0 ? (data.correct / (data.correct + data.wrong)) * 100 : 0,
    }))
    .filter(g => g.accuracy > 0 && g.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy)[0]

  if (weakestGame) {
    const gameNames: Record<string, string> = {
      'listening': 'Listening',
      'definitions': 'Definitions',
      'transformations': 'Transformations',
      'phrasal-verbs': 'Phrasal Verbs',
    }
    recommendations.push({
      priority: 'medium',
      action: `Practice ${gameNames[weakestGame.type] || weakestGame.type}`,
      reason: `Your accuracy is ${Math.round(weakestGame.accuracy)}%. Room for improvement!`,
    })
  }

  const unlockedBadges = badges.badges.filter(b => b.tier !== 'none')
  if (unlockedBadges.length < 2) {
    recommendations.push({
      priority: 'low',
      action: 'Earn your first badges',
      reason: 'Complete exercises to earn badges and track your achievements!',
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      action: 'Explore new content',
      reason: 'You\'re doing great! Try a new type of exercise or read something challenging.',
    })
  }

  return {
    summary: {
      streak: streak.currentStreak,
      vocabularySize: vocab && !('error' in vocab) ? vocab.totalCount : 0,
      overallAccuracy: stats.overallAccuracy,
      badgesUnlocked: unlockedBadges.length,
    },
    recommendations: recommendations.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    }),
  }
}

export async function getLeaderboard(clerkId: string, limit = 10) {
  const user = await getUserByClerkId(clerkId)
  if (!user) return { error: 'User not found' }

  const activities = query<{ userId: string; total: number }>(
    `SELECT userId, SUM(count) as total 
     FROM study_activity 
     GROUP BY userId 
     ORDER BY total DESC 
     LIMIT ?`,
    limit
  )

  const leaderboard = []
  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i]
    const leaderUser = query<{ id: string; name: string }>(
      'SELECT id, name FROM users WHERE id = ?',
      activity.userId
    )[0]

    leaderboard.push({
      rank: i + 1,
      name: leaderUser?.name || 'Anonymous',
      totalActivities: activity.total,
      isYou: activity.userId === user.id,
    })
  }

  const userRank = leaderboard.findIndex(e => e.isYou)
  if (userRank === -1) {
    const userActivity = queryOne<{ total: number }>(
      `SELECT SUM(count) as total FROM study_activity WHERE userId = ?`,
      user.id
    )
    leaderboard.push({
      rank: activities.length + 1,
      name: 'You',
      totalActivities: userActivity?.total || 0,
      isYou: true,
    })
  }

  return {
    leaderboard,
    yourRank: leaderboard.find(e => e.isYou)?.rank || null,
  }
}

export async function getStudyPlan(clerkId: string) {
  const user = await getUserByClerkId(clerkId)
  if (!user) return { error: 'User not found' }

  const games = query<GameSession>(
    'SELECT * FROM game_sessions WHERE userId = ? ORDER BY completedAt DESC LIMIT 50',
    user.id
  )

  const gamesLastWeek = games.filter(g => {
    const gameDate = new Date(g.completedAt)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return gameDate >= weekAgo
  })

  const gameTypes = ['listening', 'definitions', 'transformations', 'phrasal-verbs']
  const weeklyFocus: Record<string, number> = { listening: 0, definitions: 0, transformations: 0, 'phrasal-verbs': 0 }

  for (const g of gamesLastWeek) {
    if (weeklyFocus[g.gameType] !== undefined) {
      weeklyFocus[g.gameType]++
    }
  }

  const leastPracticed = gameTypes
    .filter(type => weeklyFocus[type] === 0)
    .sort(() => Math.random() - 0.5)

  const today = new Date().toISOString().slice(0, 10)

  return {
    weeklyPlan: {
      daysActive: gamesLastWeek.length,
      gamesPlayed: gamesLastWeek.length,
    },
    todayFocus: leastPracticed[0] || gameTypes[Math.floor(Math.random() * gameTypes.length)],
    suggestedPractice: leastPracticed.slice(0, 3),
    weeklyBreakdown: gameTypes.map(type => ({
      type,
      sessionsThisWeek: weeklyFocus[type],
    })),
  }
}
