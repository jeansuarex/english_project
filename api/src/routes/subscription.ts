import { Hono } from 'hono'
import { getUsersCollection } from '../db'
import { clerkAuth } from '../middleware/auth'
import {
  processFreeDays,
  processPaymentCompletion,
  cancelSubscription,
  handleSubscriptionUpdated,
  getSubscriptionStatus,
  isEventProcessed,
  markEventProcessed,
  createCheckoutSession,
  createSessionCheckoutSession,
  createExamCheckoutSession,
  stripe,
  SUBSCRIPTION_PLANS
} from '../services/subscriptionService'

const subscription = new Hono()

subscription.get('/', clerkAuth, async (c) => {
  const clerkUserId = c.get('clerkUserId') as string
  const status = await getSubscriptionStatus(clerkUserId)

  return c.json({
    days_left: status.daysLeft,
    subscription_end: status.endDate,
    subscription_start: status.startDate,
    subscription_status: status.status,
    has_access: status.hasAccess,
    is_new_user: status.isNewUser,
    has_used_free_days: status.hasUsedFreeDays
  })
})

subscription.post('/create-checkout-session', clerkAuth, async (c) => {
  const { price_id } = await c.req.json()
  const clerkUserId = c.get('clerkUserId') as string
  const appUrl = process.env.APP_URL || 'http://localhost:5173'

  if (!price_id) {
    return c.json({ error: 'price_id is required' }, 400)
  }

  try {
    const session = await createCheckoutSession(clerkUserId, price_id, appUrl)
    return c.json({ url: session.url })
  } catch (err: any) {
    console.error('Error creating checkout session:', err)
    return c.json({ error: 'Failed to create checkout session' }, 500)
  }
})

subscription.post('/create-session-checkout', clerkAuth, async (c) => {
  const { price_id, teacherId, teacherName, dateTime, topic } = await c.req.json()
  const clerkUserId = c.get('clerkUserId') as string
  const appUrl = process.env.APP_URL || 'http://localhost:5173'

  if (!price_id) {
    return c.json({ error: 'price_id is required' }, 400)
  }

  try {
    const session = await createSessionCheckoutSession(clerkUserId, price_id, appUrl, {
      teacherId,
      teacherName,
      dateTime,
      topic
    })
    return c.json({ url: session.url })
  } catch (err: any) {
    console.error('Error creating session checkout:', err)
    return c.json({ error: 'Failed to create checkout session' }, 500)
  }
})

subscription.post('/create-exam-checkout', clerkAuth, async (c) => {
  const { price_id } = await c.req.json()
  const clerkUserId = c.get('clerkUserId') as string
  const appUrl = process.env.APP_URL || 'http://localhost:5173'

  if (!price_id) {
    return c.json({ error: 'price_id is required' }, 400)
  }

  try {
    const session = await createExamCheckoutSession(clerkUserId, price_id, appUrl)
    return c.json({ url: session.url })
  } catch (err: any) {
    console.error('Error creating exam checkout:', err)
    return c.json({ error: 'Failed to create checkout session' }, 500)
  }
})

subscription.post('/use-free-days', clerkAuth, async (c) => {
  const clerkUserId = c.get('clerkUserId') as string
  const result = await processFreeDays(clerkUserId)

  if (!result.success) {
    return c.json({ error: result.error }, 400)
  }

  return c.json({
    success: true,
    days_left: result.daysLeft,
    subscription_end: result.endDate
  })
})

