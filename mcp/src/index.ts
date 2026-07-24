import { query, queryOne } from './db'
import { getUserByClerkId } from './tools/user'
import { getVocabulary } from './tools/vocabulary'
import { getProgressStats, getStreak, getBadges } from './tools/progress'
import { getRecommendation } from './tools/study'

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command) {
    console.log('Shakespeare MCP Server')
    console.log('Usage: bun run src/index.ts <command> [args]')
    console.log('')
    console.log('Commands:')
    console.log('  profile <clerkId>                    - Get user profile')
    console.log('  vocabulary <clerkId> [limit]        - Get vocabulary')
    console.log('  progress <clerkId>                   - Get progress stats')
    console.log('  streak <clerkId>                     - Get streak info')
    console.log('  badges <clerkId>                     - Get badges')
    console.log('  recommend <clerkId>                  - Get recommendations')
    console.log('  quiz <clerkId> [count]               - Get vocabulary quiz')
    console.log('')
    console.log('Or use with MCP client via stdio transport')
    return
  }

  const clerkId = args[1]
  if (!clerkId) {
    console.error('Error: clerkId required')
    process.exit(1)
  }

  let result: any

  switch (command) {
    case 'profile':
      result = await getUserByClerkId(clerkId)
      break
    case 'vocabulary':
      result = await getVocabulary(clerkId, parseInt(args[2]) || 50)
      break
    case 'progress':
      result = await getProgressStats(clerkId)
      break
    case 'streak':
      result = await getStreak(clerkId)
      break
    case 'badges':
      result = await getBadges(clerkId)
      break
    case 'recommend':
      result = await getRecommendation(clerkId)
      break
    default:
      console.error(`Unknown command: ${command}`)
      process.exit(1)
  }

  console.log(JSON.stringify(result, null, 2))
}

main().catch(console.error)
