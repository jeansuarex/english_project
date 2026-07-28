import { Hono } from 'hono'
import { getLearnedWordsCollection } from '../db'
import { clerkAuth } from '../middleware/auth'

const vocabulary = new Hono()
vocabulary.use('*', clerkAuth)

vocabulary.get('/learned', async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
    const collection = getLearnedWordsCollection()
    const rows = await collection.find({ userId }).sort({ learnedAt: -1 }).toArray()
    return c.json(rows.map((r: any) => ({ word: r.word, learnedAt: r.learnedAt })))
  } catch (error) {
    console.error('Get learned words error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

vocabulary.post('/learn', async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
    const { word } = await c.req.json()
    if (!word || typeof word !== 'string') {
      return c.json({ error: 'Word is required' }, 400)
    }
    const cleaned = word.trim().toLowerCase()
    if (!cleaned) return c.json({ error: 'Invalid word' }, 400)

    const collection = getLearnedWordsCollection()
    const existing = await collection.findOne({ userId, word: cleaned })
    if (!existing) {
      await collection.insertOne({ userId, word: cleaned, learnedAt: new Date().toISOString() })
    }
    return c.json({ word: cleaned, learnedAt: existing?.learnedAt || new Date().toISOString() })
  } catch (error) {
    console.error('Learn word error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

vocabulary.delete('/learn', async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
    const { word } = await c.req.json()
    if (!word || typeof word !== 'string') {
      return c.json({ error: 'Word is required' }, 400)
    }
    const cleaned = word.trim().toLowerCase()
    if (!cleaned) return c.json({ error: 'Invalid word' }, 400)

    const collection = getLearnedWordsCollection()
    await collection.deleteOne({ userId, word: cleaned })
    return c.json({ message: 'Word unlearned' })
  } catch (error) {
    console.error('Unlearn word error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default vocabulary
