import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { connectDB } from './db'

import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import resourceRoutes from './routes/resources'
import activityRoutes from './routes/activity'
import vocabularyRoutes from './routes/vocabulary'
import progressRoutes from './routes/progress'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}))

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.route('/api/auth', authRoutes)
app.route('/api/users', userRoutes)
app.route('/api/resources', resourceRoutes)
app.route('/api/activity', activityRoutes)
app.route('/api/vocabulary', vocabularyRoutes)
app.route('/api/progress', progressRoutes)

const port = parseInt(process.env.PORT || '3001')

async function start() {
  await connectDB()
  console.log(`API server running on port ${port}`)
  serve({ fetch: app.fetch, port })
}

start()
