import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { ArrowLeft, Clock, Mic, ChevronRight, CheckCircle, Sparkles } from 'lucide-react'
import ExamTimeline from '../components/ExamTimeline'

const SPEAKING_PARTS = {
  part1: {
    name: 'Part 1: Introduction',
    desc: 'Questions about familiar topics',
    duration: '4-5 minutes',
    questions: [
      'What is your name? Where do you come from?',
      'Do you work or are you a student? What do you enjoy most about it?',
      'What do you usually do in your free time? Why?',
      'Is there a hobby you have enjoyed since childhood?',
      'Do you prefer spending time alone or with friends? Why?',
    ],
  },
  part2: {
    name: 'Part 2: Long Turn',
    desc: 'Speak for 1-2 minutes about a topic',
    duration: '3-4 minutes',
    hints: [
      'Where did you go?',
      'Who did you go with?',
      'What did you do there?',
      'Why was it memorable?',
    ],
    topic: 'Describe a memorable trip you have taken.',
  },
  part3: {
    name: 'Part 3: Discussion',
    desc: 'Discuss abstract ideas related to Part 2',
    duration: '4-5 minutes',
    questions: [
      'Why do you think people enjoy traveling?',
      'How has travel changed in the last few decades?',
      'Do you think tourism has more positive or negative effects on local communities?',
      'What role does technology play in modern travel?',
    ],
  },
} as const

type PartId = keyof typeof SPEAKING_PARTS
type Phase = 'intro' | 'active' | 'review'

const SECTIONS = [
  { id: 'reading', name: 'Reading', status: 'completed' as const },
  { id: 'listening', name: 'Listening', status: 'completed' as const },
  { id: 'writing', name: 'Writing', status: 'completed' as const },
  { id: 'speaking', name: 'Speaking', status: 'active' as const },
]

const TOTAL_TIME = 10 * 60

