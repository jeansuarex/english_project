import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { ArrowLeft, Clock, ChevronRight, CheckCircle } from 'lucide-react'
import ExamTimeline from '../components/ExamTimeline'

const READING_TEXT = `The Emergence of Behavioral Economics in Public Policy

Traditional economic theory has long operated on the assumption that individuals act as rational agents, systematically maximizing their utility in response to changing incentives. However, the latter half of the twentieth century witnessed a fundamental challenge to this paradigm, as psychologists and economists began collaborating to expose the numerous ways in which human decision-making deviates from the rational ideal. This interdisciplinary field, subsequently termed behavioral economics, has fundamentally altered how policymakers conceptualize the mechanisms through which citizens respond to governmental interventions.

Richard Thaler, often regarded as one of the discipline's founding figures, demonstrated through meticulous experimental research that individuals exhibit systematic biases in their cognitive processing. These include present bias, whereby people disproportionately prioritize immediate rewards over future benefits, and loss aversion, the psychological phenomenon whereby losses loom approximately twice as prominently in consciousness as equivalent gains. Such findings have profound implications for the design of public policies ranging from pension systems to healthcare enrollment.

The practical application of these insights to governance was notably advanced by the establishment of behavioral insights teams within governmental structures. The United Kingdom's Behavioural Insights Team, founded in 2010 as a social enterprise, pioneered the methodology of randomized controlled trials to evaluate policy interventions in real-world contexts. Their work on tax compliance demonstrated that simplified letters emphasizing the social consequences of non-payment increased payment rates more effectively than traditional penalty-based approaches.

Critics of behavioral economics, however, raise legitimate concerns regarding the ethical implications of policymakers manipulating citizen choices through strategic choice architecture. The concept of nudging—interventions that steer individuals toward particular behaviors while preserving their freedom of choice—has attracted particular scrutiny. Philosophers argue that even well-intentioned nudges represent a form of paternalism that may undermine individual autonomy and democratic deliberation.

Furthermore, the empirical foundation of behavioral economics has faced criticism from methodological perspectives. Many classic experiments suffer from limited sample sizes and poor replication rates, raising questions about the generalizability of findings across diverse populations. The extent to which laboratory results translate into natural environments remains contested, with field experiments producing sometimes contradictory outcomes.

Despite these limitations, behavioral economics continues to influence policy development across multiple domains. Its impact is perhaps most visible in the realms of retirement savings, wherein automatic enrollment with escalation has substantially increased participation rates, and public health, where strategic defaults have successfully promoted organ donation and healthy behaviors. The integration of behavioral insights into evidence-based policymaking represents a significant evolution in administrative practice, even as debates regarding its theoretical underpinnings and ethical boundaries persist within academic discourse.`

const QUESTIONS = [
  {
    id: 'q1',
    type: 'multiple',
    question: 'According to the passage, what psychological phenomenon causes losses to be perceived as approximately twice as significant as equivalent gains?',
    options: ['Present bias', 'Loss aversion', 'Cognitive dissonance', 'Anchoring effect'],
    correct: 1,
  },
  {
    id: 'q2',
    type: 'true-false',
    question: 'The UK Behavioural Insights Team was established as a private corporation before becoming a social enterprise.',
    options: ['True', 'False', 'Not Given'],
    correct: 1,
  },
  {
    id: 'q3',
    type: 'multiple',
    question: 'Which of the following is cited as an example of a successful behavioral economics intervention in public health?',
    options: ['Increasing penalty rates for unhealthy behaviors', 'Mandatory behavioral assessments before treatment', 'Strategic defaults promoting organ donation', 'Restricting choices through regulation'],
    correct: 2,
  },
  {
    id: 'q4',
    type: 'true-false',
    question: 'The passage suggests that all classic behavioral economics experiments have been successfully replicated in multiple settings.',
    options: ['True', 'False', 'Not Given'],
    correct: 1,
  },
  {
    id: 'q5',
    type: 'multiple',
    question: 'According to critics of behavioral economics, what ethical concern is raised regarding nudging?',
    options: ['It is too expensive to implement', 'It may undermine individual autonomy', 'It only works for short-term behaviors', 'It requires excessive government bureaucracy'],
    correct: 1,
  },
  {
    id: 'q6',
    type: 'true-false',
    question: 'Richard Thaler\'s research demonstrated that people consistently make optimal financial decisions when given appropriate incentives.',
    options: ['True', 'False', 'Not Given'],
    correct: 1,
  },
  {
    id: 'q7',
    type: 'multiple',
    question: 'The passage indicates that automatic enrollment with escalation has primarily affected which domain?',
    options: ['Healthcare enrollment', 'Tax compliance', 'Retirement savings', 'Educational attainment'],
    correct: 2,
  },
]

const SECTIONS = [
  { id: 'reading', name: 'Reading', status: 'active' as const },
  { id: 'listening', name: 'Listening', status: 'pending' as const },
  { id: 'writing', name: 'Writing', status: 'pending' as const },
  { id: 'speaking', name: 'Speaking', status: 'pending' as const },
]

const TOTAL_TIME = 10 * 60

export default function ExamReading() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [answers, setAnswers] = useState<Record<string, number | null>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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

  const handleAnswer = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }))
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
          section: 'reading',
          answers: QUESTIONS.map(q => ({
            questionId: q.id,
            type: q.type,
            userAnswer: answers[q.id],
            correctAnswer: q.correct,
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

  const allAnswered = QUESTIONS.every(q => answers[q.id] !== null && answers[q.id] !== undefined)

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
              onClick={() => navigate('/exam-listening')}
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
      userSelect: 'none',
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
            IELTS Reading
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

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>
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
          marginBottom: '24px',
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
            Reading Text
          </div>
          <p style={{
            fontSize: '14px',
            lineHeight: 1.9,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
          }}>
            {READING_TEXT}
          </p>
        </div>

        <div style={{
          background: 'var(--card-white)',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: 'var(--shadow-soft)',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>
            Questions
          </h2>

          {QUESTIONS.map((q, i) => (
            <div key={q.id} style={{
              padding: '20px 0',
              borderBottom: i < QUESTIONS.length - 1 ? '1px solid var(--border-light)' : 'none',
            }}>
              <p style={{ fontSize: '15px', fontWeight: 500, marginBottom: '12px' }}>
                {i + 1}. {q.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map((option, optionIndex) => (
                  <button
                    key={optionIndex}
                    onClick={() => handleAnswer(q.id, optionIndex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: answers[q.id] === optionIndex
                        ? 'var(--sage)'
                        : 'var(--surface-muted)',
                      color: answers[q.id] === optionIndex ? 'white' : 'var(--text-primary)',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: `2px solid ${answers[q.id] === optionIndex ? 'white' : 'var(--border-light)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            style={{
              padding: '16px 48px',
              background: allAnswered ? 'var(--sage-gradient)' : 'var(--surface-muted)',
              color: allAnswered ? 'white' : 'var(--text-subtle)',
              border: 'none',
              borderRadius: '50px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: allAnswered && !submitting ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: !allAnswered ? 0.6 : 1,
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Answers'}
            <ChevronRight size={18} />
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: 'var(--text-subtle)' }}>
          {allAnswered
            ? 'All questions answered — ready to submit'
            : `${QUESTIONS.length - Object.keys(answers).filter(k => answers[k] !== null).length} questions remaining`}
        </p>
      </div>
    </div>
  )
}
