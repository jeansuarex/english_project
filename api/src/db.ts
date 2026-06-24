import { Database } from 'bun:sqlite'
import { randomBytes } from 'crypto'

let db: Database | null = null

const DB_PATH = process.env.DB_PATH || './data/shakespeare.db'

function genId(): string {
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
    id TEXT PRIMARY KEY, email TEXT, name TEXT, plan TEXT DEFAULT 'individual',
    examsRemaining INTEGER DEFAULT 0, examsCompleted INTEGER DEFAULT 0,
    totalScore INTEGER DEFAULT 0, averageScore INTEGER DEFAULT 0,
    createdAt TEXT, clerkId TEXT, role TEXT DEFAULT 'user'
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY, userId TEXT, status TEXT,
    scheduledDate TEXT, activatedAt TEXT, expiresAt TEXT, completedAt TEXT,
    score INTEGER, proficiencyLevel TEXT, responses TEXT, feedback TEXT,
    createdAt TEXT, updatedAt TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS test_links (
    id TEXT PRIMARY KEY, token TEXT, testId TEXT, userId TEXT,
    used INTEGER DEFAULT 0, expiresAt TEXT, createdAt TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY, userId TEXT, plan TEXT, status TEXT,
    stripeSubscriptionId TEXT, stripeCustomerId TEXT,
    currentPeriodStart TEXT, currentPeriodEnd TEXT,
    cancelAtPeriodEnd INTEGER DEFAULT 0, createdAt TEXT, updatedAt TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY, title TEXT, description TEXT,
    duration INTEGER, passingScore INTEGER DEFAULT 70, price INTEGER,
    isActive INTEGER DEFAULT 1, questions TEXT, createdAt TEXT, updatedAt TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY, userId TEXT, examId TEXT,
    startedAt TEXT, submittedAt TEXT, status TEXT,
    answers TEXT, score INTEGER, passingScore INTEGER, passed INTEGER
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS exam_sessions (
    id TEXT PRIMARY KEY, userId TEXT, examId TEXT,
    sessionToken TEXT, sessionCode TEXT, status TEXT,
    startedAt TEXT, submittedAt TEXT, answers TEXT, score INTEGER,
    createdAt TEXT, expiresAt TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS magic_links (
    id TEXT PRIMARY KEY, token TEXT, examId TEXT, email TEXT,
    createdAt TEXT, expiresAt TEXT, used INTEGER DEFAULT 0, usedAt TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, token TEXT, userId TEXT,
    createdAt TEXT, expiresAt TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS verification_codes (
    id TEXT PRIMARY KEY, email TEXT, code TEXT,
    createdAt TEXT, expiresAt TEXT, used INTEGER DEFAULT 0
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY, userId TEXT, amount INTEGER,
    status TEXT, stripePaymentId TEXT, createdAt TEXT
  )`)

  // Indexes for common queries
  db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
  db.run('CREATE INDEX IF NOT EXISTS idx_users_clerkId ON users(clerkId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_tests_userId ON tests(userId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_test_links_token ON test_links(token)')
  db.run('CREATE INDEX IF NOT EXISTS idx_subs_userId ON subscriptions(userId)')
  db.run('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)')
  db.run('CREATE INDEX IF NOT EXISTS idx_exam_sessions_token ON exam_sessions(sessionToken)')
  db.run('CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token)')
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
    if (key === 'used' || key === 'cancelAtPeriodEnd' || key === 'isActive' || key === 'passed') {
      doc[key] = toBool(value)
    } else if (key === 'responses' || key === 'feedback' || key === 'questions' || key === 'answers') {
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
    if (key === 'used' || key === 'cancelAtPeriodEnd' || key === 'isActive' || key === 'passed') {
      flat[key] = value ? 1 : 0
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
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
  if (setFields.cancelAtPeriodEnd !== undefined) setFields.cancelAtPeriodEnd = setFields.cancelAtPeriodEnd ? 1 : 0
  if (setFields.isActive !== undefined) setFields.isActive = setFields.isActive ? 1 : 0
  if (setFields.passed !== undefined) setFields.passed = setFields.passed ? 1 : 0
  if (setFields.updatedAt !== undefined && typeof setFields.updatedAt === 'string') { /* keep */ }

  for (const [k, v] of Object.entries(setFields)) {
    if (v !== null && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      // keep scalar — don't JSON.stringify flat objects like planLimits
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
    if (updated && 'passed' in update && '$set' in update) {
      updated.passed = (update.$set as any).passed ?? updated.passed
    }
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
export function getTestsCollection(): Collection { return coll('tests') }
export function getTestLinksCollection(): Collection { return coll('test_links') }
export function getSubscriptionsCollection(): Collection { return coll('subscriptions') }
export function getExamsCollection(): Collection { return coll('exams') }
export function getAttemptsCollection(): Collection { return coll('attempts') }
export function getExamSessionsCollection(): Collection { return coll('exam_sessions') }
export function getMagicLinksCollection(): Collection { return coll('magic_links') }
export function getSessionsCollection(): Collection { return coll('sessions') }
export function getVerificationCodesCollection(): Collection { return coll('verification_codes') }
export function getPaymentsCollection(): Collection { return coll('payments') }

export async function closeDB(): Promise<void> {
  if (db) {
    db.close()
    db = null
  }
}