export default function ExamSpeaking() {
  const navigate = useNavigate()
  const { getToken } = useAuth()

  const [phase, setPhase] = useState<Phase>('intro')
  const [currentPart, setCurrentPart] = useState<PartId>('part1')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev <= 1 ? (clearInterval(timer), 0) : prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (timeLeft === 0 && !submitted && !submitting) {
      handleSubmit()
    }
  }, [timeLeft, submitted, submitting])

  const getPartQuestions = (part: PartId) => {
    const partData = SPEAKING_PARTS[part]
    return 'questions' in partData ? partData.questions : []
  }

  const getPartTotalQuestions = (part: PartId) => {
    return getPartQuestions(part).length
  }

  const isLastQuestionInPart = (part: PartId, index: number) => {
    const total = getPartTotalQuestions(part)
    return total === 0 || index >= total - 1
  }

  const getNextPart = (part: PartId): PartId | 'review' => {
    const order: PartId[] = ['part1', 'part2', 'part3']
    const currentIdx = order.indexOf(part)
    const nextIdx = currentIdx + 1
    return nextIdx < order.length ? order[nextIdx] : 'review'
  }

  const handleStartPart = (part: PartId) => {
    setCurrentPart(part)
    setCurrentIndex(0)
    setCurrentAnswer('')
    setPhase('active')
  }

  const handleFinishPart = () => {
    const key = `${currentPart}_q${currentIndex}`
    setAnswers(prev => ({ ...prev, [key]: currentAnswer }))

    const next = getNextPart(currentPart)
    if (next === 'review') {
      setPhase('review')
    } else {
      setCurrentPart(next)
      setCurrentIndex(0)
    }
    setCurrentAnswer('')
  }

  const handleNextQuestion = () => {
    if (!currentAnswer.trim()) return

    const key = `${currentPart}_q${currentIndex}`
    setAnswers(prev => ({ ...prev, [key]: currentAnswer }))

    if (isLastQuestionInPart(currentPart, currentIndex)) {
      handleFinishPart()
    } else {
      setCurrentIndex(prev => prev + 1)
      setCurrentAnswer('')
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
          section: 'speaking',
          answers,
          totalTime: TOTAL_TIME - timeLeft,
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        fetchFeedback()
      } else {
        alert('Failed to submit. Please try again.')
      }
    } catch (err) {
      console.error('Submit error:', err)
      alert('Network error. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }, [answers, submitted, submitting, getToken, timeLeft])

  const fetchFeedback = async () => {
    setFeedbackLoading(true)
    try {
      const token = await getToken()
      const allAnswers = [
        ...SPEAKING_PARTS.part1.questions.map((q, i) => ({
          question: q,
          answer: answers[`part1_q${i}`] || '',
        })),
        {
          question: SPEAKING_PARTS.part2.topic,
          answer: answers['part2_q0'] || '',
        },
        ...SPEAKING_PARTS.part3.questions.map((q, i) => ({
          question: q,
          answer: answers[`part3_q${i}`] || '',
        })),
      ]

      const res = await fetch('/api/output/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: allAnswers }),
      })
      if (res.ok) {
        const data = await res.json()
        setFeedback(data)
      }
    } catch (err) {
      console.error('Feedback error:', err)
    } finally {
      setFeedbackLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getCurrentQuestion = () => {
    const questions = getPartQuestions(currentPart)
    if (currentPart === 'part2') {
      return SPEAKING_PARTS.part2.topic
    }
    return questions[currentIndex] || ''
  }

  const getButtonLabel = () => {
    const questions = getPartQuestions(currentPart)
    if (questions.length === 0) return 'Finish Part 2'
    if (currentPart === 'part3' && currentIndex >= questions.length - 1) return 'Finish'
    return 'Next Question'
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
        padding: '48px 24px',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            background: 'var(--sage-gradient)',
            borderRadius: '24px',
            padding: '48px',
            textAlign: 'center',
            color: 'white',
            marginBottom: '32px',
          }}>
            <CheckCircle size={64} style={{ marginBottom: '16px' }} />
            <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
              Speaking Complete!
            </h2>
            <p style={{ fontSize: '16px', opacity: 0.9 }}>
              All three parts finished
            </p>
          </div>

          {feedbackLoading && (
            <div style={{
              background: 'var(--card-white)',
              borderRadius: '20px',
              padding: '32px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-soft)',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid var(--olive)',
                borderTopColor: 'var(--sage)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px',
              }} />
              <p style={{ color: 'var(--sage)' }}>Analyzing your responses...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}

          {feedback && (
            <div style={{
              background: 'var(--card-white)',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: 'var(--shadow-soft)',
              marginBottom: '24px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}>
                <Sparkles size={24} color="var(--sage)" />
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>AI Feedback</h3>
              </div>

              <div style={{
                background: 'var(--sage-gradient)',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
                marginBottom: '20px',
              }}>
                <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px' }}>Estimated Level</p>
                <p style={{ fontSize: '48px', fontWeight: 800 }}>{feedback.level}</p>
                <p style={{ fontSize: '14px', opacity: 0.9 }}>{feedback.levelReason}</p>
              </div>

              <div style={{
                padding: '20px',
                background: 'var(--surface-muted)',
                borderRadius: '12px',
                marginBottom: '16px',
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Overall Feedback</h4>
                <p style={{ fontSize: '14px', lineHeight: 1.7 }}>{feedback.overallFeedback}</p>
              </div>

              {feedback.feedback?.slice(0, 3).map((item: any, i: number) => (
                <div key={i} style={{
                  padding: '16px',
                  background: 'var(--surface-muted)',
                  borderRadius: '12px',
                  marginBottom: '12px',
                }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sage)', marginBottom: '4px' }}>
                    Strengths
                  </p>
                  <p style={{ fontSize: '14px', marginBottom: '8px' }}>{item.strengths}</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#C17A4A', marginBottom: '4px' }}>
                    Improvements
                  </p>
                  <p style={{ fontSize: '14px' }}>{item.improvements}</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate('/exam')}
            style={{
              width: '100%',
              padding: '16px',
              background: 'var(--sage-gradient)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to Exam Hub
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'intro') {
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
              onClick={() => navigate('/exam')}
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
              IELTS Speaking
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

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '48px 24px' }}>
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
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--sage-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <Mic size={36} color="white" />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
              IELTS Speaking Test
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-subtle)', marginBottom: '32px' }}>
              Practice all three parts of the speaking exam
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textAlign: 'left',
            }}>
              {(Object.keys(SPEAKING_PARTS) as PartId[]).map(part => (
                <div
                  key={part}
                  style={{
                    padding: '20px',
                    background: 'var(--surface-muted)',
                    borderRadius: '12px',
                    border: '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--sage)'
                    e.currentTarget.style.background = 'var(--card-white)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent'
                    e.currentTarget.style.background = 'var(--surface-muted)'
                  }}
                  onClick={() => handleStartPart(part)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                        {SPEAKING_PARTS[part].name}
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>
                        {SPEAKING_PARTS[part].desc}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--sage)', marginTop: '4px' }}>
                        {SPEAKING_PARTS[part].duration}
                      </p>
                    </div>
                    <ChevronRight size={20} color="var(--text-subtle)" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
        padding: '48px 24px',
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: 'var(--card-white)',
            borderRadius: '24px',
            padding: '48px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-soft)',
          }}>
            <CheckCircle size={64} color="var(--sage)" style={{ marginBottom: '24px' }} />
            <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
              All Parts Complete!
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-subtle)', marginBottom: '32px' }}>
              Ready to submit your speaking responses
            </p>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '16px 48px',
                background: submitting ? 'var(--surface-muted)' : 'var(--sage-gradient)',
                color: submitting ? 'var(--text-subtle)' : 'white',
                border: 'none',
                borderRadius: '50px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Submitting...' : 'Submit & Get Feedback'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const questions = getPartQuestions(currentPart)
  const totalQuestions = questions.length || 1
  const questionLabel = questions.length === 0
    ? 'Topic'
    : `Question ${currentIndex + 1} of ${totalQuestions}`

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
            onClick={() => setPhase('intro')}
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
            <ArrowLeft size={16} /> Back
          </button>
          <h1 style={{ fontSize: '18px', color: 'var(--sage)', fontWeight: 600 }}>
            {SPEAKING_PARTS[currentPart].name}
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

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{
          background: 'var(--card-white)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-soft)',
        }}>
          <ExamTimeline sections={SECTIONS} />
        </div>

        {currentPart === 'part2' && (
          <div style={{
            background: 'var(--card-white)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-soft)',
          }}>
            <p style={{ fontSize: '13px', color: 'var(--text-subtle)', marginBottom: '8px' }}>
              {SPEAKING_PARTS.part2.hints.length} points to cover:
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {SPEAKING_PARTS.part2.hints.map((hint, i) => (
                <li key={i} style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {hint}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{
          background: 'var(--card-white)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: 'var(--shadow-soft)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}>
            <span style={{
              padding: '6px 14px',
              background: 'var(--sage-gradient)',
              color: 'white',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
            }}>
              {questionLabel}
            </span>
          </div>

          <p style={{
            fontSize: '20px',
            fontWeight: 500,
            lineHeight: 1.6,
            marginBottom: '32px',
            color: 'var(--text-primary)',
          }}>
            {getCurrentQuestion()}
          </p>

          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Type your response here..."
            rows={5}
            style={{
              width: '100%',
              padding: '16px',
              border: '2px solid var(--olive)',
              borderRadius: '12px',
              fontSize: '15px',
              lineHeight: 1.7,
              fontFamily: 'var(--font-body)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              outline: 'none',
              resize: 'vertical',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--sage)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--olive)'}
          />

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '24px',
          }}>
            <button
              onClick={handleNextQuestion}
              disabled={!currentAnswer.trim()}
              style={{
                padding: '14px 32px',
                background: currentAnswer.trim() ? 'var(--sage-gradient)' : 'var(--surface-muted)',
                color: currentAnswer.trim() ? 'white' : 'var(--text-subtle)',
                border: 'none',
                borderRadius: '50px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: currentAnswer.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {getButtonLabel()}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
