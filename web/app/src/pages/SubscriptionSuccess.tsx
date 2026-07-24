import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { CheckCircle, Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function SubscriptionSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getToken } = useAuth()
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      setError('No session found')
      setVerifying(false)
      return
    }

    async function verifyAndRedirect() {
      try {
        const token = await getToken()
        const res = await fetch(`${API_URL}/api/subscription/verify-session/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (res.ok) {
          setTimeout(() => {
            navigate('/dashboard')
          }, 2000)
        } else {
          const data = await res.json()
          setError(data.error || 'Verification failed')
          setVerifying(false)
        }
      } catch (err) {
        console.error('Error verifying session:', err)
        setError('Failed to verify payment')
        setVerifying(false)
      }
    }

    verifyAndRedirect()

    const timer = setTimeout(() => {
      if (verifying) {
        navigate('/dashboard')
      }
    }, 10000)

    return () => clearTimeout(timer)
  }, [searchParams, getToken, navigate, verifying])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-cream)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px',
      }}>
        {verifying ? (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--sage)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <Loader2 size={40} color='white' className='spin' style={{ animation: 'spin 1s linear infinite' }} />
            </div>

            <h1 style={{
              fontSize: '36px',
              marginBottom: '16px',
              color: 'var(--text-primary)',
            }}>
              Verifying payment...
            </h1>

            <p style={{
              fontSize: '18px',
              color: 'var(--text-subtle)',
              marginBottom: '32px',
            }}>
              Please wait while we confirm your payment.
            </p>
          </>
        ) : error ? (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <CheckCircle size={40} color='white' />
            </div>

            <h1 style={{
              fontSize: '36px',
              marginBottom: '16px',
              color: 'var(--text-primary)',
            }}>
              Payment Error
            </h1>

            <p style={{
              fontSize: '18px',
              color: 'var(--text-subtle)',
              marginBottom: '32px',
            }}>
              {error}
            </p>

            <button
              onClick={() => navigate('/pricing')}
              style={{
                padding: '16px 32px',
                background: 'var(--sage)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Back to Pricing
            </button>
          </>
        ) : (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--sage)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <CheckCircle size={40} color='white' />
            </div>

            <h1 style={{
              fontSize: '36px',
              marginBottom: '16px',
              color: 'var(--text-primary)',
            }}>
              Subscription successful!
            </h1>

            <p style={{
              fontSize: '18px',
              color: 'var(--text-subtle)',
              marginBottom: '32px',
            }}>
              Your payment has been processed.
              <br />
              Redirecting to dashboard...
            </p>

            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '16px 32px',
                background: 'var(--sage-gradient)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
