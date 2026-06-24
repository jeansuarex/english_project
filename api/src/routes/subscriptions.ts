import { Hono } from 'hono'
import Stripe from 'stripe'
import { getSubscriptionsCollection, getUsersCollection } from '../db'

const subscriptions = new Hono()

const PLAN_PRICES: Record<string, number> = { basic: 50, annual: 200, enterprise: 20 }

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-02-24.acacia' as any })
}

subscriptions.post('/create', async (c) => {
  try {
    const { userId, plan } = await c.req.json()
    if (!PLAN_PRICES[plan]) {
      return c.json({ error: 'Invalid plan' }, 400)
    }

    const usersCollection = getUsersCollection()
    const user = await usersCollection.findOne({ _id: userId })
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    const stripe = getStripe()
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user._id.toString() },
    })

    const subscriptionsCollection = getSubscriptionsCollection()
    const sub = await subscriptionsCollection.insertOne({
      userId: user._id.toString(),
      plan,
      status: 'pending',
      stripeSubscriptionId: '',
      stripeCustomerId: customer.id,
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return c.json({
      subscriptionId: sub.insertedId.toString(),
      checkoutUrl: `https://checkout.stripe.com/pay/${customer.id}`,
    })
  } catch (error) {
    console.error('Create subscription error:', error)
    return c.json({ error: 'Failed to create subscription' }, 500)
  }
})

subscriptions.get('/:id', async (c) => {
  try {
    const subscriptionsCollection = getSubscriptionsCollection()
    const subscription = await subscriptionsCollection.findOne({ _id: c.req.param('id') })
    if (!subscription) {
      return c.json({ error: 'Subscription not found' }, 404)
    }
    return c.json({ subscription })
  } catch (error) {
    console.error('Get subscription error:', error)
    return c.json({ error: 'Failed to get subscription' }, 500)
  }
})

subscriptions.get('/user/:userId', async (c) => {
  try {
    const subscriptionsCollection = getSubscriptionsCollection()
    const subscription = await subscriptionsCollection.findOne({ userId: c.req.param('userId') })
    return c.json({ subscription })
  } catch (error) {
    console.error('Get user subscription error:', error)
    return c.json({ error: 'Failed to get subscription' }, 500)
  }
})

subscriptions.post('/cancel/:id', async (c) => {
  try {
    const subscriptionsCollection = getSubscriptionsCollection()
    const subscription = await subscriptionsCollection.findOne({ _id: c.req.param('id') })
    if (!subscription) {
      return c.json({ error: 'Subscription not found' }, 404)
    }
    if (subscription.stripeSubscriptionId) {
      const stripe = getStripe()
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true })
    }
    await subscriptionsCollection.updateOne(
      { _id: subscription._id },
      { $set: { cancelAtPeriodEnd: true, updatedAt: new Date() } }
    )
    return c.json({
      message: 'Subscription will be cancelled at period end',
      cancelAt: subscription.currentPeriodEnd,
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return c.json({ error: 'Failed to cancel subscription' }, 500)
  }
})

subscriptions.get('/', async (c) => {
  try {
    const subscriptionsCollection = getSubscriptionsCollection()
    const allSubs = await subscriptionsCollection.find().sort({ createdAt: -1 }).limit(50).toArray()
    return c.json({ subscriptions: allSubs })
  } catch (error) {
    console.error('List subscriptions error:', error)
    return c.json({ error: 'Failed to list subscriptions' }, 500)
  }
})

export default subscriptions
