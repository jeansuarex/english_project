import { Check } from 'lucide-react'

export type SectionStatus = 'completed' | 'active' | 'pending'

export interface ExamSection {
  id: string
  name: string
  status: SectionStatus
  timeLeft?: number
}

interface ExamTimelineProps {
  sections: ExamSection[]
}

export default function ExamTimeline({ sections }: ExamTimelineProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 0',
      gap: '0',
    }}>
      {sections.map((section, i) => {
        const isLast = i === sections.length - 1
        const isCompleted = section.status === 'completed'
        const isActive = section.status === 'active'
        const isPending = section.status === 'pending'

        return (
          <div key={section.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isActive ? '3px solid var(--sage)' : '2px solid var(--border-light)',
                  background: isCompleted
                    ? 'var(--sage-gradient)'
                    : isActive
                      ? 'var(--card-white)'
                      : 'var(--surface-muted)',
                  color: isCompleted || isActive ? 'white' : 'var(--text-subtle)',
                  transition: 'all 0.3s ease',
                  boxShadow: isActive
                    ? '0 0 0 4px rgba(107, 127, 103, 0.2), var(--shadow-soft)'
                    : isCompleted
                      ? 'var(--shadow-soft)'
                      : 'none',
                  animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none',
                }}
              >
                {isCompleted ? (
                  <Check size={22} strokeWidth={3} />
                ) : (
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>
                    {i + 1}
                  </span>
                )}
              </div>

              <div style={{
                marginTop: '10px',
                textAlign: 'center',
                maxWidth: '80px',
              }}>
                <p style={{
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive
                    ? 'var(--sage)'
                    : isCompleted
                      ? 'var(--text-primary)'
                      : 'var(--text-subtle)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {section.name}
                </p>
                {section.timeLeft !== undefined && isActive && (
                  <p style={{ fontSize: '10px', color: 'var(--text-subtle)', marginTop: '2px' }}>
                    {section.timeLeft}m left
                  </p>
                )}
                {isCompleted && (
                  <p style={{ fontSize: '10px', color: 'var(--sage)', marginTop: '2px' }}>
                    Done
                  </p>
                )}
              </div>
            </div>

            {!isLast && (
              <div style={{
                width: '60px',
                height: '2px',
                background: isCompleted
                  ? 'var(--sage-gradient)'
                  : 'var(--border-light)',
                margin: '0 4px',
                marginBottom: '28px',
                transition: 'background 0.3s ease',
              }} />
            )}
          </div>
        )
      })}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(107, 127, 103, 0.2), var(--shadow-soft);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(107, 127, 103, 0.15), var(--shadow-soft);
          }
        }
      `}</style>
    </div>
  )
}
