import { Hono } from 'hono'
import { z } from 'zod'
import { getExamsCollection, getAttemptsCollection } from '../db'

const exams = new Hono()

const QuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['multiple_choice', 'essay', 'fill_blank']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  points: z.number().default(1),
})

const CreateExamSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  duration: z.number().min(1),
  questions: z.array(QuestionSchema),
  passingScore: z.number().min(0).max(100).default(70),
  price: z.number().min(0),
})

const UpdateExamSchema = CreateExamSchema.partial()

exams.get('/', async (c) => {
  try {
    const examsCollection = getExamsCollection()
    const allExams = await examsCollection.find({}).toArray()
    const examsWithCount = allExams.map((exam) => ({
      ...exam,
      questionsCount: exam.questions?.length || 0,
    }))
    return c.json(examsWithCount)
  } catch (error) {
    console.error('Get exams error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

exams.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const examsCollection = getExamsCollection()
    const exam = await examsCollection.findOne({ _id: id })
    if (!exam) {
      return c.json({ error: 'Exam not found' }, 404)
    }
    return c.json(exam)
  } catch (error) {
    console.error('Get exam error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

exams.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const data = CreateExamSchema.parse(body)
    const exam = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    }
    const examsCollection = getExamsCollection()
    const result = await examsCollection.insertOne(exam)
    return c.json({ id: result.insertedId, ...exam }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid data', details: error.errors }, 400)
    }
    console.error('Create exam error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

exams.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = UpdateExamSchema.parse(body)
    const examsCollection = getExamsCollection()
    const result = await examsCollection.findOneAndUpdate(
      { _id: id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result) {
      return c.json({ error: 'Exam not found' }, 404)
    }
    return c.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid data', details: error.errors }, 400)
    }
    console.error('Update exam error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

exams.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const examsCollection = getExamsCollection()
    const result = await examsCollection.deleteOne({ _id: id })
    if (result.deletedCount === 0) {
      return c.json({ error: 'Exam not found' }, 404)
    }
    return c.json({ message: 'Exam deleted' })
  } catch (error) {
    console.error('Delete exam error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default exams