subscription.get('/verify-session/:sessionId', clerkAuth, async (c) => {
  const sessionId = c.req.param('sessionId')
  const clerkUserId = c.get('clerkUserId') as string

  if (!sessionId) {
    return c.json({ error: 'session_id is required' }, 400)
  }

  console.log('Verifying session:', sessionId)
  console.log('Clerk user ID from token:', clerkUserId)

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    console.log('Session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      metadata: session.metadata,
      customer: session.customer
    })

    if (session.payment_status !== 'paid') {
      console.log('Payment not paid, status:', session.payment_status)
      return c.json({ verified: false, status: session.payment_status })
    }

    const sessionClerkUserId = session.metadata?.clerkUserId
    console.log('Session clerkUserId:', sessionClerkUserId)
    console.log('Token clerkUserId:', clerkUserId)
    console.log('Match:', sessionClerkUserId === clerkUserId)

    if (sessionClerkUserId && sessionClerkUserId !== clerkUserId) {
      console.log('User mismatch - allowing anyway for dev')
    }

    const stripeSubscriptionId = session.subscription as string

    console.log('Stripe subscription ID from session:', stripeSubscriptionId)
    console.log('Session full object keys:', Object.keys(session))
    console.log('subscription_details:', (session as any).subscription_details)
    console.log('line_items:', session.line_items)

    let priceId = (session as any).subscription_details?.price_id ||
      session.line_items?.data?.[0]?.price?.id || ''

    console.log('Price ID after first check:', priceId)

    if (!priceId && stripeSubscriptionId) {
      console.log('Trying fallback - retrieving subscription...')
      try {
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        console.log('Subscription retrieved, items:', sub.items.data)
        priceId = sub.items.data[0]?.price.id || ''
        console.log('Price ID from subscription items:', priceId)
      } catch (err: any) {
        console.log('Error retrieving subscription for price:', err.message)
      }
    }

    console.log('Final Price ID:', priceId)
    console.log('Processing payment completion...')
    const result = await processPaymentCompletion(
      clerkUserId,
      session.id,
      stripeSubscriptionId,
      priceId,
      session.amount_total || 0,
      session.customer as string
    )

    console.log('Payment processed successfully:', result)

    return c.json({
      verified: true,
      success: result.success,
      days_left: result.daysLeft,
      subscription_end: result.endDate
    })
  } catch (err: any) {
    console.error('Error verifying session:', err.message, err.stack)
    return c.json({ error: 'Failed to verify session', details: err.message }, 500)
  }
})

subscription.post('/webhook', async (c) => {
  const sig = c.req.header('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig) {
    return c.json({ error: 'Missing signature' }, 400)
  }

  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET not configured - skipping webhook verification in dev mode')

    try {
      const body = await c.req.text()
      const event = JSON.parse(body)

      if (await isEventProcessed(event.id)) {
        return c.json({ received: true, status: 'already_processed' })
      }

      await markEventProcessed(event.id, event.type)

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object
          const clerkUserId = session.metadata?.clerkUserId

          if (!clerkUserId) break

          await processPaymentCompletion(
            clerkUserId,
            session.id,
            session.subscription,
            session.line_items?.data?.[0]?.price?.id || '',
            session.amount_total || 0,
            session.customer
          )
          break
        }

        case 'customer.subscription.deleted': {
          await cancelSubscription(event.data.object.id)
          break
        }

        case 'customer.subscription.updated': {
          await handleSubscriptionUpdated(event.data.object.id, event.data.object.status)
          break
        }
      }

      return c.json({ received: true })
    } catch (err: any) {
      console.error('Error processing webhook:', err)
      return c.json({ error: err.message }, 500)
    }
  }

  let event: Stripe.Event
  const body = await c.req.text()

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return c.json({ error: 'Invalid signature' }, 400)
  }

  if (await isEventProcessed(event.id)) {
    console.log(`Skipping duplicate event: ${event.id}`)
    return c.json({ received: true, status: 'already_processed' })
  }

  try {
    await markEventProcessed(event.id, event.type)
  } catch (err) {
    return c.json({ received: true, status: 'processing' })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const clerkUserId = session.metadata?.clerkUserId

        if (!clerkUserId) {
          console.error('No clerkUserId in session metadata')
          break
        }

        if (session.status !== 'complete') {
          break
        }

        const stripeSubscriptionId = session.subscription as string
        const priceId = session.line_items?.data?.[0]?.price?.id || ''

        await processPaymentCompletion(
          clerkUserId,
          session.id,
          stripeSubscriptionId,
          priceId,
          session.amount_total || 0,
          session.customer as string
        )
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        console.log(`Subscription deleted: ${sub.id}`)
        await cancelSubscription(sub.id)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        console.log(`Subscription updated: ${sub.id}, status: ${sub.status}`)
        await handleSubscriptionUpdated(sub.id, sub.status)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await handleSubscriptionUpdated(invoice.subscription as string, 'past_due')
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`Error processing event ${event.id}:`, err)
    throw err
  }

  return c.json({ received: true })
})

subscription.get('/check', clerkAuth, async (c) => {
  const clerkUserId = c.get('clerkUserId') as string
  const status = await getSubscriptionStatus(clerkUserId)

  return c.json({
    has_access: status.hasAccess,
    days_left: status.daysLeft
  })
})

export default subscription
