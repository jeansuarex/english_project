import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { ArrowLeft } from 'lucide-react'
import CountdownTimer from '../components/CountdownTimer'
import GameResults from '../components/GameResults'

type RoundStatus = 'waiting' | 'correct' | 'wrong' | 'timeout'
type GameState = 'loading' | 'playing' | 'finished'

interface PhrasalVerbEntry {
  definition: string
  tense: string
  correct: string
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function PhrasalVerbs() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [searchParams] = useSearchParams()
  const rounds = Math.min(100, Math.max(1, parseInt(searchParams.get('rounds') || '5', 10)))

  const [gameState, setGameState] = useState<GameState>('loading')
  const [allEntries, setAllEntries] = useState<PhrasalVerbEntry[]>([])
  const [roundEntries, setRoundEntries] = useState<PhrasalVerbEntry[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [score, setScore] = useState({ correct: 0, wrong: 0 })
  const [timeLeft, setTimeLeft] = useState(10)
  const [roundStatus, setRoundStatus] = useState<RoundStatus | null>(null)
  const [currentEntry, setCurrentEntry] = useState<PhrasalVerbEntry | null>(null)
  const [animateRound, setAnimateRound] = useState(false)
  const [wrongAttempt, setWrongAttempt] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const gameTimerRef = useRef<ReturnType<typeof setInterval>>()
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/phrasal-verbs.json')
        const data = await res.json()
        const flat: PhrasalVerbEntry[] = []
        for (const entry of data) {
          for (const form of entry.forms) {
            flat.push({
              definition: entry.definition,
              tense: form.tense,
              correct: form.answer,
            })
          }
        }
        setAllEntries(flat)
        setGameState('playing')
      } catch (err) {
        console.error('Failed to load phrasal verbs:', err)
      }
    }
    load()
  }, [])

  const pickRoundEntries = useCallback((pool: PhrasalVerbEntry[], count: number) => {
    const shuffled = shuffleArray(pool)
    return shuffled.slice(0, Math.min(count, shuffled.length))
  }, [])

  useEffect(() => {
    if (gameState !== 'playing' || allEntries.length === 0) return
    const picked = pickRoundEntries(allEntries, rounds)
    setRoundEntries(picked)
  }, [gameState, allEntries, rounds, pickRoundEntries])

  const stopTimers = useCallback(() => {
    clearInterval(gameTimerRef.current)
  }, [])

  useEffect(() => {
    if (gameState !== 'playing' || roundEntries.length === 0) return

    if (currentRound >= roundEntries.length) {
      setGameState('finished')
      getToken().then(token => {
        fetch('/api/progress/game-session', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ gameType: 'phrasal-verbs', correct: score.correct, wrong: score.wrong, totalRounds: roundEntries.length }),
        })
      })
      return
    }

    clearTimeout(advanceTimeoutRef.current)
    stopTimers()

    const entry = roundEntries[currentRound]
    setCurrentEntry(entry)
    setUserInput('')
    setTimeLeft(10)
    setRoundStatus(null)
    setWrongAttempt(false)
    setAnimateRound(true)

    let time = 10
    gameTimerRef.current = setInterval(() => {
      time--
      setTimeLeft(time)
      if (time <= 0) {
        stopTimers()
        setRoundStatus('timeout')
        setScore(s => ({ ...s, wrong: s.wrong + 1 }))
        advanceTimeoutRef.current = setTimeout(() => {
          setCurrentRound(r => r + 1)
        }, 4500)
      }
    }, 1000)

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 50)
    const animTimer = setTimeout(() => setAnimateRound(false), 600)

    return () => {
      stopTimers()
      clearTimeout(focusTimer)
      clearTimeout(animTimer)
    }
  }, [gameState, currentRound, roundEntries, stopTimers])

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 10)
  }, [])

  useEffect(() => {
    if (!roundStatus && gameState === 'playing') {
      focusInput()
    }
  }, [roundStatus, gameState, focusInput])

  const handleSubmit = () => {
    const trimmed = userInput.trim().toLowerCase()
    if (!trimmed || !currentEntry || roundStatus) return

    if (trimmed === currentEntry.correct.toLowerCase()) {
      stopTimers()
      setRoundStatus('correct')
      setScore(s => ({ ...s, correct: s.correct + 1 }))
      advanceTimeoutRef.current = setTimeout(() => {
        setCurrentRound(r => r + 1)
      }, 4500)
    } else {
      setWrongAttempt(true)
      setUserInput('')
      focusInput()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const playAgain = () => {
    const picked = pickRoundEntries(allEntries, rounds)
    setRoundEntries(picked)
    setCurrentRound(0)
    setScore({ correct: 0, wrong: 0 })
    setGameState('playing')
  }

  if (gameState === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', border: '3px solid var(--olive)',
            borderTopColor: 'var(--sage)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ color: 'var(--sage)', fontSize: '15px' }}>Loading phrasal verbs...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const totalRounds = roundEntries.length
  const isFinished = gameState === 'finished'

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 50%, var(--bg-gradient-start) 100%)',
    }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 32px',
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => {
            if (window.confirm('Leave this game? Your progress will be lost.')) {
              navigate('/dashboard?tab=resources')
            }
          }} style={{
            padding: '8px 18px', background: 'var(--surface-muted)',
            border: '1px solid var(--border-light)', borderRadius: '50px',
            cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-muted)' }}
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1 style={{ fontSize: '18px', color: 'var(--sage)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
            Phrasal Verbs
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '15px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', background: 'var(--score-bg-correct)',
            borderRadius: '50px',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sage)' }}>✓</span>
            <span style={{ color: 'var(--sage)', fontWeight: 700 }}>{score.correct}</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', background: 'var(--score-bg-wrong)',
            borderRadius: '50px',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger-color)' }}>✗</span>
            <span style={{ color: 'var(--danger-color)', fontWeight: 700 }}>{score.wrong}</span>
          </div>
        </div>
      </header>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 24px',
      }}>
        {!isFinished ? (
          <div style={{
            textAlign: 'center', maxWidth: '520px', width: '100%',
            animation: animateRound ? 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' : undefined,
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              padding: '8px 20px', background: 'var(--surface-muted)',
              borderRadius: '50px', marginBottom: '36px',
            }}>
              <span style={{ fontSize: '14px', opacity: 0.6 }}>Round</span>
              <span style={{ fontWeight: 700, color: 'var(--sage)', fontSize: '16px' }}>
                {currentRound + 1}
              </span>
              <span style={{ opacity: 0.4 }}>/</span>
              <span style={{ color: 'var(--text-subtle)', fontSize: '14px' }}>{totalRounds}</span>
            </div>

            <CountdownTimer timeLeft={timeLeft} totalTime={10} />

            <div style={{
              background: 'var(--bg-overlay)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '24px',
              padding: '36px 32px 32px',
              boxShadow: 'var(--shadow-medium), var(--inset-border)',
              width: '100%',
            }}>
              <div style={{
                display: 'inline-block',
                padding: '6px 16px',
                background: 'var(--sage-gradient)',
                color: 'white',
                borderRadius: '50px',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '16px',
                letterSpacing: '0.5px',
              }}>
                {currentEntry?.tense || ''}
              </div>

              <p style={{
                fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '8px',
                fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px',
              }}>
                Definition
              </p>
              <p style={{
                fontSize: '20px', color: 'var(--text-primary)', marginBottom: '24px',
                fontWeight: 500, lineHeight: 1.5, fontFamily: 'var(--font-heading)',
              }}>
                "{currentEntry?.definition}"
              </p>

              {wrongAttempt && !roundStatus && (
                <div style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: 'var(--score-bg-wrong)',
                  color: 'var(--danger-color)',
                  fontWeight: 500,
                  fontSize: '14px',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}>
                  Incorrect, try again
                </div>
              )}

              {roundStatus && (
                <div style={{
                  padding: '24px 28px',
                  borderRadius: '20px',
                  background: roundStatus === 'correct'
                    ? 'var(--sage-gradient)'
                    : 'var(--danger-gradient)',
                  color: 'white',
                  marginBottom: '20px',
                  textAlign: 'center',
                  animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                }}>
                  <div style={{ fontSize: '15px', fontWeight: 500, opacity: 0.9, marginBottom: '8px' }}>
                    {roundStatus === 'correct' ? 'Correct!' : "Time's up!"}
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
                    "{currentEntry?.correct}"
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!!roundStatus}
                  placeholder="Type the phrasal verb..."
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{
                    width: '100%', padding: '16px 18px',
                    border: `2px solid ${roundStatus ? 'var(--border-light)' : wrongAttempt ? 'var(--danger-color)' : 'var(--olive)'}`,
                    borderRadius: '16px', fontSize: '20px', textAlign: 'center',
                    background: roundStatus ? 'var(--input-disabled-bg)' : 'var(--input-bg)',
                    outline: 'none', fontWeight: 500,
                    transition: 'all 0.25s', color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => {
                    if (!roundStatus) e.target.style.borderColor = 'var(--sage)'
                  }}
                  onBlur={(e) => {
                    if (!roundStatus) e.target.style.borderColor = wrongAttempt ? 'var(--danger-color)' : 'var(--olive)'
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSubmit}
                  disabled={!userInput.trim() || !!roundStatus}
                  style={{
                    width: '100%', padding: '16px 32px',
                    background: (!userInput.trim() || roundStatus)
                      ? 'var(--surface-muted)'
                      : 'var(--sage-gradient)',
                    color: 'white', border: 'none', borderRadius: '16px',
                    fontWeight: 600,
                    cursor: (!userInput.trim() || roundStatus) ? 'not-allowed' : 'pointer',
                    fontSize: '16px', transition: 'all 0.25s',
                    boxShadow: (!userInput.trim() || roundStatus)
                      ? 'none'
                      : '0 4px 16px rgba(107,127,103,0.25)',
                    opacity: (!userInput.trim() || roundStatus) ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    if (userInput.trim() && !roundStatus) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,127,103,0.35)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (userInput.trim() && !roundStatus) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,127,103,0.25)';
                    }
                  }}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        ) : (
          <GameResults score={score} totalRounds={totalRounds} onPlayAgain={playAgain} />
        )}
      </div>
    </div>
  )
}
