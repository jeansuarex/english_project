import { useNavigate } from 'react-router-dom'
import { ShieldOff, Calendar } from 'lucide-react'

export default function NoAccess() {
  const navigate = useNavigate()

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
          <ShieldOff size={40} color='white' />
        </div>

        <h1 style={{
          fontSize: '36px',
          marginBottom: '16px',
          color: 'var(--text-primary)',
        }}>
          Sin acceso
        </h1>

        <p style={{
          fontSize: '18px',
          color: 'var(--text-subtle)',
          marginBottom: '32px',
        }}>
          Tu suscripción ha expirado o no tienes días disponibles.
          <br />
          Compra días para continuar usando Shakespeare.
        </p>

        <button
          onClick={() => navigate('/pricing')}
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
          <Calendar size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Ver planes
        </button>
      </div>
    </div>
  )
}
