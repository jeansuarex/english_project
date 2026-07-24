import { Hono } from 'hono'
import { getUsersCollection, getPurchasesCollection, getSubscriptionTransactionsCollection, getOffersCollection } from '../db'
import { clerkAuth, adminAuth } from '../middleware/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-06-24.dahlia'
})

const admin = new Hono()

admin.use('*', adminAuth)

function genId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

admin.get('/stats', async (c) => {
  try {
    const usersCollection = getUsersCollection()
    const transactionsCollection = getSubscriptionTransactionsCollection()

    const allUsers = await usersCollection.find({}).toArray()
    const totalUsers = allUsers.length

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const activeSubscriptions = allUsers.filter(u => {
      if (!u.subscription_end) return false
      return new Date(u.subscription_end) > now
    }).length

    const trialUsers = allUsers.filter(u => {
      return u.subscription_status === 'trial'
    }).length

    const pastDueUsers = allUsers.filter(u => {
      return u.subscription_status === 'past_due'
    }).length

    const newUsersThisMonth = allUsers.filter(u => {
      if (!u.createdAt) return false
      return new Date(u.createdAt) > thirtyDaysAgo
    }).length

    const transactions = await transactionsCollection.find({
      status: 'completed',
      amount_paid: { $gt: 0 }
    }).toArray()

    const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount_paid || 0), 0)

    return c.json({
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      trialUsers,
      pastDueUsers,
      newUsersThisMonth
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

admin.get('/users', async (c) => {
  try {
    const usersCollection = getUsersCollection()
    const users = await usersCollection.find({}).toArray()
    return c.json(users)
  } catch (error) {
    console.error('Admin users error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

admin.get('/user/:clerkId', async (c) => {
  try {
    const clerkId = c.req.param('clerkId')
    const usersCollection = getUsersCollection()
    const user = await usersCollection.findOne({ clerkId })

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      ...user,
      publicMetadata: {}
    })
  } catch (error) {
    console.error('Admin user detail error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

admin.get('/transactions', async (c) => {
  try {
    const transactionsCollection = getSubscriptionTransactionsCollection()
    const transactions = await transactionsCollection.find({}).toArray()
    return c.json(transactions)
  } catch (error) {
    console.error('Admin transactions error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

admin.get('/offers', async (c) => {
  try {
    const offersCollection = getOffersCollection()
    const offers = await offersCollection.find({}).toArray()
    return c.json(offers)
  } catch (error) {
    console.error('Admin offers error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

admin.post('/offers', async (c) => {
  try {
    const { code, discount, type, description } = await c.req.json()

    const offer = {
      id: genId(),
      code: code.toUpperCase(),
      discount,
      type,
      description: description || '',
      active: true,
      createdAt: new Date().toISOString()
    }

    const offersCollection = getOffersCollection()
    await offersCollection.insertOne(offer)

    return c.json(offer)
  } catch (error) {
    console.error('Admin create offer error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

admin.delete('/offers/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const offersCollection = getOffersCollection()
    const result = await offersCollection.deleteOne({ id })
    
    if (result.deletedCount === 0) {
      return c.json({ error: 'Offer not found' }, 404)
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Admin delete offer error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default admin
