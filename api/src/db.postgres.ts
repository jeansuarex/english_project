import postgres from 'postgres'
import { randomBytes } from 'crypto'

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) throw new Error('DATABASE_URL is required')

// prepare:false is required with Neon's pooled connection (PgBouncer in
// transaction mode). With prepared statements enabled, a SELECT issued right
// after a write can hit a pooled backend without the cached plan and return
// stale/empty results, so read-after-write appeared to "not persist".
const db = postgres(DB_URL, { prepare: false })

let initialized = false

export function genId(): string {
  return randomBytes(16).toString('hex')
}

export async function connectDB(): Promise<void> {
  if (initialized) return
  await createTables()
  initialized = true
}

async function createTables() {
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      created_at TEXT,
      clerk_id TEXT UNIQUE,
      role TEXT DEFAULT 'user',
      days_left INTEGER DEFAULT 0,
      subscription_end TEXT,
      is_new_user INTEGER DEFAULT 1,
      has_used_free_days INTEGER DEFAULT 0,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      subscription_status TEXT DEFAULT 'none',
      subscription_start_date TEXT,
      last_payment_date TEXT,
      updated_at TEXT
    )
  `

  await db`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
  await db`CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id)`
  await db`CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id)`
  await db`CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id)`

  await db`
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      stripe_session_id TEXT,
      amount INTEGER,
      days INTEGER,
      status TEXT DEFAULT 'pending',
      created_at TEXT
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id)`
  await db`CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session ON purchases(stripe_session_id)`

  await db`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token TEXT,
      user_id TEXT,
      created_at TEXT,
      expires_at TEXT
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`

  await db`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id TEXT PRIMARY KEY,
      email TEXT,
      code TEXT,
      created_at TEXT,
      expires_at TEXT,
      used INTEGER DEFAULT 0
    )
  `

  await db`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      filename TEXT,
      data BYTEA,
      created_at TEXT
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id)`

  await db`
    CREATE TABLE IF NOT EXISTS reading_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      resource_id TEXT,
      vocabulary TEXT,
      last_page INTEGER DEFAULT 1,
      updated_at TEXT
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_id ON reading_sessions(user_id)`
  await db`CREATE INDEX IF NOT EXISTS idx_reading_sessions_resource_id ON reading_sessions(resource_id)`

  await db`
    CREATE TABLE IF NOT EXISTS study_activity (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      date TEXT,
      count INTEGER DEFAULT 1
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_study_activity_user_id ON study_activity(user_id)`
  await db`CREATE INDEX IF NOT EXISTS idx_study_activity_date ON study_activity(date)`

  await db`
    CREATE TABLE IF NOT EXISTS learned_words (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      word TEXT,
      learned_at TEXT,
      UNIQUE(user_id, word)
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_learned_words_user_id ON learned_words(user_id)`

  await db`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      game_type TEXT,
      correct INTEGER DEFAULT 0,
      wrong INTEGER DEFAULT 0,
      total_rounds INTEGER DEFAULT 0,
      completed_at TEXT
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id)`

  await db`
    CREATE TABLE IF NOT EXISTS exam_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_date TEXT,
      reading TEXT,
      listening TEXT,
      writing TEXT,
      speaking TEXT
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_id ON exam_sessions(user_id)`

  await db`
    CREATE TABLE IF NOT EXISTS booked_sessions (
      id TEXT PRIMARY KEY,
      teacher_id TEXT,
      student_id TEXT,
      session_datetime TEXT,
      topic TEXT,
      status TEXT DEFAULT 'pending',
      price INTEGER DEFAULT 50,
      created_at TEXT
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_booked_sessions_student_id ON booked_sessions(student_id)`
  await db`CREATE INDEX IF NOT EXISTS idx_booked_sessions_teacher_id ON booked_sessions(teacher_id)`

  await db`
    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      discount INTEGER,
      type TEXT,
      description TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_offers_code ON offers(code)`

  await db`
    CREATE TABLE IF NOT EXISTS output_history (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      question TEXT,
      level TEXT,
      level_reason TEXT,
      feedback TEXT,
      completed_at TEXT
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_output_history_user_id ON output_history(user_id)`

  await db`
    CREATE TABLE IF NOT EXISTS stripe_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      processed_at TEXT NOT NULL
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(event_type)`

  await db`
    CREATE TABLE IF NOT EXISTS subscription_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      stripe_session_id TEXT,
      stripe_subscription_id TEXT,
      price_id TEXT,
      days_added INTEGER,
      amount_paid INTEGER,
      status TEXT,
      transaction_date TEXT,
      created_at TEXT
    )
  `
  await db`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON subscription_transactions(user_id)`
}

