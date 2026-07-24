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

function getTier(current: number, bronze: number, silver: number, gold: number): { label: string; color: string; progress: number; tier: 'bronze' | 'silver' | 'gold' | 'locked'; letter: string; nextTier: number } {
  if (current >= gold) return { label: 'Gold', color: '#FFD700', progress: 1, tier: 'gold', letter: 'A', nextTier: gold }
  if (current >= silver) return { label: 'Silver', color: '#C0C0C0', progress: (current - silver) / (gold - silver), tier: 'silver', letter: 'B', nextTier: gold }
  if (current >= bronze) return { label: 'Bronze', color: '#CD7F32', progress: (current - bronze) / (silver - bronze), tier: 'bronze', letter: 'C', nextTier: silver }
  return { label: 'Locked', color: 'var(--text-subtle)', progress: current / bronze, tier: 'locked', letter: '?', nextTier: bronze }
}

function BadgeCard({ badge, muted }: { badge: BadgeData; muted: boolean }) {
  const tier = getTier(badge.current, badge.bronze, badge.silver, badge.gold)
  const unit = badge.unit || 'items'

  return (
    <div
      style={{
        background: muted ? 'var(--surface-muted)' : 'var(--card-white)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        boxShadow: muted ? 'none' : 'var(--shadow-soft)',
        border: `1px solid ${muted ? 'var(--border-subtle)' : 'var(--border-light)'}`,
        opacity: muted ? 0.7 : 1,
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          border: `4px solid ${tier.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          fontWeight: 700,
          color: tier.color,
          flexShrink: 0,
          background: muted ? 'var(--surface-muted)' : 'transparent',
        }}
      >
        {tier.letter}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <p style={{ fontWeight: 600, fontSize: '14px' }}>{badge.name}</p>
          <span style={{ color: tier.color, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>{tier.label}</span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginBottom: '8px' }}>{badge.desc}</p>
        <div style={{
          height: '6px', background: 'var(--bg-cream)',
          borderRadius: '3px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            width: `${Math.min(100, tier.progress * 100)}%`,
            background: tier.color,
            transition: 'width 0.4s ease',
          }} />
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text-subtle)', marginTop: '4px', textAlign: 'right' }}>
          {badge.current} / {tier.nextTier} {unit}
        </p>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {unlocked.map(badge => <BadgeCard key={badge.id} badge={badge} muted={false} />)}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-subtle)' }}>
            To Unlock
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {locked.map(badge => <BadgeCard key={badge.id} badge={badge} muted={true} />)}
          </div>
        </div>
      )}
    </div>
  )
}
