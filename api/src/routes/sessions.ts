import { Hono } from 'hono'
import { getBookedSessionsCollection, getUsersCollection, genId } from '../db'

const app = new Hono()

app.get('/', async (c) => {
  const bookedSessions = getBookedSessionsCollection()
  const users = getUsersCollection()
  const clerkUserId = c.req.query('clerkUserId')

  let sessions
  if (clerkUserId) {
    sessions = await bookedSessions.find({ student_id: clerkUserId }).toArray()
  } else {
    sessions = await bookedSessions.find({}).toArray()
  }

  const result = []
  for (const session of sessions) {
    let teacher = await users.findOne({ clerkId: session.teacher_id })
    if (!teacher) {
      const allUsers = await users.find({}).toArray()
      teacher = allUsers.find(u => u.name?.toLowerCase() === session.teacher_id?.toLowerCase())
    }
    const student = await users.findOne({ clerkId: session.student_id })
    result.push({
      id: session.id,
      teacherName: teacher?.name || teacher?.email || session.teacher_id || 'Unknown',
      studentName: student?.name || student?.email || 'Unknown',
      sessionDatetime: session.session_datetime,
      topic: session.topic,
      status: session.status,
      price: session.price,
      createdAt: session.created_at
    })
  }

  return c.json({ sessions: result })
})

app.post('/', async (c) => {
  const { teacherId, studentId, sessionDatetime, topic } = await c.req.json()
  const bookedSessions = getBookedSessionsCollection()

  const now = new Date().toISOString()
  const session = {
    id: genId(),
    teacher_id: teacherId,
    student_id: studentId,
    session_datetime: sessionDatetime,
    topic: topic || 'English Conversation',
    status: 'pending',
    price: 50,
    created_at: now
  }

  await bookedSessions.insertOne(session)

  return c.json({ success: true, session })
})

app.patch('/:id/confirm', async (c) => {
  const { id } = c.req.param()
  const bookedSessions = getBookedSessionsCollection()

  await bookedSessions.updateOne({ id }, { $set: { status: 'confirmed' } })

  return c.json({ success: true })
})

app.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const bookedSessions = getBookedSessionsCollection()

  await bookedSessions.deleteOne({ id })

  return c.json({ success: true })
})

export default app