type QueryValue = string | number | boolean | null | undefined | Date | { $gt?: any; $gte?: any; $lt?: any; $lte?: any; $ne?: any }
type Query = Record<string, QueryValue>
type UpdateOp = { $set?: Record<string, any> } | Record<string, any>

function toBool(v: any): boolean {
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'boolean') return v
  return !!v
}

function snakeToCamel(obj: any): any {
  if (!obj) return null
  const result: any = { _id: obj.id }
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'id') continue
    const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase())
    if (key === 'used') {
      result[camelKey] = toBool(value)
    } else if (camelKey === 'vocabulary') {
      try { result[camelKey] = JSON.parse(value as string) } catch { result[camelKey] = value }
    } else {
      result[camelKey] = value
    }
  }
  return result
}

function camelToSnake(obj: any): any {
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_id') continue
    const snakeKey = key.replace(/[A-Z]/g, l => '_' + l.toLowerCase())
    if (key === 'used') {
      result[snakeKey] = value ? 1 : 0
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date) && !(value instanceof Uint8Array) && !Array.isArray(value)) {
      result[snakeKey] = JSON.stringify(value)
    } else if (value instanceof Date) {
      result[snakeKey] = value.toISOString()
    } else {
      result[snakeKey] = value
    }
  }
  return result
}

// Map a query key (camelCase) to its Postgres column name (snake_case),
// matching the conversion used when writing rows (camelToSnake). Keys that are
// already snake_case pass through unchanged.
function toColumn(key: string): string {
  if (key === '_id') return 'id'
  return key.replace(/[A-Z]/g, l => '_' + l.toLowerCase())
}

// startIndex is the number of placeholders already consumed before this WHERE
// clause (e.g. by a SET list in UPDATE), so $N numbering continues correctly
// instead of colliding with earlier params.
function buildWhereClause(query: Query, startIndex = 0): { sql: string; params: any[] } {
  const conditions: string[] = []
  const params: any[] = []
  const ph = () => `$${startIndex + params.length + 1}`

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      conditions.push(`${toColumn(key)} IS NULL`)
      continue
    }

    const col = toColumn(key)

    if (typeof value === 'object' && !(value instanceof Date)) {
      const ops = value as Record<string, any>
      if (ops.$gt !== undefined) { conditions.push(`${col} > ${ph()}`); params.push(ops.$gt) }
      else if (ops.$gte !== undefined) { conditions.push(`${col} >= ${ph()}`); params.push(ops.$gte) }
      else if (ops.$lt !== undefined) { conditions.push(`${col} < ${ph()}`); params.push(ops.$lt) }
      else if (ops.$lte !== undefined) { conditions.push(`${col} <= ${ph()}`); params.push(ops.$lte) }
      else if (ops.$ne !== undefined) { conditions.push(`${col} != ${ph()}`); params.push(ops.$ne) }
    } else {
      conditions.push(`${col} = ${ph()}`)
      params.push(value)
    }
  }

  return { sql: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params }
}

interface Cursor {
  sort(sortObj: Record<string, number>): Cursor
  limit(n: number): Cursor
  skip(n: number): Cursor
  toArray(): Promise<any[]>
}

function createCursor(table: string, query: Query = {}): Cursor {
  let orderClause = ''
  let limitClause = ''
  let offsetClause = ''
  let builtQuery = buildWhereClause(query)

  return {
    sort(sortObj: Record<string, number>) {
      const parts = Object.entries(sortObj).map(([k, dir]) => {
        const col = toColumn(k)
        return `${col} ${dir === -1 ? 'DESC' : 'ASC'}`
      })
      orderClause = 'ORDER BY ' + parts.join(', ')
      return this
    },
    limit(n: number) {
      limitClause = `LIMIT ${n}`
      return this
    },
    skip(n: number) {
      offsetClause = `OFFSET ${n}`
      return this
    },
    async toArray(): Promise<any[]> {
      const sqlStr = `SELECT * FROM ${table} ${builtQuery.sql} ${orderClause} ${limitClause} ${offsetClause}`.trim()
      const rows = await db.unsafe(sqlStr, builtQuery.params)
      return rows.map(r => snakeToCamel(r))
    }
  }
}

async function findOne(table: string, query: Query = {}): Promise<any> {
  const rows = await createCursor(table, query).limit(1).toArray()
  return rows[0] || null
}

async function insertDoc(table: string, doc: any): Promise<{ insertedId: string }> {
  const _id = doc._id || genId()
  const flat = camelToSnake({ ...doc, id: _id })

  const cols = Object.keys(flat).join(', ')
  const placeholders = Object.keys(flat).map((_, i) => `$${i + 1}`).join(', ')
  const values = Object.values(flat) as any[]

  await db.unsafe(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values)
  return { insertedId: _id }
}

