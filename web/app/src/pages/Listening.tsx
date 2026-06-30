import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { ArrowLeft } from 'lucide-react'
import CountdownTimer from '../components/CountdownTimer'
import GameResults from '../components/GameResults'

type RoundStatus = 'waiting' | 'correct' | 'wrong' | 'timeout'
type GameState = 'loading' | 'playing' | 'finished'

function getBestVoice(): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices()
    return voices.find(v => /Microsoft\s+(David|Zira|Mark)/i.test(v.name))
      || voices.find(v => /Google\s+(UK|US)\s+(English\s+)?(Female|Male)/i.test(v.name))
      || voices.find(v => v.name.includes('Samantha'))
      || voices.find(v => v.name.includes('Karen'))
      || voices.find(v => /natural|premium|enhanced/i.test(v.name))
      || voices.find(v => v.lang.startsWith('en') && v.name.includes('Female'))
      || voices.find(v => v.lang.startsWith('en'))
      || null
  } catch {
    return null
  }
}

export default function Listening() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [searchParams] = useSearchParams()
  const rounds = Math.min(98, Math.max(1, parseInt(searchParams.get('rounds') || '5', 10)))

  const [gameState, setGameState] = useState<GameState>('loading')
  const [words, setWords] = useState<string[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [score, setScore] = useState({ correct: 0, wrong: 0 })
  const [timeLeft, setTimeLeft] = useState(10)
  const [roundStatus, setRoundStatus] = useState<RoundStatus | null>(null)
  const [currentWord, setCurrentWord] = useState('')
  const [animateRound, setAnimateRound] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const gameTimerRef = useRef<ReturnType<typeof setInterval>>()
  const speechIntervalRef = useRef<ReturnType<typeof setInterval>>()
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    voiceRef.current = getBestVoice()
    if (!voiceRef.current && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        voiceRef.current = getBestVoice()
      }
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/listening-words.txt')
        const text = await res.text()
        const allWords = text.split('\n').map(w => w.trim()).filter(Boolean)
        const shuffled = [...allWords].sort(() => Math.random() - 0.5)
        setWords(shuffled)
        setGameState('playing')
      } catch (err) {
        console.error('Failed to load words:', err)
      }
    }
    load()
  }, [])

  const speak = useCallback((word: string) => {
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(word)
      utterance.lang = 'en-US'
      utterance.rate = 0.82
      utterance.pitch = 1.0
      if (voiceRef.current) utterance.voice = voiceRef.current
      window.speechSynthesis.speak(utterance)
    } catch {
      // Speech synthesis not available
    }
  }, [])

  const stopTimers = useCallback(() => {
    clearInterval(gameTimerRef.current)
    clearInterval(speechIntervalRef.current)
    try { window.speechSynthesis.cancel() } catch {}
  }, [])

  useEffect(() => {
    if (gameState !== 'playing' || words.length === 0) return

    const totalRounds = Math.min(rounds, words.length)
    if (currentRound >= totalRounds) {
      setGameState('finished')
      getToken().then(token => {
        fetch('/api/progress/game-session', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ gameType: 'listening', correct: score.correct, wrong: score.wrong, totalRounds }),
        })
      })
      return
    }

    clearTimeout(advanceTimeoutRef.current)
    stopTimers()

    const word = words[currentRound]
    setCurrentWord(word)
    setUserInput('')
    setTimeLeft(10)
    setRoundStatus(null)
    setAnimateRound(true)

    speak(word)
    speechIntervalRef.current = setInterval(() => speak(word), 2500)

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
        }, 2000)
      }
    }, 1000)

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 50)
    const animTimer = setTimeout(() => setAnimateRound(false), 600)

    return () => {
      stopTimers()
      clearTimeout(focusTimer)
      clearTimeout(animTimer)
    }
  }, [gameState, currentRound, words, rounds, speak, stopTimers])

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
    if (!trimmed || roundStatus) return

    stopTimers()

    if (trimmed === currentWord.toLowerCase()) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const replay = () => {
    if (currentWord) speak(currentWord)
    focusInput()
  }

  const playAgain = () => {
    const shuffled = [...words].sort(() => Math.random() - 0.5)
    setWords(shuffled)
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
          <p style={{ color: 'var(--sage)', fontSize: '15px' }}>Loading words...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const totalRounds = Math.min(rounds, words.length)
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
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1 style={{ fontSize: '18px', color: 'var(--sage)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
            Listening Practice
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
          <div className="animate-fade-in-up" style={{
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
              <button
                onClick={replay}
                style={{
                  background: 'var(--card-white)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '50%', width: '72px', height: '72px', fontSize: '30px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.25s', margin: '0 auto 20px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.08)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(107,127,103,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)';
                }}
                title="Replay word"
              >
                🔊
              </button>

              <p style={{
                fontSize: '14px', color: 'var(--text-subtle)', marginBottom: '20px',
                fontWeight: 500, letterSpacing: '0.3px',
              }}>
                Type what you hear
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
                  {roundStatus === 'wrong' && `Wrong! The word was: "${currentWord}"`}
                  {roundStatus === 'timeout' && `Time's up! The word was: "${currentWord}"`}
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
                  placeholder="Type the word..."
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{
                    width: '100%', padding: '16px 18px',
                    border: `2px solid ${roundStatus ? 'var(--border-light)' : 'var(--olive)'}`,
                    borderRadius: '16px', fontSize: '20px', textAlign: 'center',
                    background: roundStatus ? 'var(--input-disabled-bg)' : 'var(--input-bg)',
                    outline: 'none', fontWeight: 500,
                    transition: 'all 0.25s', color: 'var(--text-primary)',
                    letterSpacing: roundStatus ? '0.5px' : '2px',
                  }}
                  onFocus={(e) => {
                    if (!roundStatus) e.target.style.borderColor = 'var(--sage)'
                  }}
                  onBlur={(e) => {
                    if (!roundStatus) e.target.style.borderColor = 'var(--olive)'
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
