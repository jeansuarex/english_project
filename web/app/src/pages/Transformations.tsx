import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { ArrowLeft } from 'lucide-react'
import CountdownTimer from '../components/CountdownTimer'
import GameResults from '../components/GameResults'

type RoundStatus = 'waiting' | 'correct' | 'wrong' | 'timeout'
type GameState = 'loading' | 'playing' | 'finished'

interface TransformationEntry {
  base: string
  tense: string
  correct: string
  options: string[]
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Transformations() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [searchParams] = useSearchParams()
  const rounds = Math.min(100, Math.max(1, parseInt(searchParams.get('rounds') || '5', 10)))

  const [gameState, setGameState] = useState<GameState>('loading')
  const [allEntries, setAllEntries] = useState<TransformationEntry[]>([])
  const [roundEntries, setRoundEntries] = useState<TransformationEntry[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [score, setScore] = useState({ correct: 0, wrong: 0 })
  const [timeLeft, setTimeLeft] = useState(20)
  const [roundStatus, setRoundStatus] = useState<RoundStatus | null>(null)
  const [currentEntry, setCurrentEntry] = useState<TransformationEntry | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [animateRound, setAnimateRound] = useState(false)
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([])

  const gameTimerRef = useRef<ReturnType<typeof setInterval>>()
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/sentences.json')
        const data = await res.json()
        const flat: TransformationEntry[] = []
        for (const entry of data) {
          for (const t of entry.transformations) {
            flat.push({
              base: entry.base,
              tense: t.tense,
              correct: t.correct,
              options: shuffleArray(t.options),
            })
          }
        }
        setAllEntries(flat)
        setGameState('playing')
      } catch (err) {
        console.error('Failed to load sentences:', err)
      }
    }
    load()
  }, [])

  const pickRoundEntries = useCallback((pool: TransformationEntry[], count: number) => {
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
          body: JSON.stringify({ gameType: 'transformations', correct: score.correct, wrong: score.wrong, totalRounds: roundEntries.length }),
        })
      })
      return
    }

    clearTimeout(advanceTimeoutRef.current)
    stopTimers()

    const entry = roundEntries[currentRound]
    setCurrentEntry(entry)
    setShuffledOptions(shuffleArray(entry.options))
    setTimeLeft(20)
    setRoundStatus(null)
    setSelectedAnswer(null)
    setAnimateRound(true)

    let time = 20
    gameTimerRef.current = setInterval(() => {
      time--
      setTimeLeft(time)
      if (time <= 0) {
        stopTimers()
        setRoundStatus('timeout')
        setScore(s => ({ ...s, wrong: s.wrong + 1 }))
        advanceTimeoutRef.current = setTimeout(() => {
          setCurrentRound(r => r + 1)
        }, 2000)
      }
    }, 1000)

    const animTimer = setTimeout(() => setAnimateRound(false), 600)

    return () => {
      stopTimers()
      clearTimeout(animTimer)
    }
  }, [gameState, currentRound, roundEntries, stopTimers])

  const handleSelect = (answer: string) => {
    if (!currentEntry || roundStatus) return

    stopTimers()
    setSelectedAnswer(answer)

    if (answer === currentEntry.correct) {
      setRoundStatus('correct')
      setScore(s => ({ ...s, correct: s.correct + 1 }))
    } else {
      setRoundStatus('wrong')
      setScore(s => ({ ...s, wrong: s.wrong + 1 }))
    }

    advanceTimeoutRef.current = setTimeout(() => {
      setCurrentRound(r => r + 1)
    }, 1500)
  }

  const playAgain = () => {
    const picked = pickRoundEntries(allEntries, rounds)
    setRoundEntries(picked)
    setCurrentRound(0)
    setScore({ correct: 0, wrong: 0 })
    setGameState('playing')
  }

  const tenseLabels: Record<string, string> = {
    'past simple': 'Past Simple',
    'present continuous': 'Present Continuous',
    'present perfect': 'Present Perfect',
    'future simple': 'Future Simple',
    'past continuous': 'Past Continuous',
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
          <p style={{ color: 'var(--sage)', fontSize: '15px' }}>Loading sentences...</p>
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
            Transformations
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
            textAlign: 'center', maxWidth: '680px', width: '100%',
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

            <CountdownTimer timeLeft={timeLeft} totalTime={20} />

            <div style={{
              background: 'var(--bg-overlay)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '24px',
              padding: '40px 36px 36px',
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
                Transform to {currentEntry ? tenseLabels[currentEntry.tense] || currentEntry.tense : ''}
              </div>

              <p style={{
                fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '8px',
                fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px',
              }}>
                Original sentence
              </p>
              <p style={{
                fontSize: '22px', color: 'var(--text-primary)', marginBottom: '32px',
                fontWeight: 500, lineHeight: 1.5, fontFamily: 'var(--font-heading)',
              }}>
                "{currentEntry?.base}"
              </p>

              {roundStatus && (
                <div style={{
                  padding: '14px 20px',
                  borderRadius: '16px',
                  background: roundStatus === 'correct'
                    ? 'var(--sage-gradient)'
                    : 'var(--danger-gradient)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '16px',
                  marginBottom: '20px',
                  textAlign: 'center',
                  animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                }}>
                  {roundStatus === 'correct' && 'Correct!'}
                  {roundStatus === 'wrong' && `Wrong! The answer was: "${currentEntry?.correct}"`}
                  {roundStatus === 'timeout' && `Time's up! The answer was: "${currentEntry?.correct}"`}
                </div>
              )}

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
              }}>
                {shuffledOptions.map((option) => {
                  let bg = roundStatus
                    ? (option === currentEntry?.correct ? 'var(--sage-gradient)'
                      : option === selectedAnswer ? 'var(--danger-gradient)'
                      : 'var(--surface-muted)')
                    : 'var(--bg-overlay-solid)'
                  let border = roundStatus
                    ? (option === currentEntry?.correct ? '1px solid var(--sage)'
                      : option === selectedAnswer ? '1px solid var(--danger-color)'
                      : '1px solid var(--border-subtle)')
                    : '2px solid var(--olive)'
                  let textColor = roundStatus
                    ? (option === currentEntry?.correct || option === selectedAnswer ? 'white' : 'var(--text-subtle)')
                    : 'var(--text-primary)'

                  return (
                    <button
                      key={option}
                      onClick={() => handleSelect(option)}
                      disabled={!!roundStatus}
                      style={{
                        padding: '18px 16px',
                        background: bg,
                        border,
                        borderRadius: '16px',
                        cursor: roundStatus ? 'default' : 'pointer',
                        fontSize: '15px',
                        fontWeight: 500,
                        color: textColor,
                        transition: 'all 0.2s',
                        textAlign: 'center',
                        lineHeight: 1.4,
                      }}
                      onMouseEnter={(e) => {
                        if (!roundStatus) {
                          e.currentTarget.style.borderColor = 'var(--sage)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(107,127,103,0.15)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!roundStatus) {
                          e.currentTarget.style.borderColor = 'var(--olive)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }
                      }}
                    >
                      {option}
                    </button>
                  )
                })}
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
