import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { BookOpen, Headphones, PenTool, MessageSquare, Clock, ArrowRight, CheckCircle } from 'lucide-react'
import ExamTimeline from '../components/ExamTimeline'

const SECTION_ORDER = ['reading', 'listening', 'writing', 'speaking'] as const
type SectionId = typeof SECTION_ORDER[number]

const SECTION_CONFIG: Record<SectionId, {
  icon: typeof BookOpen
  gradient: string
  title: string
  desc: string
  duration: string
}> = {
  reading: {
    icon: BookOpen,
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    title: 'IELTS Reading',
    desc: 'Textos cortos con preguntas de comprensión. True/False/Not Given, opción múltiple y más.',
    duration: '10 minutes',
  },
  listening: {
    icon: Headphones,
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    title: 'IELTS Listening',
    desc: 'Escucha audios y completa las respuestas. Vocabulario y comprensión auditiva.',
    duration: '10 minutes',
  },
  writing: {
    icon: PenTool,
    gradient: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
    title: 'IELTS Writing',
    desc: 'Practica escritura académica. Estructura, gramática y coherencia.',
    duration: '10 minutes',
  },
  speaking: {
    icon: MessageSquare,
    gradient: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
    title: 'IELTS Speaking',
    desc: 'Responde preguntas de expresión oral. Practica fluidez y pronunciación.',
    duration: '10 minutes',
  },
}

export default function Exam() {
  const navigate = useNavigate()
  const location = useLocation()
  const { getToken } = useAuth()
  const [completedSections, setCompletedSections] = useState<Set<SectionId>>(new Set())
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const lastPathnameRef = useRef<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('No auth token')
      }
      const res = await fetch('/api/exam/history', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text}`)
      }
      const data = await res.json()
      const completed = new Set<SectionId>()
      if (Array.isArray(data)) {
        data.forEach((session: any) => {
          if (session.reading?.submitted) completed.add('reading')
          if (session.listening?.submitted) completed.add('listening')
          if (session.writing?.submitted) completed.add('writing')
          if (session.speaking?.submitted) completed.add('speaking')
        })
      }
      setCompletedSections(completed)
    } catch (err) {
      console.error('Failed to fetch history:', err)
      setFetchError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    if (lastPathnameRef.current !== location.pathname) {
      lastPathnameRef.current = location.pathname
      fetchHistory()
    }
  }, [location.pathname, fetchHistory])

  const getCurrentSection = (): SectionId | null => {
    for (const id of SECTION_ORDER) {
      if (!completedSections.has(id)) return id
    }
    return null
  }

  const getNextSection = (): SectionId | null => {
    for (const id of SECTION_ORDER) {
      if (!completedSections.has(id)) return id
    }
    return null
  }

  const handleStart = async (sectionId: SectionId) => {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/exam/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ section: sectionId }),
      })
      if (res.ok) {
        navigate(`/exam-${sectionId}`)
      }
    } catch (err) {
      console.error('Failed to start section:', err)
    } finally {
      setLoading(false)
    }
  }

  const currentSection = getCurrentSection()
  const allCompleted = currentSection === null

  const getTimelineSections = () => {
    return SECTION_ORDER.map((id, index) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      status: completedSections.has(id) ? 'completed' as const : (id === currentSection ? 'active' as const : 'pending' as const),
    }))
  }

  const timelineSections = getTimelineSections()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
      padding: '48px 24px',
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '36px',
            fontFamily: 'var(--font-heading)',
            color: 'var(--sage)',
            marginBottom: '12px',
          }}>
            IELTS Practice Exam
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--text-subtle)' }}>
            Complete each section in order · 10 minutes each
          </p>
        </div>

        <div style={{
          background: 'var(--card-white)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: 'var(--shadow-soft)',
        }}>
          <ExamTimeline sections={timelineSections} />
        </div>

        {loading && (
          <div style={{
            background: 'var(--card-white)',
            borderRadius: '20px',
            padding: '48px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-soft)',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid var(--olive)',
              borderTopColor: 'var(--sage)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ color: 'var(--text-subtle)' }}>Loading...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {fetchError && !loading && (
          <div style={{
            background: 'var(--card-white)',
            borderRadius: '20px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-soft)',
            marginBottom: '24px',
          }}>
            <p style={{ color: 'var(--danger-color)', marginBottom: '16px' }}>
              Error: {fetchError}
            </p>
            <button
              onClick={fetchHistory}
              style={{
                padding: '12px 24px',
                background: 'var(--sage-gradient)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !fetchError && allCompleted ? (
          <div style={{
            background: 'var(--sage-gradient)',
            borderRadius: '24px',
            padding: '56px 48px',
            textAlign: 'center',
            color: 'white',
            boxShadow: 'var(--hero-shadow)',
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
              Exam Complete!
            </h2>
            <p style={{ fontSize: '16px', opacity: 0.9 }}>
              You've completed all four sections. Great job!
            </p>
          </div>
        ) : currentSection && (
          <div
            onClick={() => !loading && handleStart(currentSection)}
            style={{
              background: 'var(--card-white)',
              borderRadius: '20px',
              padding: '40px',
              boxShadow: 'var(--shadow-soft)',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s ease',
              border: '2px solid var(--sage)',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-soft)'
            }}
          >
            {(() => {
              const config = SECTION_CONFIG[currentSection]
              const Icon = config.icon
              const sectionIndex = SECTION_ORDER.indexOf(currentSection) + 1
              return (
                <>
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
                    Section {sectionIndex} of 4
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    marginBottom: '20px',
                  }}>
                    <div style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '16px',
                      background: 'var(--surface-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-light)',
                    }}>
                      <Icon size={28} color="var(--sage)" />
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        marginBottom: '4px',
                        color: 'var(--text-primary)',
                      }}>
                        {config.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={14} color="var(--text-subtle)" />
                        <span style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>
                          {config.duration}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p style={{
                    fontSize: '15px',
                    color: 'var(--text-subtle)',
                    lineHeight: 1.6,
                    marginBottom: '24px',
                  }}>
                    {config.desc}
                  </p>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '14px 28px',
                    background: 'var(--sage-gradient)',
                    color: 'white',
                    borderRadius: '50px',
                    fontWeight: 600,
                    fontSize: '15px',
                    width: 'fit-content',
                    margin: '0 auto',
                    boxShadow: '0 4px 16px rgba(107, 127, 103, 0.3)',
                  }}>
                    Start Section
                    <ArrowRight size={18} />
                  </div>
                </>
              )
            })()}
          </div>
        )}

        <div style={{
          marginTop: '32px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>
            Complete sections in order: Reading → Listening → Writing → Speaking
          </p>
        </div>
      </div>
    </div>
  )
}
