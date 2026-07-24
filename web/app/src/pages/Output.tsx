import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { ArrowLeft, Check, MessageSquareText, Sparkles, AlertCircle, Mic } from 'lucide-react'

const POOL = [
  "Describe a hobby you truly enjoy. Why do you enjoy it and how did you first get into it?",
  "What is the most important quality a good friend should have? Explain why it matters to you.",
  "Do you prefer living in a big city or a small town? Give detailed reasons for your preference.",
  "Describe a memorable trip you have taken. What made it special and what did you learn from it?",
  "What is your favourite time of year? Describe what you love about it and any traditions associated with it.",
  "Describe a person who has influenced you the most. How have they shaped your outlook on life?",
  "Describe a skill you would love to master. Why are you drawn to it and how would you approach learning it?",
  "Describe a book, film, or piece of art that left a strong impression on you. What was it about and why did it resonate?",
  "Describe a time when you went out of your way to help someone. How did it affect both of you?",
  "Describe a personal goal you have set for yourself. What steps are you taking to achieve it and what motivates you?",
  "Do you believe technology has improved the way people communicate? Discuss both the positives and negatives.",
  "What are the greatest benefits of learning a second language? Should everyone be encouraged to learn one?",
  "How has education changed in your country over the last decade? Have the changes been for the better?",
  "Does social media have a mainly positive or negative effect on society? Support your argument with examples.",
  "Is it better to work for a large, established company or to start your own business? Discuss the trade-offs.",
  "How important is it to preserve traditional customs in an increasingly globalized world? Explain your view.",
  "Should governments invest more in public transportation or in roads and highways? Justify your opinion.",
  "What role does art and culture play in a healthy society? Should the arts be publicly funded?",
  "How can young people be encouraged to read more books in the age of digital entertainment?",
  "What does success mean to you personally? How do you measure it in your own life?",
  "Describe a challenge you have faced. How did you overcome it and what did you learn from the experience?",
  "Is it better to specialize deeply in one field or to have broad knowledge across many areas? Explain.",
  "How has the way people work changed in recent years? Do you think these changes are mostly positive?",
  "What is the biggest problem facing your generation? How would you begin to address it?",
  "Describe an important tradition from your culture. Why does it matter and should it be preserved?",
  "How could cities be redesigned to be more environmentally friendly and liveable? Share your ideas.",
  "What is the real value of travelling to other countries? What can a person gain beyond sightseeing?",
  "Should schools focus more on academic subjects or on teaching practical life skills? Defend your position.",
  "How do you imagine the world will be different fifty years from now? What changes do you predict and why?",
  "Do you think it is more important to be wealthy or to be content with what you have? Discuss.",
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function Output() {
  const navigate = useNavigate()
  const { getToken } = useAuth()

  const [question] = useState(() => pickRandom(POOL))
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [feedbackData, setFeedbackData] = useState<any>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  // Voice recording & transcription state
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const recognitionRef = useRef<any>(null)
  const finalTranscriptRef = useRef('')

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Please use Chrome or Edge.')
      return
    }

    finalTranscriptRef.current = ''

    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'en-US'

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }
      setTranscribedText(finalTranscriptRef.current + interimTranscript)
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error !== 'no-speech') {
        setIsRecording(false)
      }
    }

    recognitionRef.current.onend = () => {
      setIsRecording(false)
      setIsTranscribing(false)
      const text = finalTranscriptRef.current.trim()
      if (text) {
        setAnswer(prev => prev + (prev ? ' ' : '') + text)
        setTranscribedText('')
        finalTranscriptRef.current = ''
      }
    }

    recognitionRef.current.start()
    setIsRecording(true)
    setIsTranscribing(true)
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const handleSubmit = () => {
    if (!answer.trim()) return
    setSubmitted(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleGetFeedback = async () => {
    setFeedbackLoading(true)
    setFeedbackError(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/output/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers: [{ question, answer }] }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to get feedback')
      }
      const data = await res.json()
      setFeedbackData(data)
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setFeedbackLoading(false)
    }
  }

  const tryAgain = () => {
    navigate(0)
  }

  if (!submitted) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
      }}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          @keyframes recording {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
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
              if (answer && !window.confirm('Leave? Your answer will be lost.')) return
              navigate('/dashboard?tab=practice')
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
              English Output
            </h1>
          </div>
        </header>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '48px 24px',
        }}>
          <div style={{
            textAlign: 'center', maxWidth: '680px', width: '100%',
            animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}>
            <div style={{
              display: 'inline-block',
              padding: '6px 16px',
              background: 'var(--sage-gradient)',
              color: 'white',
              borderRadius: '50px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '28px',
              letterSpacing: '0.5px',
            }}>
              Express yourself
            </div>

            <div style={{
              background: 'var(--bg-overlay)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '24px',
              padding: '40px 36px 36px',
              boxShadow: 'var(--shadow-medium), var(--inset-border)',
              width: '100%',
            }}>
              <p style={{
                fontSize: '22px', color: 'var(--text-primary)', marginBottom: '28px',
                fontWeight: 500, lineHeight: 1.6, fontFamily: 'var(--font-heading)',
                textAlign: 'left',
              }}>
                {question}
              </p>

              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={(e) => e.preventDefault()}
                placeholder="Write your answer here... No pasting allowed — express yourself freely."
                rows={6}
                style={{
                  width: '100%', padding: '18px',
                  border: `2px solid ${answer ? 'var(--sage)' : 'var(--olive)'}`,
                  borderRadius: '16px', fontSize: '16px', lineHeight: 1.7,
                  background: 'var(--input-bg)',
                  outline: 'none', fontWeight: 400,
                  transition: 'all 0.25s', color: 'var(--text-primary)',
                  resize: 'vertical', fontFamily: 'var(--font-body)',
                  minHeight: '160px',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--sage)' }}
                onBlur={(e) => {
                  e.target.style.borderColor = answer ? 'var(--sage)' : 'var(--olive)'
                }}
                autoFocus
              />

              <div style={{ marginTop: '20px' }}>
                {isRecording && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 18px',
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    animation: 'recording 1s ease-in-out infinite',
                  }}>
                    <div style={{
                      width: '10px', height: '10px',
                      borderRadius: '50%',
                      background: 'white',
                      animation: 'pulse 0.8s ease-in-out infinite',
                    }} />
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
                      Recording... Speak now
                    </span>
                  </div>
                )}

                {transcribedText && (
                  <div style={{
                    padding: '14px 18px',
                    background: 'var(--surface-muted)',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    borderLeft: '3px solid var(--sage)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>
                        Transcribed:
                      </p>
                      <button
                        onClick={() => {
                          setAnswer(prev => prev + (prev ? ' ' : '') + transcribedText.trim())
                          setTranscribedText('')
                          finalTranscriptRef.current = ''
                        }}
                        style={{
                          padding: '4px 12px',
                          background: 'var(--sage)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Add to answer
                      </button>
                    </div>
                    <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      "{transcribedText}"
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={toggleRecording}
                    style={{
                      width: '48px', height: '48px',
                      borderRadius: '50%',
                      background: isRecording ? '#dc2626' : 'var(--sage)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                    title={isRecording ? 'Stop recording' : 'Start voice recording'}
                  >
                    {isRecording ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" x2="12" y1="19" y2="22"/>
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!answer.trim()}
                    style={{
                      flex: 1, padding: '16px 32px',
                      background: !answer.trim() ? 'var(--surface-muted)' : 'var(--sage-gradient)',
                      color: 'white', border: 'none', borderRadius: '16px',
                      fontWeight: 600, cursor: !answer.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '16px', transition: 'all 0.25s',
                      boxShadow: !answer.trim() ? 'none' : '0 4px 16px rgba(107,127,103,0.25)',
                      opacity: !answer.trim() ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (answer.trim()) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,127,103,0.35)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (answer.trim()) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,127,103,0.25)';
                      }
                    }}
                  >
                    Submit Answer
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-subtle)', textAlign: 'center', marginTop: '10px' }}>
                  Press Enter to submit · Or click the mic to speak
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
      padding: '48px 24px',
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px',
        }}>
          <button onClick={() => navigate('/dashboard?tab=practice')} style={{
            padding: '8px 18px', background: 'var(--surface-muted)',
            border: '1px solid var(--border-light)', borderRadius: '50px',
            cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-muted)' }}
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
        </div>

        <div style={{
          background: 'var(--sage-gradient)',
          borderRadius: '24px',
          padding: '48px',
          textAlign: 'center',
          color: 'white',
          marginBottom: '32px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-40%', right: '-10%', width: '300px', height: '300px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-30%', left: '-10%', width: '250px', height: '250px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
          }} />
          <MessageSquareText size={56} style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
            Answer Submitted!
          </h2>
          <p style={{ fontSize: '16px', opacity: 0.9, maxWidth: '500px', margin: '0 auto' }}>
            Here is your answer. Get AI feedback to see how you can improve.
          </p>
        </div>

        <div style={{
          background: 'var(--bg-overlay)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-medium), var(--inset-border)',
          border: '1px solid var(--sage)',
        }}>
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: 'var(--sage-gradient)',
            color: 'white',
            borderRadius: '50px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '14px',
          }}>
            Question
          </div>
          <p style={{ fontSize: '17px', fontWeight: 500, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: '16px' }}>
            {question}
          </p>
          <div style={{
            padding: '16px',
            background: 'var(--surface-muted)',
            borderRadius: '12px',
            fontSize: '15px',
            lineHeight: 1.7,
            color: 'var(--text-primary)',
            borderLeft: '3px solid var(--sage)',
          }}>
            {answer}
          </div>
        </div>

        {!feedbackData && !feedbackLoading && !feedbackError && (
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <button
              onClick={handleGetFeedback}
              style={{
                padding: '16px 40px',
                background: 'var(--sage-gradient)',
                color: 'white', border: 'none', borderRadius: '50px',
                fontWeight: 600, cursor: 'pointer', fontSize: '16px',
                boxShadow: '0 4px 20px rgba(107, 127, 103, 0.3)',
                transition: 'all 0.25s', display: 'inline-flex', alignItems: 'center', gap: '10px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(107, 127, 103, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(107, 127, 103, 0.3)';
              }}
            >
              <Sparkles size={20} /> Get AI Feedback
            </button>
            <p style={{ fontSize: '14px', color: 'var(--text-subtle)', marginTop: '12px' }}>
              Let our AI analyze your answer and give you personalized tips
            </p>
          </div>
        )}

        {feedbackLoading && (
          <div style={{
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            padding: '48px',
            textAlign: 'center',
            marginBottom: '32px',
            boxShadow: 'var(--shadow-medium)',
          }}>
            <div style={{
              width: '48px', height: '48px', border: '3px solid var(--olive)',
              borderTopColor: 'var(--sage)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
            }} />
            <p style={{ color: 'var(--sage)', fontSize: '15px' }}>
              Analyzing your answer...
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {feedbackError && (
          <div style={{
            background: 'var(--score-bg-wrong)',
            border: '1px solid var(--danger-color)',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '32px',
            display: 'flex', alignItems: 'center', gap: '12px',
            color: 'var(--danger-color)',
          }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: '14px' }}>{feedbackError}</span>
          </div>
        )}

        {feedbackData && (
          <div style={{ marginBottom: '32px', animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <div style={{
              background: 'var(--sage-gradient)',
              borderRadius: '24px',
              padding: '36px 40px',
              textAlign: 'center',
              color: 'white',
              marginBottom: '24px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '-30%', right: '-10%', width: '200px', height: '200px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none',
              }} />
              <Sparkles size={40} style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '14px', opacity: 0.85, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Your estimated level
              </p>
              <p style={{ fontSize: '64px', fontWeight: 800, lineHeight: 1, marginBottom: '12px', letterSpacing: '-2px' }}>
                {feedbackData.level}
              </p>
              <p style={{ fontSize: '15px', opacity: 0.9, maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
                {feedbackData.levelReason}
              </p>
            </div>

            <div style={{
              background: 'var(--card-white)',
              borderRadius: '20px',
              padding: '28px 32px',
              marginBottom: '24px',
              boxShadow: 'var(--shadow-soft)',
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--sage)' }}>
                Overall Feedback
              </h3>
              <p style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--text-primary)' }}>
                {feedbackData.overallFeedback}
              </p>
            </div>

            {feedbackData.feedback?.map((item: any, i: number) => (
              <div key={i} style={{
                background: 'var(--bg-overlay)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '20px',
                padding: '24px 28px',
                marginBottom: '16px',
                boxShadow: 'var(--shadow-medium), var(--inset-border)',
                border: '1px solid var(--border-light)',
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sage)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Strengths
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>{item.strengths}</p>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#C17A4A', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Improvements
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>{item.improvements}</p>
                </div>
                {item.example && (
                  <div style={{
                    background: 'var(--bg-cream)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    borderLeft: '3px solid var(--sage)',
                  }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-subtle)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Example
                    </p>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6, fontStyle: 'italic' }}>"{item.example}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={tryAgain}
            style={{
              padding: '14px 36px',
              background: 'var(--sage-gradient)',
              color: 'white', border: 'none', borderRadius: '50px',
              fontWeight: 600, cursor: 'pointer', fontSize: '16px',
              boxShadow: '0 4px 16px rgba(107,127,103,0.25)',
              transition: 'all 0.25s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,127,103,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,127,103,0.25)';
            }}
          >
            Try Another Question
          </button>
        </div>
      </div>
    </div>
  )
}
