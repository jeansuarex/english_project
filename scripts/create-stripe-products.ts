import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia'
})

async function createProducts() {
  console.log('Creating Shakespeare subscription products...\n')

  const products = [
    {
      name: '30 Días - Shakespeare',
      description: 'Acceso a Shakespeare por 30 días',
      price: 1000,
      interval: 'day' as const,
      intervalCount: 30,
    },
    {
      name: '365 Días - Shakespeare',
      description: 'Acceso a Shakespeare por 365 días',
      price: 7000,
      interval: 'day' as const,
      intervalCount: 365,
    },
    {
      name: '1-on-1 English Session',
      description: 'One hour private English lesson with a native speaker',
      price: 2000,
      recurring: null,
    },
    {
      name: 'IELTS Exam',
      description: 'Take the full IELTS exam with certification upon completion',
      price: 6000,
      recurring: null,
    },
  ]

  for (const product of products) {
    console.log(`Creating product: ${product.name}`)

    const stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description,
    })

    const price = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: product.price,
      currency: 'usd',
      ...(product.recurring ? {
        recurring: {
          interval: product.interval,
          interval_count: product.intervalCount,
        },
      } : {}),
    })

    console.log(`  Product ID: ${stripeProduct.id}`)
    console.log(`  Price ID: ${price.id}`)
    console.log(`  Price: $${product.price / 100}\n`)
  }

  console.log('Done! Add these PRICE_IDs to your .env:')
  console.log('STRIPE_PRICE_30_DAYS=price_xxx')
  console.log('STRIPE_PRICE_365_DAYS=price_xxx')
  console.log('STRIPE_PRICE_SESSION=price_xxx')
  console.log('STRIPE_PRICE_EXAM=price_xxx')
}

createProducts().catch(console.error)