async function updateOne(table: string, query: Query, update: UpdateOp) {
  let setFields: Record<string, any> = {}
  if ('$set' in update && update.$set) {
    setFields = { ...update.$set }
  } else {
    setFields = { ...update }
  }
  delete (setFields as any)._id

  const flat = camelToSnake(setFields)
  const setClauses = Object.entries(flat).map(([k], i) => `${k} = $${i + 1}`).join(', ')
  const setValues = Object.values(flat)

  if (!setClauses) return

  // WHERE placeholders must continue after the SET placeholders, or a shared
  // $1 would force conflicting type inference across columns.
  const where = buildWhereClause(query, setValues.length)
  await db.unsafe(`UPDATE ${table} SET ${setClauses} ${where.sql}`, [...setValues, ...where.params])
}

async function deleteOne(table: string, query: Query) {
  const where = buildWhereClause(query)
  const result = await db.unsafe(`DELETE FROM ${table} ${where.sql}`, where.params)
  return { deletedCount: result.length }
}

async function deleteMany(table: string, query: Query = {}) {
  const where = buildWhereClause(query)
  const result = await db.unsafe(`DELETE FROM ${table} ${where.sql}`, where.params)
  return { deletedCount: result.length }
}

async function insertMany(table: string, docs: any[]) {
  const ids = await Promise.all(docs.map(doc => insertDoc(table, doc)))
  return { insertedIds: ids.map(i => i.insertedId), insertedCount: ids.length }
}

async function countDocuments(table: string, query: Query = {}) {
  const where = buildWhereClause(query)
  const [row] = await db`SELECT COUNT(*) as count FROM ${db(table)} ${db.unsafe(where.sql, where.params)}`
  return row?.count || 0
}

async function findOneAndUpdate(table: string, query: Query, update: UpdateOp, options?: { returnDocument?: 'after' | 'before' }) {
  const doc = await findOne(table, query)
  if (!doc) return null
  await updateOne(table, query, update)

  if (options?.returnDocument === 'after') {
    return await findOne(table, query)
  }
  return doc
}

type Collection = {
  findOne: (query: Query) => Promise<any>
  find: (query?: Query) => ReturnType<typeof createCursor>
  insertOne: (doc: any) => Promise<{ insertedId: string }>
  insertMany: (docs: any[]) => Promise<{ insertedIds: string[]; insertedCount: number }>
  updateOne: (query: Query, update: UpdateOp) => Promise<void>
  deleteOne: (query: Query) => Promise<{ deletedCount: number }>
  deleteMany: (query?: Query) => Promise<{ deletedCount: number }>
  countDocuments: (query?: Query) => Promise<number>
  findOneAndUpdate: (query: Query, update: UpdateOp, options?: { returnDocument?: 'after' | 'before' }) => Promise<any>
}

function coll(table: string): Collection {
  return {
    findOne: (q) => findOne(table, q),
    find: (q) => createCursor(table, q || {}),
    insertOne: (doc) => insertDoc(table, doc),
    insertMany: (docs) => insertMany(table, docs),
    updateOne: (q, u) => updateOne(table, q, u),
    deleteOne: (q) => deleteOne(table, q),
    deleteMany: (q) => deleteMany(table, q || {}),
    countDocuments: (q) => countDocuments(table, q || {}),
    findOneAndUpdate: (q, u, opts) => findOneAndUpdate(table, q, u, opts),
  }
}

export { db }

export function getUsersCollection(): Collection { return coll('users') }
export function getSessionsCollection(): Collection { return coll('sessions') }
export function getVerificationCodesCollection(): Collection { return coll('verification_codes') }
export function getResourcesCollection(): Collection { return coll('resources') }
export function getReadingSessionsCollection(): Collection { return coll('reading_sessions') }
export function getStudyActivityCollection(): Collection { return coll('study_activity') }
export function getLearnedWordsCollection(): Collection { return coll('learned_words') }
export function getGameSessionsCollection(): Collection { return coll('game_sessions') }
export function getExamSessionsCollection(): Collection { return coll('exam_sessions') }
export function getPurchasesCollection(): Collection { return coll('purchases') }
export function getStripeEventsCollection(): Collection { return coll('stripe_events') }
export function getSubscriptionTransactionsCollection(): Collection { return coll('subscription_transactions') }
export function getBookedSessionsCollection(): Collection { return coll('booked_sessions') }
export function getOffersCollection(): Collection { return coll('offers') }
export function getOutputHistoryCollection(): Collection { return coll('output_history') }

export async function closeDB(): Promise<void> {
  // postgres.js doesn't need explicit close
}