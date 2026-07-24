import { Database } from 'bun:sqlite'

const DB_PATH = '../../../api/data/shakespeare.db'

let db: Database | null = null

export function getDB(): Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true })
  }
  return db
}

export function query<T>(sql: string, ...params: any[]): T[] {
  const database = getDB()
  return database.query(sql).all(...params) as T[]
}

export function queryOne<T>(sql: string, ...params: any[]): T | null {
  const database = getDB()
  return database.query(sql).get(...params) as T | null
}
