import { Hono } from 'hono'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { getResourcesCollection, getReadingSessionsCollection } from '../db'
import { clerkAuth } from '../middleware/auth'

function getUserId(c: any): string {
  return (c as any).get('clerkUserId')
}

const resources = new Hono()

function genId(): string {
  return randomBytes(12).toString('hex')
}

resources.post('/upload', clerkAuth, async (c) => {
  try {
    const contentType = c.req.header('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return c.json({ error: 'Content-Type must be multipart/form-data' }, 400)
    }

    const body = await c.req.parseBody()
    const file = body['file'] as File | undefined
    const title = body['title'] as string | undefined

    if (!file) {
      return c.json({ error: 'File is required' }, 400)
    }

    if (file.type !== 'application/pdf') {
      return c.json({ error: 'Only PDF files are allowed' }, 400)
    }

    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: 'File size must be under 5MB' }, 400)
    }

    const userId = getUserId(c)

    const resourcesCollection = getResourcesCollection()
    const count = await resourcesCollection.countDocuments({ userId })
    if (count >= 5) {
      return c.json({ error: 'Máximo 5 PDFs por usuario' }, 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const resource = {
      userId,
      title: title || file.name,
      filename: file.name,
      data: buffer,
      createdAt: new Date(),
    }

    const result = await resourcesCollection.insertOne(resource)

    return c.json({
      id: result.insertedId,
      title: resource.title,
      filename: resource.filename,
      createdAt: resource.createdAt,
    }, 201)
  } catch (error) {
    console.error('Upload error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

resources.get('/', clerkAuth, async (c) => {
  try {
    const userId = getUserId(c)
    const resourcesCollection = getResourcesCollection()
    const items = await resourcesCollection.find({ userId }).sort({ createdAt: -1 }).toArray()

    return c.json(items.map((r: any) => ({
      id: r._id,
      title: r.title,
      filename: r.filename,
      createdAt: r.createdAt,
    })))
  } catch (error) {
    console.error('List resources error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

resources.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const resourcesCollection = getResourcesCollection()
    const resource = await resourcesCollection.findOne({ _id: id })

    if (!resource) {
      return c.json({ error: 'Resource not found' }, 404)
    }

    return c.json({
      id: resource._id,
      title: resource.title,
      filename: resource.filename,
      createdAt: resource.createdAt,
    })
  } catch (error) {
    console.error('Get resource error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

resources.delete('/:id', clerkAuth, async (c) => {
  try {
    const id = c.req.param('id')
    const userId = getUserId(c)
    const resourcesCollection = getResourcesCollection()
    const resource = await resourcesCollection.findOne({ _id: id })

    if (!resource) {
      return c.json({ error: 'Resource not found' }, 404)
    }

    if (resource.userId !== userId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    await resourcesCollection.deleteOne({ _id: id })

    return c.json({ message: 'Resource deleted' })
  } catch (error) {
    console.error('Delete resource error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

resources.get('/:id/file', async (c) => {
  try {
    const id = c.req.param('id')
    const resourcesCollection = getResourcesCollection()
    const resource = await resourcesCollection.findOne({ _id: id })

    if (!resource) {
      return c.json({ error: 'Resource not found' }, 404)
    }

    if (!resource.data) {
      return c.json({ error: 'File data not found' }, 404)
    }

    const buffer = resource.data.buffer || resource.data

    return c.newResponse(buffer, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${resource.filename}"`,
      'Content-Length': (buffer.length || buffer.byteLength).toString(),
    })
  } catch (error) {
    console.error('Serve file error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

resources.get('/vocabulary', clerkAuth, async (c) => {
  try {
    const userId = getUserId(c)
    const sessionsCollection = getReadingSessionsCollection()
    const sessions = await sessionsCollection.find({ userId }).toArray()
    const allWords = new Set<string>()
    for (const session of sessions) {
      const words: string[] = session.vocabulary || []
      for (const word of words) {
        if (word) allWords.add(word)
      }
    }
    return c.json([...allWords].sort())
  } catch (error) {
    console.error('Get vocabulary error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

const SaveReadingSchema = z.object({
  resourceId: z.string(),
  vocabulary: z.array(z.string()),
  lastPage: z.number().optional(),
})

resources.post('/reading/save', clerkAuth, async (c) => {
  try {
    const userId = getUserId(c)
    const body = await c.req.json()
    const { resourceId, vocabulary, lastPage } = SaveReadingSchema.parse(body)

    const sessionsCollection = getReadingSessionsCollection()
    const existing = await sessionsCollection.findOne({ userId, resourceId })

    if (existing) {
      await sessionsCollection.updateOne(
        { _id: existing._id },
        { $set: { vocabulary, lastPage: lastPage || 1, updatedAt: new Date() } }
      )
      return c.json({ message: 'Reading session updated' })
    }

    await sessionsCollection.insertOne({
      userId,
      resourceId,
      vocabulary,
      lastPage: lastPage || 1,
      updatedAt: new Date(),
    })

    return c.json({ message: 'Reading session created' }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid data', details: error.errors }, 400)
    }
    console.error('Save reading error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

resources.get('/reading/:resourceId', clerkAuth, async (c) => {
  try {
    const resourceId = c.req.param('resourceId')
    const userId = getUserId(c)
    const sessionsCollection = getReadingSessionsCollection()
    const session = await sessionsCollection.findOne({ userId, resourceId })

    if (!session) {
      return c.json({ vocabulary: [], lastPage: 1 })
    }

    return c.json({
      vocabulary: session.vocabulary || [],
      lastPage: session.lastPage || 1,
      updatedAt: session.updatedAt,
    })
  } catch (error) {
    console.error('Load reading error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default resources
