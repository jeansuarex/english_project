import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  getUserProfile,
  getGameHistory,
  getRecentBooks,
} from './tools/user'
import {
  getVocabulary,
  getVocabularyByTopic,
  addWordToVocab,
  quizVocabulary,
} from './tools/vocabulary'
import {
  getProgressStats,
  getActivityHeatmap,
  getStreak,
  getBadges,
} from './tools/progress'
import {
  getRecommendation,
  getLeaderboard,
  getStudyPlan,
} from './tools/study'

const server = new McpServer({
  name: 'Shakespeare Study Assistant',
  version: '1.0.0',
})

server.tool(
  'get_user_profile',
  'Get comprehensive user profile including stats and membership info',
  { clerkId: { type: 'string', description: 'Clerk user ID' } },
  async ({ clerkId }) => {
    const profile = await getUserProfile(clerkId)
    return {
      content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }],
    }
  }
)

server.tool(
  'get_vocabulary',
  'Get all vocabulary words learned by the user',
  {
    clerkId: { type: 'string', description: 'Clerk user ID' },
    limit: { type: 'number', description: 'Maximum words to return', required: false },
  },
  async ({ clerkId, limit = 50 }) => {
    const vocab = await getVocabulary(clerkId, limit)
    return {
      content: [{ type: 'text', text: JSON.stringify(vocab, null, 2) }],
    }
  }
)

server.tool(
  'get_vocabulary_by_topic',
  'Get vocabulary words filtered by topic (emotions, business, travel, food, technology)',
  {
    clerkId: { type: 'string', description: 'Clerk user ID' },
    topic: { type: 'string', description: 'Topic to filter by' },
  },
  async ({ clerkId, topic }) => {
    const vocab = await getVocabularyByTopic(clerkId, topic)
    return {
      content: [{ type: 'text', text: JSON.stringify(vocab, null, 2) }],
    }
  }
)

server.tool(
  'add_vocabulary_word',
  'Add a word to the user vocabulary',
  {
    clerkId: { type: 'string', description: 'Clerk user ID' },
    word: { type: 'string', description: 'Word to add' },
  },
  async ({ clerkId, word }) => {
    const result = await addWordToVocab(clerkId, word)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  }
)

server.tool(
  'quiz_vocabulary',
  'Get a vocabulary quiz with scrambled words',
  {
    clerkId: { type: 'string', description: 'Clerk user ID' },
    count: { type: 'number', description: 'Number of words for quiz', required: false },
  },
  async ({ clerkId, count = 5 }) => {
    const quiz = await quizVocabulary(clerkId, count)
    return {
      content: [{ type: 'text', text: JSON.stringify(quiz, null, 2) }],
    }
  }
)

server.tool(
  'get_progress_stats',
  'Get detailed progress statistics by game type',
  { clerkId: { type: 'string', description: 'Clerk user ID' } },
  async ({ clerkId }) => {
    const stats = await getProgressStats(clerkId)
    return {
      content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
    }
  }
)

server.tool(
  'get_activity_heatmap',
  'Get study activity heatmap data for the past year',
  {
    clerkId: { type: 'string', description: 'Clerk user ID' },
    days: { type: 'number', description: 'Number of days to include', required: false },
  },
  async ({ clerkId, days = 365 }) => {
    const heatmap = await getActivityHeatmap(clerkId, days)
    return {
      content: [{ type: 'text', text: JSON.stringify(heatmap, null, 2) }],
    }
  }
)

server.tool(
  'get_streak',
  'Get current and longest study streak',
  { clerkId: { type: 'string', description: 'Clerk user ID' } },
  async ({ clerkId }) => {
    const streak = await getStreak(clerkId)
    return {
      content: [{ type: 'text', text: JSON.stringify(streak, null, 2) }],
    }
  }
)

server.tool(
  'get_badges',
  'Get all badges and progress toward them',
  { clerkId: { type: 'string', description: 'Clerk user ID' } },
  async ({ clerkId }) => {
    const badges = await getBadges(clerkId)
    return {
      content: [{ type: 'text', text: JSON.stringify(badges, null, 2) }],
    }
  }
)

server.tool(
  'get_recommendation',
  'Get personalized study recommendations based on user progress',
  { clerkId: { type: 'string', description: 'Clerk user ID' } },
  async ({ clerkId }) => {
    const rec = await getRecommendation(clerkId)
    return {
      content: [{ type: 'text', text: JSON.stringify(rec, null, 2) }],
    }
  }
)

server.tool(
  'get_leaderboard',
  'Get the study activity leaderboard',
  {
    clerkId: { type: 'string', description: 'Clerk user ID' },
    limit: { type: 'number', description: 'Number of users to show', required: false },
  },
  async ({ clerkId, limit = 10 }) => {
    const board = await getLeaderboard(clerkId, limit)
    return {
      content: [{ type: 'text', text: JSON.stringify(board, null, 2) }],
    }
  }
)

server.tool(
  'get_study_plan',
  'Get a personalized study plan for the week',
  { clerkId: { type: 'string', description: 'Clerk user ID' } },
  async ({ clerkId }) => {
    const plan = await getStudyPlan(clerkId)
    return {
      content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }],
    }
  }
)

server.tool(
  'get_game_history',
  'Get recent game session history',
  {
    clerkId: { type: 'string', description: 'Clerk user ID' },
    limit: { type: 'number', description: 'Number of games to return', required: false },
  },
  async ({ clerkId, limit = 10 }) => {
    const history = await getGameHistory(clerkId, limit)
    return {
      content: [{ type: 'text', text: JSON.stringify(history, null, 2) }],
    }
  }
)

server.tool(
  'get_recent_books',
  'Get recently read books and reading progress',
  {
    clerkId: { type: 'string', description: 'Clerk user ID' },
    limit: { type: 'number', description: 'Number of books to return', required: false },
  },
  async ({ clerkId, limit = 5 }) => {
    const books = await getRecentBooks(clerkId, limit)
    return {
      content: [{ type: 'text', text: JSON.stringify(books, null, 2) }],
    }
  }
)

export async function runServer() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Shakespeare MCP Server running on stdio')
}

runServer().catch(console.error)
