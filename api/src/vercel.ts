import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { connectDB } from './db.postgres'

import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import resourceRoutes from './routes/resources'
import activityRoutes from './routes/activity'
import vocabularyRoutes from './routes/vocabulary'
import progressRoutes from './routes/progress'
import outputRoutes from './routes/output'
import examRoutes from './routes/exam'
import subscriptionRoutes from './routes/subscription'
import adminRoutes from './routes/admin'
import sessionsRoutes from './routes/sessions'
import profileRoutes from './routes/profile'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  credentials: true,
}))

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.route('/api/auth', authRoutes)
app.route('/api/users', userRoutes)
app.route('/api/resources', resourceRoutes)
app.route('/api/activity', activityRoutes)
app.route('/api/vocabulary', vocabularyRoutes)
app.route('/api/progress', progressRoutes)
app.route('/api/output', outputRoutes)
app.route('/api/exam', examRoutes)
app.route('/api/subscription', subscriptionRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/sessions', sessionsRoutes)
app.route('/api/profile', profileRoutes)

await connectDB()

export default app