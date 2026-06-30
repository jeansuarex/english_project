import { Hono } from 'hono'
import { getStudyActivityCollection } from '../db'
import { clerkAuth } from '../middleware/auth'

const activity = new Hono()
activity.use('*', clerkAuth)

activity.post('/log', async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
    const today = new Date().toISOString().slice(0, 10)
    const collection = getStudyActivityCollection()
    const existing = collection.findOne({ userId, date: today })
    if (existing) {
      collection.updateOne({ userId, date: today }, { $set: { count: existing.count + 1 } })
    } else {
      collection.insertOne({ userId, date: today, count: 1 })
    }
    return c.json({ ok: true })
  } catch (error) {
    console.error('Log activity error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

activity.get('/', async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
    const days = Math.min(365, Math.max(1, parseInt(c.req.query('days') || '365', 10)))
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString().slice(0, 10)
    const collection = getStudyActivityCollection()
    const rows = collection.find({ userId, date: { $gte: sinceStr } }).toArray()
    return c.json(rows.map((r: any) => ({ date: r.date, count: r.count })))
  } catch (error) {
    console.error('Get activity error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default activity
