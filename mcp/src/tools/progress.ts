import { query, queryOne } from '../db'
import { getUserByClerkId } from './user'

interface StudyActivity {
  id: string
  userId: string
  date: string
  count: number
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

export async function getProgressStats(clerkId: string) {
  const user = await getUserByClerkId(clerkId)
  if (!user) return { error: 'User not found' }

  const games = query<GameSession>(
    'SELECT * FROM game_sessions WHERE userId = ?',
    user.id
  )

  const totalGames = games.length
  const totalCorrect = games.reduce((sum, g) => sum + g.correct, 0)
  const totalWrong = games.reduce((sum, g) => sum + g.wrong, 0)
  const totalRounds = games.reduce((sum, g) => sum + g.totalRounds, 0)

  const byType: Record<string, { played: number; correct: number; wrong: number }> = {}
  for (const g of games) {
    if (!byType[g.gameType]) {
      byType[g.gameType] = { played: 0, correct: 0, wrong: 0 }
    }
    byType[g.gameType].played++
    byType[g.gameType].correct += g.correct
    byType[g.gameType].wrong += g.wrong
  }

  return {
    totalGames,
    totalCorrect,
    totalWrong,
    overallAccuracy: totalRounds > 0 ? Math.round((totalCorrect / totalRounds) * 100) : 0,
    byGameType: byType,
    lastActivity: games[0]?.completedAt || null,
  }
}

export async function getActivityHeatmap(clerkId: string, days = 365) {
  const user = await getUserByClerkId(clerkId)
  if (!user) return { error: 'User not found' }

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().slice(0, 10)

  const activities = query<StudyActivity>(
    'SELECT * FROM study_activity WHERE userId = ? AND date >= ? ORDER BY date',
    user.id,
    sinceStr
  )

  const activityMap = new Map<string, number>()
  for (const a of activities) {
    activityMap.set(a.date, a.count)
  }

  const heatmap: { date: string; count: number; level: number }[] = []
  const current = new Date(since)
  const today = new Date()

  while (current <= today) {
    const dateStr = current.toISOString().slice(0, 10)
    const count = activityMap.get(dateStr) || 0

    let level = 0
    if (count > 0) level = 1
    if (count >= 5) level = 2
    if (count >= 10) level = 3
    if (count >= 20) level = 4

    heatmap.push({ date: dateStr, count, level })
    current.setDate(current.getDate() + 1)
  }

  return {
    heatmap,
    totalActiveDays: activities.length,
    totalActivities: activities.reduce((sum, a) => sum + a.count, 0),
  }
}

export async function getStreak(clerkId: string) {
  const user = await getUserByClerkId(clerkId)
  if (!user) return { error: 'User not found' }

  const activities = query<StudyActivity>(
    'SELECT * FROM study_activity WHERE userId = ? ORDER BY date DESC',
    user.id
  )

  if (activities.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalDays: 0 }
  }

  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const activityDates = new Set(activities.map(a => a.date))
  const current = new Date(today)

  while (true) {
    const dateStr = current.toISOString().slice(0, 10)
    if (activityDates.has(dateStr)) {
      tempStreak++
      if (currentStreak === 0) currentStreak = tempStreak
    } else {
      if (currentStreak === 0 && tempStreak > 0) {
        currentStreak = tempStreak
      }
      break
    }
    current.setDate(current.getDate() - 1)
  }

  longestStreak = tempStreak
  tempStreak = 0
  const uniqueDates = [...activityDates].sort()

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1])
    const curr = new Date(uniqueDates[i])
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)

    if (diff === 1) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak + 1)
    } else {
      tempStreak = 0
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    totalDays: activities.length,
    lastActivity: activities[0]?.date || null,
  }
}

export async function getBadges(clerkId: string) {
  const user = await getUserByClerkId(clerkId)
  if (!user) return { error: 'User not found' }

  const BADGE_DEFS = [
    { id: 'vocab', name: 'Scholar', icon: '📖', desc: 'Add words to your vocabulary', bronze: 10, silver: 50, gold: 200 },
    { id: 'definitions', name: 'Definition Ace', icon: '📝', desc: 'Complete definition rounds', bronze: 5, silver: 25, gold: 100 },
    { id: 'transformations', name: 'Transformer', icon: '🔄', desc: 'Complete transformation rounds', bronze: 5, silver: 25, gold: 100 },
    { id: 'listening', name: 'Listener', icon: '🎧', desc: 'Complete listening rounds', bronze: 5, silver: 25, gold: 100 },
    { id: 'phrasal', name: 'Phrasal Pro', icon: '⭐', desc: 'Perfect phrasal verb rounds', bronze: 3, silver: 10, gold: 30 },
  ]

  const games = query<GameSession>('SELECT * FROM game_sessions WHERE userId = ?', user.id)
  const readingSessions = query<{ vocabulary: string }>('SELECT vocabulary FROM reading_sessions WHERE userId = ?', user.id)

  const allWords = new Set<string>()
  for (const s of readingSessions) {
    if (s.vocabulary) {
      try {
        const vocab = JSON.parse(s.vocabulary) as string[]
        vocab.forEach(w => allWords.add(w.toLowerCase()))
      } catch { }
    }
  }

  const defCount = games.filter(g => g.gameType === 'definitions').length
  const transformCount = games.filter(g => g.gameType === 'transformations').length
  const listenCount = games.filter(g => g.gameType === 'listening').length
  const perfectPhrasal = games.filter(g => g.gameType === 'phrasal-verbs' && g.wrong === 0).length

  const current: Record<string, number> = {
    vocab: allWords.size,
    definitions: defCount,
    transformations: transformCount,
    listening: listenCount,
    phrasal: perfectPhrasal,
  }

  return {
    badges: BADGE_DEFS.map(badge => {
      const progress = current[badge.id] || 0
      let tier = 'none'
      if (progress >= badge.gold) tier = 'gold'
      else if (progress >= badge.silver) tier = 'silver'
      else if (progress >= badge.bronze) tier = 'bronze'

      return {
        ...badge,
        current: progress,
        tier,
        progressToNextTier: tier === 'gold' ? 100 : tier === 'silver' ? Math.round((progress / badge.gold) * 100) : Math.round((progress / badge.silver) * 100),
      }
    }),
  }
}
