import Stripe from 'stripe'
import { getUsersCollection, getPurchasesCollection, getStripeEventsCollection, getSubscriptionTransactionsCollection } from '../db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia'
})

export const SUBSCRIPTION_PLANS = {
  MONTHLY: { days: 30, priceId: process.env.STRIPE_PRICE_30_DAYS || '', name: '30 Days' },
  YEARLY: { days: 365, priceId: process.env.STRIPE_PRICE_365_DAYS || '', name: '365 Days' },
  TRIAL: { days: 3, priceId: null, name: '3 Free Days' }
} as const

export type PlanType = keyof typeof SUBSCRIPTION_PLANS
export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'past_due' | 'canceled' | 'expired'

export interface SubscriptionResult {
  success: boolean
  daysLeft?: number
  endDate?: string
  startDate?: string
  status?: SubscriptionStatus
  error?: string
}

function genId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function calculateNewExpirationDate(
  currentEndDate: string | null | undefined,
  daysToAdd: number,
  isPaidPlan: boolean = false
): { startDate: Date; endDate: Date } {
  const now = new Date()
  let startDate: Date
  let endDate: Date

  if (!currentEndDate) {
    startDate = now
    endDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
  } else {
    const existingEnd = new Date(currentEndDate)
    if (existingEnd <= now) {
      startDate = now
      endDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    } else {
      startDate = existingEnd
      endDate = new Date(existingEnd.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    }
  }

  return { startDate, endDate }
}

function getDaysFromPriceId(priceId: string): number {
  for (const plan of Object.values(SUBSCRIPTION_PLANS)) {
    if (plan.priceId === priceId) {
      return plan.days
    }
  }
  return 30
}

export async function processFreeDays(clerkUserId: string): Promise<SubscriptionResult> {
  const usersCollection = getUsersCollection()
  const user = usersCollection.findOne({ clerkId: clerkUserId })

  if (!user) {
    return { success: false, error: 'User not found' }
  }

  if (user.has_used_free_days === 1 || user.has_used_free_days === true) {
    return { success: false, error: 'Already used free days' }
  }

  const now = new Date()
  const endDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  await usersCollection.updateOne(
    { clerkId: clerkUserId },
    {
      $set: {
        days_left: 3,
        subscription_end: endDate.toISOString(),
        subscription_start_date: now.toISOString(),
        subscription_status: 'trial',
        is_new_user: 0,
        has_used_free_days: 1,
        updatedAt: now.toISOString()
      }
    }
  )

  await getSubscriptionTransactionsCollection().insertOne({
    id: genId(),
    userId: clerkUserId,
    stripe_session_id: null,
    stripe_subscription_id: null,
    price_id: null,
    days_added: 3,
    amount_paid: 0,
    status: 'completed',
    transaction_date: now.toISOString(),
    createdAt: now.toISOString()
  })

  return {
    success: true,
    daysLeft: 3,
    endDate: endDate.toISOString(),
    startDate: now.toISOString(),
    status: 'trial'
  }
}

export async function processPaymentCompletion(
  clerkUserId: string,
  stripeSessionId: string,
  stripeSubscriptionId: string,
  priceId: string,
  amountPaid: number,
  stripeCustomerId?: string
): Promise<SubscriptionResult> {
  const usersCollection = getUsersCollection()
  console.log('Looking for user with clerkId:', clerkUserId)
  let user = usersCollection.findOne({ clerkId: clerkUserId })

  if (!user) {
    console.log('User not found, creating automatically...')
    const now = new Date()
    usersCollection.insertOne({
      id: clerkUserId,
      clerkId: clerkUserId,
      email: stripeCustomerId || '',
      name: 'User',
      createdAt: now.toISOString(),
      role: 'user',
      days_left: 0,
      subscription_end: null,
      is_new_user: 0,
      has_used_free_days: 0
    })
    user = usersCollection.findOne({ clerkId: clerkUserId })
    console.log('User created:', user)
  }

  console.log('User found:', user.clerkId, user.email)
  console.log('Price ID from session:', priceId)
  const days = getDaysFromPriceId(priceId)
  console.log('Days calculated:', days)
  const { startDate, endDate } = calculateNewExpirationDate(
    user.subscription_end,
    days
  )

  const now = new Date()
  const diffMs = endDate.getTime() - now.getTime()
  const actualDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

  console.log('User had days_left:', user.days_left)
  console.log('User subscription_end:', user.subscription_end)
  console.log('New endDate:', endDate.toISOString())
  console.log('actualDaysLeft (new total):', actualDaysLeft)

  const updateFields: Record<string, any> = {
    days_left: actualDaysLeft,
    subscription_end: endDate.toISOString(),
    subscription_start_date: user.subscription_start_date || startDate.toISOString(),
    subscription_status: 'active',
    last_payment_date: now.toISOString(),
    updatedAt: now.toISOString()
  }

  if (stripeCustomerId) {
    updateFields.stripe_customer_id = stripeCustomerId
  }
  if (stripeSubscriptionId) {
    updateFields.stripe_subscription_id = stripeSubscriptionId
  }

  usersCollection.updateOne(
    { clerkId: clerkUserId },
    { $set: updateFields }
  )

  getSubscriptionTransactionsCollection().insertOne({
    id: genId(),
    userId: clerkUserId,
    stripe_session_id: stripeSessionId,
    stripe_subscription_id: stripeSubscriptionId,
    price_id: priceId,
    days_added: days,
    amount_paid: amountPaid,
    status: 'completed',
    transaction_date: now.toISOString(),
    createdAt: now.toISOString()
  })

  return {
    success: true,
    daysLeft: actualDaysLeft,
    endDate: endDate.toISOString(),
    startDate: startDate.toISOString(),
    status: 'active'
  }
}

export async function cancelSubscription(stripeSubscriptionId: string): Promise<SubscriptionResult> {
  const usersCollection = getUsersCollection()
  const user = usersCollection.findOne({ stripe_subscription_id: stripeSubscriptionId })

  if (!user) {
    return { success: false, error: 'User not found for this subscription' }
  }

  const now = new Date()

  usersCollection.updateOne(
    { stripe_subscription_id: stripeSubscriptionId },
    {
      $set: {
        subscription_status: 'canceled',
        updatedAt: now.toISOString()
      }
    }
  )

  return { success: true }
}

export async function handleSubscriptionUpdated(
  stripeSubscriptionId: string,
  status: string
): Promise<SubscriptionResult> {
  const usersCollection = getUsersCollection()
  const user = usersCollection.findOne({ stripe_subscription_id: stripeSubscriptionId })

  if (!user) {
    return { success: false, error: 'User not found for this subscription' }
  }

  const now = new Date()
  let subscriptionStatus: SubscriptionStatus = 'active'

  switch (status) {
    case 'active':
      subscriptionStatus = 'active'
      break
    case 'past_due':
      subscriptionStatus = 'past_due'
      break
    case 'canceled':
      subscriptionStatus = 'canceled'
      break
    default:
      subscriptionStatus = 'active'
  }

  usersCollection.updateOne(
    { stripe_subscription_id: stripeSubscriptionId },
    {
      $set: {
        subscription_status: subscriptionStatus,
        updatedAt: now.toISOString()
      }
    }
  )

  return { success: true, status: subscriptionStatus }
}

export async function getSubscriptionStatus(clerkUserId: string): Promise<{
  daysLeft: number
  endDate: string | null
  startDate: string | null
  status: SubscriptionStatus
  hasAccess: boolean
  isNewUser: boolean
  hasUsedFreeDays: boolean
}> {
  const usersCollection = getUsersCollection()
  const user = usersCollection.findOne({ clerkId: clerkUserId })

  if (!user) {
    return {
      daysLeft: 0,
      endDate: null,
      startDate: null,
      status: 'none',
      hasAccess: false,
      isNewUser: true,
      hasUsedFreeDays: false
    }
  }

  const now = new Date()
  let daysLeft = user.days_left || 0
  let status: SubscriptionStatus = (user.subscription_status as SubscriptionStatus) || 'none'

  if (user.subscription_end) {
    const endDate = new Date(user.subscription_end)
    if (endDate <= now) {
      daysLeft = 0
      if (status !== 'canceled' && status !== 'expired') {
        status = 'expired'
        usersCollection.updateOne(
          { clerkId: clerkUserId },
          { $set: { days_left: 0, subscription_status: 'expired' } }
        )
      }
    } else {
      const diffMs = endDate.getTime() - now.getTime()
      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    }
  }

  const hasAccess = daysLeft > 0 && ['active', 'trial', 'past_due'].includes(status)

  return {
    daysLeft,
    endDate: user.subscription_end || null,
    startDate: user.subscription_start_date || null,
    status,
    hasAccess,
    isNewUser: user.is_new_user === 1 || user.is_new_user === true,
    hasUsedFreeDays: user.has_used_free_days === 1 || user.has_used_free_days === true
  }
}

export async function isEventProcessed(eventId: string): Promise<boolean> {
  const existing = getStripeEventsCollection().findOne({ id: eventId })
  return existing !== null
}

export async function markEventProcessed(eventId: string, eventType: string): Promise<boolean> {
  try {
    getStripeEventsCollection().insertOne({
      id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString()
    })
    return true
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return false
    }
    throw err
  }
}

export async function createCheckoutSession(clerkUserId: string, priceId: string, appUrl: string) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { clerkUserId }
  })

  return session
}

export async function createSessionCheckoutSession(
  clerkUserId: string,
  priceId: string,
  appUrl: string,
  sessionDetails: { teacherId: string; teacherName: string; dateTime: string; topic: string }
) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?tab=schedule&payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard?tab=schedule&payment=cancelled`,
    metadata: {
      clerkUserId,
      type: 'session_booking',
      ...sessionDetails
    }
  })

  return session
}

export async function createExamCheckoutSession(
  clerkUserId: string,
  priceId: string,
  appUrl: string
) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/exam?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard?tab=exam&payment=cancelled`,
    metadata: {
      clerkUserId,
      type: 'exam'
    }
  })

  return session
}

export { stripe }
