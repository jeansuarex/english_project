import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { connectDB } from './db'

import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import testRoutes from './routes/tests'
import subscriptionRoutes from './routes/subscriptions'
import paymentRoutes from './routes/payments'
import examRoutes from './routes/exams'
import attemptRoutes from './routes/attempts'
import sessionRoutes from './routes/sessions'
import emailRoutes from './routes/email'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}))

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.route('/api/auth', authRoutes)
app.route('/api/users', userRoutes)
app.route('/api/tests', testRoutes)
app.route('/api/subscriptions', subscriptionRoutes)
app.route('/api/payments', paymentRoutes)
app.route('/api/exams', examRoutes)
app.route('/api/attempts', attemptRoutes)
app.route('/api/sessions', sessionRoutes)
app.route('/api/email', emailRoutes)

const port = parseInt(process.env.PORT || '3001')

async function start() {
  await connectDB()
  console.log(`API server running on port ${port}`)
  serve({ fetch: app.fetch, port })
}

start()
