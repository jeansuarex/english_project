import { Database } from 'bun:sqlite'
import { randomBytes } from 'crypto'

let db: Database | null = null

const DB_PATH = process.env.DB_PATH || './data/shakespeare.db'

export function genId(): string {
  return randomBytes(16).toString('hex')
}

export async function connectDB(): Promise<void> {
  if (db) return
  db = new Database(DB_PATH, { create: true })
  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')
  createTables()
}

function createTables() {
  if (!db) throw new Error('Database not connected')

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT, name TEXT,
    createdAt TEXT, clerkId TEXT, role TEXT DEFAULT 'user',
    days_left INTEGER DEFAULT 0, subscription_end TEXT,
    is_new_user INTEGER DEFAULT 1, has_used_free_days INTEGER DEFAULT 0
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY, userId TEXT, stripe_session_id TEXT,
    amount INTEGER, days INTEGER, status TEXT DEFAULT 'pending',
    createdAt TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, token TEXT, userId TEXT,
    createdAt TEXT, expiresAt TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS verification_codes (
    id TEXT PRIMARY KEY, email TEXT, code TEXT,
    createdAt TEXT, expiresAt TEXT, used INTEGER DEFAULT 0
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY, userId TEXT, title TEXT,
    filename TEXT, data BLOB, createdAt TEXT
  )`)
  // Migrate from old schema (storagePath) to new schema (data BLOB)
  try { db.run('ALTER TABLE resources DROP COLUMN storagePath') } catch { }

  db.run(`CREATE TABLE IF NOT EXISTS reading_sessions (
    id TEXT PRIMARY KEY, userId TEXT, resourceId TEXT,
    vocabulary TEXT, lastPage INTEGER DEFAULT 1, updatedAt TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS study_activity (
    id TEXT PRIMARY KEY, userId TEXT, date TEXT, count INTEGER DEFAULT 1
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS learned_words (
    id TEXT PRIMARY KEY, userId TEXT, word TEXT, learnedAt TEXT,
    UNIQUE(userId, word)
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY, userId TEXT, gameType TEXT,
    correct INTEGER DEFAULT 0, wrong INTEGER DEFAULT 0,
    totalRounds INTEGER DEFAULT 0, completedAt TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS exam_sessions (
    id TEXT PRIMARY KEY, userId TEXT, sessionDate TEXT,
    reading TEXT, listening TEXT, writing TEXT, speaking TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS booked_sessions (
    id TEXT PRIMARY KEY, teacher_id TEXT, student_id TEXT,
    session_datetime TEXT, topic TEXT, status TEXT DEFAULT 'pending',
    price INTEGER DEFAULT 50, created_at TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY, code TEXT UNIQUE, discount INTEGER,
    type TEXT, description TEXT, active INTEGER DEFAULT 1,
    createdAt TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS output_history (
    id TEXT PRIMARY KEY, userId TEXT, question TEXT,
    level TEXT, levelReason TEXT, feedback TEXT,
    completedAt TEXT
  )`)

  // Indexes for common queries
  db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
  db.run('CREATE INDEX IF NOT EXISTS idx_users_clerkId ON users(clerkId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)')
  db.run('CREATE INDEX IF NOT EXISTS idx_resources_userId ON resources(userId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_reading_sessions_userId ON reading_sessions(userId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_reading_sessions_resourceId ON reading_sessions(resourceId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_study_activity_userId ON study_activity(userId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_study_activity_date ON study_activity(date)')
  db.run('CREATE INDEX IF NOT EXISTS idx_learned_words_userId ON learned_words(userId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_game_sessions_userId ON game_sessions(userId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_exam_sessions_userId ON exam_sessions(userId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_purchases_userId ON purchases(userId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session ON purchases(stripe_session_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_booked_sessions_student_id ON booked_sessions(student_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_booked_sessions_teacher_id ON booked_sessions(teacher_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_offers_code ON offers(code)')
  db.run('CREATE INDEX IF NOT EXISTS idx_output_history_userId ON output_history(userId)')

  migrateUsersTable()
  createStripeTables()
}

function migrateUsersTable() {
  if (!db) return
  try {
    db.run("ALTER TABLE users ADD COLUMN days_left INTEGER DEFAULT 0")
  } catch { }
  try {
    db.run("ALTER TABLE users ADD COLUMN subscription_end TEXT")
  } catch { }
  try {
    db.run("ALTER TABLE users ADD COLUMN is_new_user INTEGER DEFAULT 1")
  } catch { }
  try {
    db.run("ALTER TABLE users ADD COLUMN has_used_free_days INTEGER DEFAULT 0")
  } catch { }
  try {
    db.run("ALTER TABLE users ADD COLUMN stripe_customer_id TEXT")
  } catch { }
  try {
    db.run("ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT")
  } catch { }
  try {
    db.run("ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'none'")
  } catch { }
  try {
    db.run("ALTER TABLE users ADD COLUMN subscription_start_date TEXT")
  } catch { }
  try {
    db.run("ALTER TABLE users ADD COLUMN last_payment_date TEXT")
  } catch { }
  try {
    db.run("ALTER TABLE users ADD COLUMN updatedAt TEXT")
  } catch { }
}

function createStripeTables() {
  if (!db) return

  db.run(`CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at TEXT NOT NULL
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS subscription_transactions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    stripe_session_id TEXT,
    stripe_subscription_id TEXT,
    price_id TEXT,
    days_added INTEGER,
    amount_paid INTEGER,
    status TEXT,
    transaction_date TEXT,
    createdAt TEXT
  )`)

  db.run('CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(event_type)')
  db.run('CREATE INDEX IF NOT EXISTS idx_transactions_userId ON subscription_transactions(userId)')
}

type QueryValue = string | number | boolean | null | undefined | Date | { $gt?: any; $gte?: any; $lt?: any; $lte?: any; $ne?: any }
type Query = Record<string, QueryValue>
type UpdateOp = { $set?: Record<string, any> } | Record<string, any>

function buildWhereClause(query: Query): { sql: string; params: any[] } {
  const conditions: string[] = []
  const params: any[] = []

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      conditions.push(`${key} IS NULL`)
      continue
    }

    const col = key === '_id' ? 'id' : key

    if (typeof value === 'object' && !(value instanceof Date)) {
      const ops = value as Record<string, any>
      if (ops.$gt !== undefined) { conditions.push(`${col} > ?`); params.push(dateStr(ops.$gt)) }
      else if (ops.$gte !== undefined) { conditions.push(`${col} >= ?`); params.push(dateStr(ops.$gte)) }
      else if (ops.$lt !== undefined) { conditions.push(`${col} < ?`); params.push(dateStr(ops.$lt)) }
      else if (ops.$lte !== undefined) { conditions.push(`${col} <= ?`); params.push(dateStr(ops.$lte)) }
      else if (ops.$ne !== undefined) { conditions.push(`${col} != ?`); params.push(val(ops.$ne)) }
    } else {
      conditions.push(`${col} = ?`)
      params.push(val(value))
    }
  }

  return { sql: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params }
}

function val(v: any): any {
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'boolean') return v ? 1 : 0
  return v
}

function dateStr(v: any): string {
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string') return v
  return String(v)
}

function toBool(v: any): boolean {
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'boolean') return v
  return !!v
}

function rowToDoc(table: string, row: any): any {
  if (!row) return null
  const doc: any = { _id: row.id }
  for (const [key, value] of Object.entries(row)) {
    if (key === 'id') continue
    if (key === 'used') {
      doc[key] = toBool(value)
    } else if (key === 'vocabulary') {
      try { doc[key] = JSON.parse(value as string) } catch { doc[key] = value }
    } else {
      doc[key] = value
    }
  }
  return doc
}

function makeDoc(table: string, row: any): any {
  return rowToDoc(table, row)
}

function insertDoc(table: string, doc: any): { insertedId: string } {
  const _id = doc._id || genId()
  const flat: Record<string, any> = { id: _id }

  for (const [key, value] of Object.entries(doc)) {
    if (key === '_id') continue
    if (key === 'used') {
      flat[key] = value ? 1 : 0
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date) && !(value instanceof Uint8Array)) {
      flat[key] = JSON.stringify(value)
    } else if (value instanceof Date) {
      flat[key] = value.toISOString()
    } else {
      flat[key] = value
    }
  }

  const cols = Object.keys(flat).join(', ')
  const placeholders = Object.keys(flat).map(() => '?').join(', ')
  const values = Object.values(flat)

  if (!db) throw new Error('DB not connected')
  db.run(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, ...values)
  return { insertedId: _id }
}

function cursorFind(table: string, query: Query = {}) {
  const where = buildWhereClause(query)
  let sql = `SELECT * FROM ${table} ${where.sql}`
  const params = [...where.params]

  let orderClause = ''
  let limitClause = ''
  let offsetClause = ''

  const cursor = {
    sort(sortObj: Record<string, number>) {
      const parts = Object.entries(sortObj).map(([k, dir]) => {
        const col = k === '_id' ? 'id' : k
        return `${col} ${dir === -1 ? 'DESC' : 'ASC'}`
      })
      orderClause = 'ORDER BY ' + parts.join(', ')
      return cursor
    },
    limit(n: number) {
      limitClause = `LIMIT ${n}`
      return cursor
    },
    skip(n: number) {
      offsetClause = `OFFSET ${n}`
      return cursor
    },
    toArray(): any[] {
      const fullSql = [sql, orderClause, limitClause, offsetClause].filter(Boolean).join(' ')
      if (!db) throw new Error('DB not connected')
      const rows = db.query(fullSql).all(...params)
      return rows.map((r: any) => makeDoc(table, r))
    },
  }

  return cursor
}

function findOne(table: string, query: Query = {}): any {
  const rows = cursorFind(table, query).limit(1).toArray()
  return rows[0] || null
}

function updateOne(table: string, query: Query, update: UpdateOp) {
  const where = buildWhereClause(query)

  let setFields: Record<string, any> = {}
  if ('$set' in update && update.$set) {
    setFields = { ...update.$set }
  } else {
    setFields = { ...update }
  }
  delete (setFields as any)._id

  if (setFields.used !== undefined) setFields.used = setFields.used ? 1 : 0
  if (setFields.updatedAt !== undefined && typeof setFields.updatedAt === 'string') { /* keep */ }

  for (const [k, v] of Object.entries(setFields)) {
    if (v !== null && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      // keep scalar
    } else if (v !== null && (typeof v === 'object' || Array.isArray(v))) {
      setFields[k] = JSON.stringify(v)
    } else if (v instanceof Date) {
      setFields[k] = v.toISOString()
    }
  }

  const setClauses = Object.entries(setFields).map(([k]) => `${k} = ?`).join(', ')
  const setValues = Object.values(setFields)

  if (setClauses) {
    if (!db) throw new Error('DB not connected')
    db.run(`UPDATE ${table} SET ${setClauses} ${where.sql}`, ...setValues, ...where.params)
  }
}

function deleteOne(table: string, query: Query) {
  const where = buildWhereClause(query)
  if (!db) throw new Error('DB not connected')
  const result = db.run(`DELETE FROM ${table} ${where.sql}`, ...where.params)
  return { deletedCount: result.changes }
}

function deleteMany(table: string, query: Query = {}) {
  const where = buildWhereClause(query)
  if (!db) throw new Error('DB not connected')
  const result = db.run(`DELETE FROM ${table} ${where.sql}`, ...where.params)
  return { deletedCount: result.changes }
}

function insertMany(table: string, docs: any[]) {
  const ids = docs.map(doc => insertDoc(table, doc))
  return { insertedIds: ids.map(i => i.insertedId), insertedCount: ids.length }
}

function countDocuments(table: string, query: Query = {}) {
  const where = buildWhereClause(query)
  if (!db) throw new Error('DB not connected')
  const row = db.query(`SELECT COUNT(*) as count FROM ${table} ${where.sql}`).get(...where.params) as any
  return row?.count || 0
}

function findOneAndUpdate(table: string, query: Query, update: UpdateOp, options?: { returnDocument?: 'after' | 'before' }) {
  const doc = findOne(table, query)
  if (!doc) return null
  updateOne(table, query, update)

  if (options?.returnDocument === 'after') {
    const updated = findOne(table, query)
    return updated
  }
  return doc
}

// --- Public API (matching MongoDB collection interface) ---

type Collection = {
  findOne: (query: Query) => any
  find: (query?: Query) => ReturnType<typeof cursorFind>
  insertOne: (doc: any) => { insertedId: string }
  insertMany: (docs: any[]) => { insertedIds: string[]; insertedCount: number }
  updateOne: (query: Query, update: UpdateOp) => void
  deleteOne: (query: Query) => { deletedCount: number }
  deleteMany: (query?: Query) => { deletedCount: number }
  countDocuments: (query?: Query) => number
  findOneAndUpdate: (query: Query, update: UpdateOp, options?: { returnDocument?: 'after' | 'before' }) => any
}

function coll(table: string): Collection {
  return {
    findOne: (q) => findOne(table, q),
    find: (q) => cursorFind(table, q || {}),
    insertOne: (doc) => insertDoc(table, doc),
    insertMany: (docs) => insertMany(table, docs),
    updateOne: (q, u) => updateOne(table, q, u),
    deleteOne: (q) => deleteOne(table, q),
    deleteMany: (q) => deleteMany(table, q || {}),
    countDocuments: (q) => countDocuments(table, q || {}),
    findOneAndUpdate: (q, u, opts) => findOneAndUpdate(table, q, u, opts),
  }
}

export function getDB(): Database {
  if (!db) throw new Error('Database not connected')
  return db
}
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
  if (db) {
    db.close()
    db = null
  }
}
