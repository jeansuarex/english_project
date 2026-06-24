import { Hono } from 'hono'
import Stripe from 'stripe'
import { getSubscriptionsCollection, getTestsCollection } from '../db'

const payments = new Hono()

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-02-24.acacia' as any })
}

payments.post('/webhook', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('stripe-signature')
  if (!signature) {
    return c.json({ error: 'No signature' }, 400)
  }

  try {
    const stripe = getStripe()
    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || '')

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        if (userId) {
          const subscriptionsCollection = getSubscriptionsCollection()
          const subscription = await subscriptionsCollection.findOne({ stripeCustomerId: session.customer as string })
          if (subscription) {
            const interval = subscription.plan === 'annual' ? 365 : 30
            const periodEnd = new Date()
            periodEnd.setDate(periodEnd.getDate() + interval)

            await subscriptionsCollection.updateOne(
              { _id: subscription._id },
              {
                $set: {
                  status: 'active',
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: periodEnd,
                  updatedAt: new Date(),
                },
              }
            )

            const testsCollection = getTestsCollection()
            const testDate = new Date()
            if (subscription.plan !== 'basic') {
              testDate.setDate(testDate.getDate() + (subscription.plan === 'annual' ? 90 : 30))
            }
            await testsCollection.insertOne({
              userId: subscription.userId,
              status: 'pending',
              scheduledDate: testDate,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          }
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionsCollection = getSubscriptionsCollection()
        const subscription = await subscriptionsCollection.findOne({ stripeCustomerId: invoice.customer as string })
        if (subscription) {
          await subscriptionsCollection.updateOne(
            { _id: subscription._id },
            { $set: { status: 'pending', updatedAt: new Date() } }
          )
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subEvent = event.data.object as Stripe.Subscription
        const subscriptionsCollection = getSubscriptionsCollection()
        const existingSub = await subscriptionsCollection.findOne({ stripeSubscriptionId: subEvent.id })
        if (existingSub) {
          await subscriptionsCollection.updateOne(
            { _id: existingSub._id },
            { $set: { status: 'cancelled', updatedAt: new Date() } }
          )
        }
        break
      }
    }

    return c.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return c.json({ error: 'Webhook failed' }, 400)
  }
})

payments.get('/', async (c) => {
  try {
    const from = c.req.query('from')
    const to = c.req.query('to')
    const subscriptionsCollection = getSubscriptionsCollection()
    const subscriptions = await subscriptionsCollection.find({
      createdAt: {
        $gte: from ? new Date(from) : new Date(0),
        $lte: to ? new Date(to) : new Date(),
      },
    }).toArray()

    const totalRevenue = subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => {
        const price = s.plan === 'annual' ? 200 : s.plan === 'basic' ? 50 : 0
        return sum + price
      }, 0)

    return c.json({ payments: subscriptions, totalRevenue, count: subscriptions.length })
  } catch (error) {
    console.error('List payments error:', error)
    return c.json({ error: 'Failed to list payments' }, 500)
  }
})

payments.get('/:id', async (c) => {
  try {
    const subscriptionsCollection = getSubscriptionsCollection()
    const subscription = await subscriptionsCollection.findOne({ _id: c.req.param('id') })
    if (!subscription) {
      return c.json({ error: 'Subscription not found' }, 404)
    }
    const stripe = getStripe()
    const invoices = subscription.stripeCustomerId
      ? await stripe.invoices.list({ customer: subscription.stripeCustomerId })
      : { data: [] }
    return c.json({ subscription, invoices: invoices.data })
  } catch (error) {
    console.error('Get payment error:', error)
    return c.json({ error: 'Failed to get payment' }, 500)
  }
})

export default payments
