import { useNavigate } from 'react-router-dom'

interface GameResultsProps {
  score: { correct: number; wrong: number }
  totalRounds: number
  onPlayAgain: () => void
}

export default function GameResults({ score, totalRounds, onPlayAgain }: GameResultsProps) {
  const navigate = useNavigate()
  const accuracy = totalRounds > 0 ? Math.round((score.correct / totalRounds) * 100) : 0
  let gradeColor = 'var(--sage)'
  if (accuracy >= 80) gradeColor = 'var(--sage)'
  else if (accuracy >= 60) gradeColor = 'var(--danger-color)'
  else gradeColor = 'var(--error-color)'

  return (
    <div style={{ textAlign: 'center', maxWidth: '440px', width: '100%' }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: accuracy >= 80
          ? 'var(--sage-gradient)'
          : 'var(--danger-gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px', margin: '0 auto 24px',
        boxShadow: `0 8px 30px ${accuracy >= 80 ? 'rgba(107,127,103,0.3)' : 'rgba(212,165,165,0.3)'}`,
      }}>
        {accuracy >= 80 ? '★' : '↑'}
      </div>

      <h2 style={{
        fontSize: '32px', marginBottom: '8px', color: 'var(--text-primary)',
        fontFamily: 'var(--font-heading)',
      }}>
        Practice Complete!
      </h2>
      <p style={{ color: 'var(--text-subtle)', marginBottom: '32px', fontSize: '15px' }}>
        {accuracy >= 80 ? "Great job! Keep it up." : "Keep practicing, you're improving!"}
      </p>

      <div style={{
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '24px', padding: '36px 32px',
        boxShadow: 'var(--shadow-medium), var(--inset-border)',
        marginBottom: '32px',
      }}>
        <div style={{ fontSize: '56px', fontWeight: 700, color: gradeColor, marginBottom: '4px' }}>
          {score.correct}/{totalRounds}
        </div>
        <div style={{
          fontSize: '15px', color: 'var(--text-subtle)', marginBottom: '28px',
          fontWeight: 500,
        }}>
          {accuracy}% accuracy
        </div>

        <div style={{
          width: '100%', height: '6px', background: 'var(--surface-muted)',
          borderRadius: '3px', marginBottom: '24px', overflow: 'hidden',
        }}>
          <div style={{
            width: `${accuracy}%`, height: '100%',
            background: 'var(--sage-gradient)',
            borderRadius: '3px', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
          }} />
        </div>

        <div style={{
          display: 'flex', justifyContent: 'center', gap: '32px', fontSize: '16px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--sage)', marginBottom: '4px' }}>✓</div>
            <div style={{ color: 'var(--sage)', fontWeight: 700, transition: 'color 0.3s' }}>{score.correct}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-subtle)', marginTop: '2px' }}>correct</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--danger-color)', marginBottom: '4px' }}>✗</div>
            <div style={{ color: 'var(--danger-color)', fontWeight: 700 }}>{score.wrong}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-subtle)', marginTop: '2px' }}>wrong</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={onPlayAgain}
          style={{
            padding: '14px 32px',
            background: 'var(--sage-gradient)',
            color: 'white', border: 'none', borderRadius: '50px',
            fontWeight: 600, cursor: 'pointer', fontSize: '16px',
            transition: 'all 0.25s',
            boxShadow: '0 4px 16px rgba(107,127,103,0.25)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(107,127,103,0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,127,103,0.25)';
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '14px 32px', background: 'var(--surface-muted)',
            border: '1px solid var(--border-light)', borderRadius: '50px',
            fontWeight: 500, cursor: 'pointer', fontSize: '16px',
            transition: 'all 0.2s', color: 'var(--text-primary)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-muted)' }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}
