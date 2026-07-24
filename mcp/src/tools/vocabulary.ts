import { query, queryOne } from '../db'
import { getUserByClerkId } from './user'

interface LearnedWord {
  id: string
  userId: string
  word: string
  learnedAt: string
}

interface ReadingSession {
  id: string
  userId: string
  resourceId: string
  vocabulary: string
}

export async function getVocabulary(clerkId: string, limit = 50) {
  const user = await getUserByClerkId(clerkId)
  if (!user) return { error: 'User not found' }

  const words = query<LearnedWord>(
    `SELECT * FROM learned_words 
     WHERE userId = ? 
     ORDER BY learnedAt DESC 
     LIMIT ?`,
    user.id,
    limit
  )

  const readingSessions = query<ReadingSession>(
    'SELECT * FROM reading_sessions WHERE userId = ?',
    user.id
  )

  const allVocabWords = new Set<string>()
  for (const session of readingSessions) {
    if (session.vocabulary) {
      try {
        const vocab = JSON.parse(session.vocabulary) as string[]
        vocab.forEach(w => allVocabWords.add(w.toLowerCase()))
      } catch { }
    }
  }

  const learnedWords = words.map(w => w.word.toLowerCase())

  for (const w of allVocabWords) {
    if (!learnedWords.includes(w)) {
      learnedWords.push(w)
    }
  }

  return {
    words: learnedWords,
    totalCount: learnedWords.length,
    breakdown: {
      fromGames: words.length,
      fromReading: allVocabWords.size - words.filter(w => allVocabWords.has(w.word.toLowerCase())).length,
    },
  }
}

export async function getVocabularyByTopic(clerkId: string, topic: string) {
  const vocab = await getVocabulary(clerkId, 200)
  if ('error' in vocab) return vocab

  const topicKeywords: Record<string, string[]> = {
    'emotions': ['happy', 'sad', 'angry', 'love', 'fear', 'joy', 'excited', 'nervous', 'calm', 'anxious'],
    'business': ['meeting', 'project', 'deadline', 'budget', 'client', 'report', 'presentation', 'strategy'],
    'travel': ['airport', 'hotel', 'ticket', 'passport', 'luggage', 'destination', 'reservation', 'tourist'],
    'food': ['breakfast', 'lunch', 'dinner', 'recipe', 'ingredient', 'restaurant', 'delicious', 'chef'],
    'technology': ['computer', 'software', 'internet', 'email', 'website', 'app', 'database', 'code'],
  }

  const keywords = topicKeywords[topic.toLowerCase()]
  if (!keywords) {
    return {
      words: vocab.words,
      topic: topic,
      note: 'Topic not recognized. Showing all vocabulary.',
    }
  }

  const filtered = vocab.words.filter(w =>
    keywords.some(kw => w.toLowerCase().includes(kw))
  )

  return {
    words: filtered.length > 0 ? filtered : vocab.words.slice(0, 10),
    topic: topic,
    matchedCount: filtered.length,
  }
}

export async function addWordToVocab(clerkId: string, word: string) {
  const user = await getUserByClerkId(clerkId)
  if (!user) return { error: 'User not found' }

  const existing = queryOne<LearnedWord>(
    'SELECT * FROM learned_words WHERE userId = ? AND word = ?',
    user.id,
    word.toLowerCase()
  )

  if (existing) {
    return { success: true, message: 'Word already in vocabulary', word: word.toLowerCase() }
  }

  const { randomBytes } = await import('crypto')
  const id = randomBytes(16).toString('hex')

  const db = (await import('../db')).queryOne
  const database = (await import('../db')).query

  database(
    'INSERT INTO learned_words (id, userId, word, learnedAt) VALUES (?, ?, ?, ?)',
    id,
    user.id,
    word.toLowerCase(),
    new Date().toISOString()
  )

  return { success: true, message: 'Word added to vocabulary', word: word.toLowerCase() }
}

export async function quizVocabulary(clerkId: string, count = 5) {
  const vocab = await getVocabulary(clerkId, 100)
  if ('error' in vocab) return vocab

  if (vocab.words.length === 0) {
    return { error: 'No words in vocabulary yet. Start reading or playing games!' }
  }

  const shuffled = [...vocab.words].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.min(count, vocab.words.length))

  return {
    words: selected.map(w => ({
      word: w,
      scrambled: w.split('').sort(() => Math.random() - 0.5).join(''),
    })),
    totalAvailable: vocab.words.length,
  }
}
