import { Database } from 'bun:sqlite'
import { sql } from 'postgres'

const DB_PATH = process.env.DB_PATH || './data/shakespeare.db'
const TARGET_URL = process.env.DATABASE_URL

if (!TARGET_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const source = new Database(DB_PATH)
const target = sql(TARGET_URL)

const tables = [
  'users', 'purchases', 'sessions', 'verification_codes',
  'resources', 'reading_sessions', 'study_activity',
  'learned_words', 'game_sessions', 'exam_sessions',
  'booked_sessions', 'offers', 'output_history',
  'stripe_events', 'subscription_transactions'
]

async function migrateTable(tableName: string) {
  console.log(`Migrating ${tableName}...`)
  const rows = source.query(`SELECT * FROM ${tableName}`).all()
  console.log(`  Found ${rows.length} rows`)

  for (const row of rows) {
    const cols = Object.keys(row)
    const values = Object.values(row)

    const snakeRow: Record<string, any> = {}
    for (const [key, value] of Object.entries(row)) {
      const snakeKey = key.replace(/[A-Z]/g, l => '_' + l.toLowerCase())
      snakeRow[snakeKey] = value
    }

    const colsStr = Object.keys(snakeRow).join(', ')
    const placeholders = Object.keys(snakeRow).map((_, i) => `$${i + 1}`).join(', ')

    try {
      await target.unsafe(
        `INSERT INTO ${tableName} (${colsStr}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        Object.values(snakeRow)
      )
    } catch (err) {
      console.error(`  Error inserting into ${tableName}:`, err)
    }
  }
  console.log(`  Done ${tableName}`)
}

async function main() {
  console.log('Starting migration from SQLite to PostgreSQL...')
  console.log(`Source: ${DB_PATH}`)
  console.log(`Target: ${TARGET_URL}`)

  for (const table of tables) {
    await migrateTable(table)
  }

  console.log('Migration complete!')
  source.close()
  await target.end()
}

main().catch(console.error)