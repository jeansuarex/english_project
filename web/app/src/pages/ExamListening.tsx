import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { ArrowLeft, Clock, Volume2, CheckCircle } from 'lucide-react'
import ExamTimeline from '../components/ExamTimeline'

const LISTENING_ITEMS = [
  { text: 'The meeting has been scheduled for Thursday afternoon.', hint: 'When is the meeting?' },
  { text: 'We need to review the quarterly financial report before submission.', hint: 'What needs to be reviewed?' },
  { text: 'The conference will take place at the Grand Hotel in downtown.', hint: 'Where will the conference be held?' },
  { text: 'Professor Anderson will deliver the opening keynote speech.', hint: 'Who will give the opening speech?' },
  { text: 'Students should submit their assignments by the end of this week.', hint: 'When should assignments be submitted?' },
]

const SECTIONS = [
  { id: 'reading', name: 'Reading', status: 'completed' as const },
  { id: 'listening', name: 'Listening', status: 'active' as const },
  { id: 'writing', name: 'Writing', status: 'pending' as const },
  { id: 'speaking', name: 'Speaking', status: 'pending' as const },
]

const TOTAL_TIME = 10 * 60

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

export default function ExamListening() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>(Array(LISTENING_ITEMS.length).fill(''))
  const [played, setPlayed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        return false
      }
    }
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('contextmenu', handleContextMenu)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const speak = useCallback((text: string) => {
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.82
      utterance.pitch = 1.0
      if (voiceRef.current) utterance.voice = voiceRef.current
      window.speechSynthesis.speak(utterance)
    } catch {
      // Speech synthesis not available
    }
  }, [])

  const handlePlay = () => {
    speak(LISTENING_ITEMS[currentIndex].text)
    setPlayed(true)
  }

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...answers]
    newAnswers[currentIndex] = value
    setAnswers(newAnswers)
    setPlayed(false)
  }

  const handleNext = () => {
    if (currentIndex < LISTENING_ITEMS.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setPlayed(false)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setPlayed(false)
    }
  }

  const handleSubmit = useCallback(async () => {
    if (submitted || submitting) return
    setSubmitting(true)

    try {
      const token = await getToken()
      const response = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          section: 'listening',
          answers: LISTENING_ITEMS.map((item, i) => ({
            text: item.text,
            userAnswer: answers[i],
          })),
        }),
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        const errorText = await response.text()
        console.error('Submit failed:', response.status, errorText)
        alert('Failed to submit. Please try again.')
      }
    } catch (err) {
      console.error('Submit error:', err)
      alert('Network error. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }, [answers, submitted, submitting, getToken])

  useEffect(() => {
    if (timeLeft === 0 && !submitted && !submitting) {
      handleSubmit()
    }
  }, [timeLeft, submitted, submitting, handleSubmit])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getScore = () => {
    let correct = 0
    LISTENING_ITEMS.forEach((item, i) => {
      const userAnswer = answers[i].toLowerCase().trim()
      const correctAnswer = item.text.toLowerCase()
      if (userAnswer === correctAnswer ||
          (userAnswer.length > 0 && correctAnswer.includes(userAnswer) && userAnswer.length > 10)) {
        correct++
      }
    })
    return correct
  }

  const currentItem = LISTENING_ITEMS[currentIndex]

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
        padding: '48px 24px',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: 'var(--sage-gradient)',
            borderRadius: '24px',
            padding: '64px 48px',
            textAlign: 'center',
            color: 'white',
            boxShadow: '0 8px 32px rgba(107, 127, 103, 0.3)',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <CheckCircle size={40} />
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
              Section Complete!
            </h2>
            <p style={{ fontSize: '16px', opacity: 0.9 }}>
              Your answers have been submitted.
            </p>
          </div>

          <div style={{
            marginTop: '24px',
            textAlign: 'center',
          }}>
            <button
              onClick={() => navigate('/exam-writing')}
              style={{
                padding: '14px 32px',
                background: 'var(--sage-gradient)',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(107, 127, 103, 0.3)',
              }}
            >
              Continue to Next Section
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 32px',
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => {
              if (window.confirm('Leave exam? Your progress will be lost.')) {
                navigate('/exam')
              }
            }}
            style={{
              padding: '8px 16px',
              background: 'var(--surface-muted)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={16} /> Exit
          </button>
          <h1 style={{ fontSize: '18px', color: 'var(--sage)', fontWeight: 600 }}>
            IELTS Listening
          </h1>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: timeLeft < 60 ? 'var(--error-bg)' : 'var(--surface-muted)',
          borderRadius: '8px',
          color: timeLeft < 60 ? 'var(--error-color)' : 'var(--text-primary)',
          fontWeight: 600,
        }}>
          <Clock size={18} />
          {formatTime(timeLeft)}
        </div>
      </header>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px' }}>
        <div style={{
          background: 'var(--card-white)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-soft)',
        }}>
          <ExamTimeline sections={SECTIONS} />
        </div>

        <div style={{
          background: 'var(--card-white)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: 'var(--shadow-soft)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}>
            <span style={{
              padding: '6px 14px',
              background: 'var(--sage-gradient)',
              color: 'white',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
            }}>
              Question {currentIndex + 1} of {LISTENING_ITEMS.length}
            </span>
            {played && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--sage)',
                fontSize: '13px',
                fontWeight: 500,
              }}>
                <CheckCircle size={16} /> Audio played
              </span>
            )}
          </div>

          <p style={{
            fontSize: '16px',
            color: 'var(--text-subtle)',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {currentItem.hint}
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '32px',
          }}>
            <button
              onClick={handlePlay}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'var(--sage-gradient)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(107, 127, 103, 0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(107, 127, 103, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(107, 127, 103, 0.3)'
              }}
            >
              <Volume2 size={32} color="white" />
            </button>
          </div>

          <p style={{
            fontSize: '13px',
            color: 'var(--text-subtle)',
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            Click play to hear the sentence, then type what you hear
          </p>

          <input
            type="text"
            value={answers[currentIndex]}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Type what you hear..."
            style={{
              width: '100%',
              padding: '16px',
              border: '2px solid var(--olive)',
              borderRadius: '12px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--sage)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--olive)'}
          />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '24px',
          }}>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              style={{
                padding: '12px 24px',
                background: currentIndex === 0 ? 'var(--surface-muted)' : 'var(--card-white)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                color: currentIndex === 0 ? 'var(--text-subtle)' : 'var(--text-primary)',
              }}
            >
              Previous
            </button>
            {currentIndex < LISTENING_ITEMS.length - 1 ? (
              <button
                onClick={handleNext}
                style={{
                  padding: '12px 24px',
                  background: 'var(--sage-gradient)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'white',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '12px 24px',
                  background: 'var(--sage-gradient)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  color: 'white',
                }}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '24px',
        }}>
          {LISTENING_ITEMS.map((_, i) => (
            <div
              key={i}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: i === currentIndex
                  ? 'var(--sage)'
                  : answers[i]
                    ? 'var(--olive)'
                    : 'var(--border-light)',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
