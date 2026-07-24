import { Database } from 'bun:sqlite'
import { verifyToken } from '@clerk/backend'

const DB_PATH = './data/shakespeare.db'
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY

if (!CLERK_SECRET_KEY) {
  console.error('CLERK_SECRET_KEY not found in environment')
  process.exit(1)
}

async function getClerkUsers(): Promise<any[]> {
  const users: any[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await fetch(`https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`, {
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Clerk API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    users.push(...data)

    if (data.length < limit) {
      break
    }

    offset += limit
    console.log(`Fetched ${users.length} users so far...`)
  }

  return users
}

function getDb() {
  return new Database(DB_PATH)
}

function createUserIfNotExists(db: Database, clerkUser: any): { created: boolean; clerkId: string } {
  const existingUser = db.query('SELECT id FROM users WHERE clerkId = ?').get(clerkUser.id)

  if (existingUser) {
    return { created: false, clerkId: clerkUser.id }
  }

  const email = clerkUser.email_addresses?.[0]?.email_address || ''
  const name = clerkUser.first_name && clerkUser.last_name
    ? `${clerkUser.first_name} ${clerkUser.last_name}`
    : clerkUser.first_name || email

  const now = new Date().toISOString()

  db.run(`
    INSERT INTO users (id, email, name, clerkId, role, createdAt, days_left, subscription_end, is_new_user, has_used_free_days)
    VALUES (?, ?, ?, ?, 'user', ?, 0, NULL, 1, 0)
  `, clerkUser.id, email, name, clerkUser.id, now)

  return { created: true, clerkId: clerkUser.id }
}

function migrateGhostData(db: Database, clerkUserId: string) {
  db.run('UPDATE resources SET userId = ? WHERE userId = ?', clerkUserId, clerkUserId)
  db.run('UPDATE study_activity SET userId = ? WHERE userId = ?', clerkUserId, clerkUserId)
  db.run('UPDATE learned_words SET userId = ? WHERE userId = ?', clerkUserId, clerkUserId)
  db.run('UPDATE reading_sessions SET userId = ? WHERE userId = ?', clerkUserId, clerkUserId)
  db.run('UPDATE exam_sessions SET userId = ? WHERE userId = ?', clerkUserId, clerkUserId)
  db.run('UPDATE game_sessions SET userId = ? WHERE userId = ?', clerkUserId, clerkUserId)
}

async function main() {
  console.log('🚀 Starting Clerk to Local DB migration...\n')

  const db = getDb()

  console.log('📡 Fetching users from Clerk API...')
  let clerkUsers: any[]

  try {
    clerkUsers = await getClerkUsers()
  } catch (err) {
    console.error('Failed to fetch Clerk users:', err)
    process.exit(1)
  }

  console.log(`Found ${clerkUsers.length} users in Clerk\n`)

  let created = 0
  let existing = 0

  for (const clerkUser of clerkUsers) {
    const result = createUserIfNotExists(db, clerkUser)

    if (result.created) {
      created++
      console.log(`✅ Created user: ${clerkUser.id} (${clerkUser.email_addresses?.[0]?.email_address || 'no email'})`)

      migrateGhostData(db, result.clerkId)
      console.log(`   📦 Associated ghost data to user`)
    } else {
      existing++
      console.log(`⏭️  User already exists: ${clerkUser.id}`)
    }
  }

  console.log('\n📊 Migration Summary:')
  console.log(`   Total users in Clerk: ${clerkUsers.length}`)
  console.log(`   New users created: ${created}`)
  console.log(`   Users already existed: ${existing}`)

  const totalInDb = db.query('SELECT COUNT(*) as count FROM users').get() as any
  console.log(`   Total users in local DB: ${totalInDb.count}`)

  db.close()
  console.log('\n✨ Migration complete!')
}

main()
