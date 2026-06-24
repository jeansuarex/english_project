import { Hono } from 'hono'
import { z } from 'zod'
import { getAttemptsCollection, getExamsCollection, getUsersCollection } from '../db'

const attempts = new Hono()

const StartExamSchema = z.object({
  examId: z.string(),
  userId: z.string(),
})

const SubmitExamSchema = z.object({
  attemptId: z.string(),
  answers: z.record(z.string(), z.string()),
})

attempts.post('/start', async (c) => {
  try {
    const body = await c.req.json()
    const data = StartExamSchema.parse(body)

    const examsCollection = getExamsCollection()
    const exam = await examsCollection.findOne({ _id: data.examId })
    if (!exam) {
      return c.json({ error: 'Exam not found' }, 404)
    }

    const usersCollection = getUsersCollection()
    const user = await usersCollection.findOne({ _id: data.userId })
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    if (user.examsRemaining <= 0) {
      return c.json({ error: 'No exams remaining. Please upgrade your plan.' }, 403)
    }

    const attemptsCollection = getAttemptsCollection()
    const existingAttempt = await attemptsCollection.findOne({
      userId: data.userId,
      examId: data.examId,
      status: 'in_progress',
    })

    if (existingAttempt) {
      return c.json({
        id: existingAttempt._id.toString(),
        examId: existingAttempt.examId,
        status: existingAttempt.status,
        startedAt: existingAttempt.startedAt,
        exam: {
          title: exam.title,
          description: exam.description,
          duration: exam.duration,
          questions: exam.questions,
        },
      })
    }

    const attempt = {
      userId: data.userId,
      examId: data.examId,
      startedAt: new Date(),
      submittedAt: null,
      status: 'in_progress',
      answers: {},
      score: null,
      passingScore: exam.passingScore,
    }

    const result = await attemptsCollection.insertOne(attempt)
    return c.json({
      id: result.insertedId.toString(),
      examId: data.examId,
      status: 'in_progress',
      startedAt: attempt.startedAt,
      exam: {
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        questions: exam.questions,
      },
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid data', details: error.errors }, 400)
    }
    console.error('Start exam error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

attempts.post('/submit', async (c) => {
  try {
    const body = await c.req.json()
    const data = SubmitExamSchema.parse(body)

    const attemptsCollection = getAttemptsCollection()
    const attempt = await attemptsCollection.findOne({ _id: data.attemptId })
    if (!attempt) {
      return c.json({ error: 'Attempt not found' }, 404)
    }
    if (attempt.status !== 'in_progress') {
      return c.json({ error: 'Exam already submitted' }, 400)
    }

    const examsCollection = getExamsCollection()
    const exam = await examsCollection.findOne({ _id: attempt.examId })
    if (!exam) {
      return c.json({ error: 'Exam not found' }, 404)
    }

    let totalPoints = 0
    let earnedPoints = 0
    for (const question of exam.questions) {
      totalPoints += question.points
      const userAnswer = data.answers[question.id]
      if (question.type === 'essay') {
        if (userAnswer && userAnswer.trim().length > 20) {
          earnedPoints += question.points
        }
      } else if (userAnswer === question.correctAnswer) {
        earnedPoints += question.points
      }
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
    const passed = score >= attempt.passingScore

    await attemptsCollection.findOneAndUpdate(
      { _id: data.attemptId },
      {
        $set: {
          answers: data.answers,
          submittedAt: new Date(),
          status: 'completed',
          score,
          passed,
        },
      }
    )

    const usersCollection = getUsersCollection()
    const user = await usersCollection.findOne({ _id: attempt.userId })
    if (user) {
      const newExamsCompleted = (user.examsCompleted || 0) + 1
      const newTotalScore = (user.totalScore || 0) + score
      const newAverageScore = Math.round(newTotalScore / newExamsCompleted)
      const newExamsRemaining = Math.max(0, (user.examsRemaining || 0) - 1)
      await usersCollection.findOneAndUpdate(
        { _id: attempt.userId },
        {
          $set: {
            examsCompleted: newExamsCompleted,
            totalScore: newTotalScore,
            averageScore: newAverageScore,
            examsRemaining: newExamsRemaining,
          },
        }
      )
    }

    return c.json({
      id: data.attemptId,
      score,
      passed,
      passingScore: attempt.passingScore,
      totalPoints,
      earnedPoints,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid data', details: error.errors }, 400)
    }
    console.error('Submit exam error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

attempts.get('/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const attemptsCollection = getAttemptsCollection()
    const examsCollection = getExamsCollection()

    const userAttempts = await attemptsCollection.find({ userId }).sort({ startedAt: -1 }).toArray()
    const attemptsWithExamDetails = await Promise.all(
      userAttempts.map(async (attempt) => {
        const exam = await examsCollection.findOne({ _id: attempt.examId })
        return {
          id: attempt._id.toString(),
          examId: attempt.examId,
          examTitle: exam?.title || 'Unknown Exam',
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          status: attempt.status,
          score: attempt.score,
          passed: attempt.passed,
        }
      })
    )

    return c.json(attemptsWithExamDetails)
  } catch (error) {
    console.error('Get user attempts error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

attempts.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const attemptsCollection = getAttemptsCollection()
    const examsCollection = getExamsCollection()

    const attempt = await attemptsCollection.findOne({ _id: id })
    if (!attempt) {
      return c.json({ error: 'Attempt not found' }, 404)
    }

    const exam = await examsCollection.findOne({ _id: attempt.examId })
    return c.json({
      id: attempt._id.toString(),
      userId: attempt.userId,
      examId: attempt.examId,
      examTitle: exam?.title || 'Unknown Exam',
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      status: attempt.status,
      answers: attempt.answers,
      score: attempt.score,
      passed: attempt.passed,
      passingScore: attempt.passingScore,
    })
  } catch (error) {
    console.error('Get attempt error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default attempts
