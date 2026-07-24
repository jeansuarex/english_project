import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { ArrowLeft, Clock, Sparkles, ChevronRight } from 'lucide-react'
import ExamTimeline from '../components/ExamTimeline'

const WRITING_PROMPTS = [
  {
    type: 'Task 2',
    topic: 'Some people believe that universities should focus on providing academic knowledge, while others think they should also teach practical skills for employment. Discuss both views and give your own opinion.',
    tips: [
      'Introduce the topic and present your position',
      'Discuss the view that universities should focus on academic knowledge',
      'Discuss the view that universities should teach practical skills',
      'Present your own opinion with reasons',
      'Write at least 250 words',
    ],
    wordCount: 250,
  },
]

const SECTIONS = [
  { id: 'reading', name: 'Reading', status: 'completed' as const },
  { id: 'listening', name: 'Listening', status: 'completed' as const },
  { id: 'writing', name: 'Writing', status: 'active' as const },
  { id: 'speaking', name: 'Speaking', status: 'pending' as const },
]

const TOTAL_TIME = 10 * 60

export default function ExamWriting() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)

  const prompt = WRITING_PROMPTS[0]

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

  const handleSubmit = useCallback(async () => {
    if (submitted || submitting || !answer.trim()) return
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
          section: 'writing',
          prompt: prompt.topic,
          answer,
          wordCount: answer.split(/\s+/).filter(Boolean).length,
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
  }, [answer, submitted, submitting, getToken, prompt])

  useEffect(() => {
    if (timeLeft === 0 && !submitted && !submitting && answer.trim()) {
      handleSubmit()
    }
  }, [timeLeft, submitted, submitting, answer, handleSubmit])

  const getFeedback = async () => {
    setFeedbackLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/output/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: [{ question: prompt.topic, answer }],
        }),
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

  const wordCount = answer.split(/\s+/).filter(Boolean).length
  const charCount = answer.length

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
        padding: '48px 24px',
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: 'var(--sage-gradient)',
            borderRadius: '24px',
            padding: '48px',
            textAlign: 'center',
            color: 'white',
            marginBottom: '32px',
          }}>
            <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
              Writing Submitted!
            </h2>
            <p style={{ fontSize: '16px', opacity: 0.9 }}>
              {wordCount} words written
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
              <p style={{ color: 'var(--sage)' }}>Getting AI feedback...</p>
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

              {feedback.feedback?.map((item: any, i: number) => (
                <div key={i} style={{
                  padding: '16px',
                  background: 'var(--surface-muted)',
                  borderRadius: '12px',
                  marginBottom: '12px',
                }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sage)', marginBottom: '4px' }}>
                    Strengths
                  </p>
                  <p style={{ fontSize: '14px', marginBottom: '12px' }}>{item.strengths}</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#C17A4A', marginBottom: '4px' }}>
                    Improvements
                  </p>
                  <p style={{ fontSize: '14px' }}>{item.improvements}</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate('/exam-speaking')}
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
            Continue to Speaking
          </button>
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
            IELTS Writing
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

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px' }}>
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
          padding: '32px',
          boxShadow: 'var(--shadow-soft)',
        }}>
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: 'var(--sage-gradient)',
            color: 'white',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '16px',
          }}>
            {prompt.type}
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 600, lineHeight: 1.6, marginBottom: '24px' }}>
            {prompt.topic}
          </h2>

          <div style={{
            background: 'var(--surface-muted)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-subtle)', marginBottom: '8px' }}>
              Writing Tips
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {prompt.tips.map((tip, i) => (
                <li key={i} style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Start writing your essay here..."
            style={{
              width: '100%',
              minHeight: '300px',
              padding: '16px',
              border: '2px solid var(--olive)',
              borderRadius: '12px',
              fontSize: '15px',
              lineHeight: 1.8,
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
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
          }}>
            <p style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>
              {wordCount} words · {charCount} characters
              {wordCount < prompt.wordCount && (
                <span style={{ color: 'var(--warning-color)', marginLeft: '8px' }}>
                  (minimum {prompt.wordCount})
                </span>
              )}
            </p>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || submitting}
              style={{
                padding: '16px 48px',
                background: answer.trim() ? 'var(--sage-gradient)' : 'var(--surface-muted)',
                color: answer.trim() ? 'white' : 'var(--text-subtle)',
                border: 'none',
                borderRadius: '50px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: answer.trim() && !submitting ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto',
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Writing'}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
