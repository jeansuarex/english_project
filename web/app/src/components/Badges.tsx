interface BadgeData {
  id: string
  name: string
  icon: string
  desc: string
  current: number
  bronze: number
  silver: number
  gold: number
}

interface BadgesProps {
  badges: BadgeData[]
}

function getTier(current: number, bronze: number, silver: number, gold: number): { label: string; color: string; progress: number } {
  if (current >= gold) return { label: 'Gold', color: '#F59E0B', progress: 1 }
  if (current >= silver) return { label: 'Silver', color: '#9CA3AF', progress: 0.66 }
  if (current >= bronze) return { label: 'Bronze', color: '#B45309', progress: 0.33 }
  return { label: 'Locked', color: 'var(--text-subtle)', progress: current / bronze }
}

function BadgeCard({ badge, muted }: { badge: BadgeData; muted: boolean }) {
  const tier = getTier(badge.current, badge.bronze, badge.silver, badge.gold)
  return (
    <div
      style={{
        background: muted ? 'var(--surface-muted)' : 'var(--card-white)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        boxShadow: muted ? 'none' : 'var(--shadow-soft)',
        border: `1px solid ${muted ? 'var(--border-subtle)' : 'var(--border-light)'}`,
        opacity: muted ? 0.6 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span style={{ fontSize: '28px' }}>{badge.icon}</span>
        <div>
          <p style={{ fontWeight: 600, fontSize: '15px' }}>{badge.name}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{badge.desc}</p>
        </div>
      </div>

      <div style={{
        height: '8px', background: 'var(--bg-cream)',
        borderRadius: '4px', overflow: 'hidden', marginBottom: '8px',
      }}>
        <div style={{
          height: '100%', borderRadius: '4px',
          width: `${Math.min(100, tier.progress * 100)}%`,
          background: tier.color,
          transition: 'width 0.4s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <span style={{ color: muted ? 'var(--text-subtle)' : 'var(--text-primary)' }}>
          {badge.current} / {badge.bronze}
        </span>
        <span style={{ color: tier.color, fontWeight: 600 }}>{tier.label}</span>
      </div>
    </div>
  )
}

export default function Badges({ badges }: BadgesProps) {
  const unlocked = badges.filter(b => b.current >= b.bronze)
  const locked = badges.filter(b => b.current < b.bronze)

  return (
    <div>
      {unlocked.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--sage)' }}>
            Unlocked
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {unlocked.map(badge => <BadgeCard key={badge.id} badge={badge} muted={false} />)}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-subtle)' }}>
            To Unlock
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {locked.map(badge => <BadgeCard key={badge.id} badge={badge} muted={true} />)}
          </div>
        </div>
      )}
    </div>
  )
}
