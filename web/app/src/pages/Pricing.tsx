import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useClerk, useAuth } from '@clerk/react'
import { Shield, Gift, Calendar, Check, ArrowLeft } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface SubscriptionInfo {
  days_left: number
  subscription_end: string | null
  is_new_user: boolean
  has_used_free_days: boolean
}

export default function Pricing() {
  const { user, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)

  useEffect(() => {
    if (isSignedIn && user) {
      fetchSubscription()
    }
  }, [isSignedIn, user])

  async function fetchSubscription() {
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/api/subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSubscription(data)
    } catch (err) {
      console.error('Error fetching subscription:', err)
    }
  }

  async function handleUseFreeDays() {
    if (!user) return
    setLoading('free')
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/api/subscription/use-free-days`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        navigate('/dashboard')
      } else {
        alert('Error claiming free days')
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(null)
    }
  }

  async function handleCheckout(priceId: string) {
    if (!user) return
    setLoading(priceId)
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/api/subscription/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ price_id: priceId })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(null)
    }
  }

  if (!isSignedIn) {
    navigate('/')
    return null
  }

  const canUseFreeDays = !subscription?.has_used_free_days && (!subscription?.days_left || subscription.days_left <= 0)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-cream)',
      padding: '48px',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        {subscription && subscription.days_left > 0 && (
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'var(--card-white)',
              border: 'none',
              borderRadius: '24px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: '32px',
              boxShadow: 'var(--shadow-soft)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-soft)';
            }}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{
            fontSize: '48px',
            marginBottom: '16px',
            color: 'var(--text-primary)',
          }}>
            Choose your plan
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'var(--text-subtle)',
          }}>
            Access all Shakespeare features
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {canUseFreeDays && (
            <div style={{
              padding: '32px',
              background: 'var(--card-white)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-soft)',
              border: '2px solid var(--sage)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px',
              }}>
                <Gift size={28} color='var(--sage)' />
                <h2 style={{ fontSize: '24px' }}>3 Free Days</h2>
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 600,
                color: 'var(--sage)',
                marginBottom: '8px',
              }}>
                $0
              </div>
              <p style={{
                color: 'var(--text-subtle)',
                marginBottom: '24px',
                fontSize: '14px',
              }}>
                New users only
              </p>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px', flex: 1 }}>
                {['Access to all practices', 'Progress tracking', 'Badges and achievements'].map((item, i) => (
                  <li key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    color: 'var(--text-primary)',
                  }}>
                    <Check size={18} color='var(--sage)' />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleUseFreeDays}
                disabled={loading === 'free'}
                style={{
                  padding: '16px',
                  background: 'var(--sage-gradient)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '16px',
                  cursor: loading === 'free' ? 'wait' : 'pointer',
                  opacity: loading === 'free' ? 0.7 : 1,
                }}
              >
                {loading === 'free' ? 'Processing...' : 'Get 3 free days'}
              </button>
            </div>
          )}

          <div style={{
            padding: '32px',
            background: 'var(--card-white)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-soft)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <Calendar size={28} color='var(--sage)' />
              <h2 style={{ fontSize: '24px' }}>30 Days</h2>
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}>
              $10
            </div>
            <p style={{
              color: 'var(--text-subtle)',
              marginBottom: '24px',
              fontSize: '14px',
            }}>
              $0.33 per day
            </p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px', flex: 1 }}>
              {['Access to all practices', 'Progress tracking', 'Badges and achievements', 'IELTS exams'].map((item, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  color: 'var(--text-primary)',
                }}>
                  <Check size={18} color='var(--sage)' />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(import.meta.env.VITE_STRIPE_PRICE_30_DAYS || '')}
              disabled={loading === import.meta.env.VITE_STRIPE_PRICE_30_DAYS || !import.meta.env.VITE_STRIPE_PRICE_30_DAYS}
              style={{
                padding: '16px',
                background: 'var(--sage)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '16px',
                cursor: loading === import.meta.env.VITE_STRIPE_PRICE_30_DAYS ? 'wait' : 'pointer',
                opacity: loading === import.meta.env.VITE_STRIPE_PRICE_30_DAYS ? 0.7 : 1,
              }}
            >
              {loading === import.meta.env.VITE_STRIPE_PRICE_30_DAYS ? 'Processing...' : 'Buy 30 days'}
            </button>
          </div>

          <div style={{
            padding: '32px',
            background: 'var(--card-white)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-soft)',
            border: '2px solid var(--sage)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              right: '24px',
              background: 'var(--sage)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              Best value
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <Shield size={28} color='var(--sage)' />
              <h2 style={{ fontSize: '24px' }}>365 Days</h2>
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: 600,
              color: 'var(--sage)',
              marginBottom: '8px',
            }}>
              $70
            </div>
            <p style={{
              color: 'var(--text-subtle)',
              marginBottom: '24px',
              fontSize: '14px',
            }}>
              $0.19 per day - Save $50
            </p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px', flex: 1 }}>
              {['Everything in 30 days', 'Full year access', 'Priority support'].map((item, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  color: 'var(--text-primary)',
                }}>
                  <Check size={18} color='var(--sage)' />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(import.meta.env.VITE_STRIPE_PRICE_365_DAYS || '')}
              disabled={loading === import.meta.env.VITE_STRIPE_PRICE_365_DAYS || !import.meta.env.VITE_STRIPE_PRICE_365_DAYS}
              style={{
                padding: '16px',
                background: 'var(--sage-gradient)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '16px',
                cursor: loading === import.meta.env.VITE_STRIPE_PRICE_365_DAYS ? 'wait' : 'pointer',
                opacity: loading === import.meta.env.VITE_STRIPE_PRICE_365_DAYS ? 0.7 : 1,
              }}
            >
              {loading === import.meta.env.VITE_STRIPE_PRICE_365_DAYS ? 'Processing...' : 'Buy 365 days'}
            </button>
          </div>
        </div>

        <div style={{
          marginTop: '48px',
          textAlign: 'center',
        }}>
          <button
            onClick={() => signOut().then(() => navigate('/'))}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-subtle)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
