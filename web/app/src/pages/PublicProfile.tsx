import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

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

interface ProfileData {
  name: string
  email?: string
  createdAt: string
  badges: BadgeData[]
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getTier(current: number, bronze: number, silver: number, gold: number): { label: string; color: string; tier: 'bronze' | 'silver' | 'gold' | 'locked'; letter: string; nextTier: number } {
  if (current >= gold) return { label: 'Gold', color: '#FFD700', tier: 'gold', letter: 'A', nextTier: gold }
  if (current >= silver) return { label: 'Silver', color: '#C0C0C0', tier: 'silver', letter: 'B', nextTier: gold }
  if (current >= bronze) return { label: 'Bronze', color: '#CD7F32', tier: 'bronze', letter: 'C', nextTier: silver }
  return { label: 'Locked', color: '#6B7F67', tier: 'locked', letter: '?', nextTier: bronze }
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`${API_URL}/api/profile/${username}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('User not found')
          } else {
            setError('Failed to load profile')
          }
          return
        }
        const data = await res.json()
        setProfile(data)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    if (username) {
      fetchProfile()
    }
  }, [username])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-cream)',
        gap: '16px'
      }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--sage)' }} />
        <p style={{ color: 'var(--text-subtle)', fontSize: '14px' }}>Loading profile...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-cream)',
        gap: '16px'
      }}>
        <h1 style={{ fontSize: '48px', fontWeight: 600, color: 'var(--text-subtle)' }}>404</h1>
        <p style={{ color: 'var(--text-subtle)', fontSize: '16px' }}>{error || 'Profile not found'}</p>
        <a
          href="/"
          style={{
            marginTop: '8px',
            color: 'var(--sage)',
            textDecoration: 'underline',
            fontSize: '14px'
          }}
        >
          Go back home
        </a>
      </div>
    )
  }

  const unlockedBadges = profile.badges.filter(b => b.current >= b.bronze)
  const lockedBadges = profile.badges.filter(b => b.current < b.bronze)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-cream)',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <div style={{
          background: 'var(--card-white)',
          borderRadius: 'var(--radius-md)',
          padding: '32px',
          boxShadow: 'var(--shadow-soft)',
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '16px',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--surface-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 600,
              color: 'var(--sage)',
            }}>
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '4px',
                fontFamily: 'var(--font-heading)'
              }}>
                {profile.name}
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>
                Member since {formatDate(profile.createdAt)}
              </p>
            </div>
            <div style={{
              display: 'flex',
              gap: '24px',
              marginTop: '8px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--sage)' }}>{unlockedBadges.length}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Badges Earned</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--sage)' }}>{lockedBadges.length}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Badges Locked</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--card-white)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-soft)',
          marginBottom: '24px',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '20px',
          }}>
            Achievements
          </h2>
          {unlockedBadges.length === 0 ? (
            <p style={{ color: 'var(--text-subtle)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
              No achievements yet. Keep learning to unlock badges!
            </p>
          ) : (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              justifyContent: 'flex-start',
            }}>
              {unlockedBadges.map(badge => {
                const tier = getTier(badge.current, badge.bronze, badge.silver, badge.gold)
                return (
                  <div key={badge.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '80px',
                  }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      border: `4px solid ${tier.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 700,
                      color: tier.color,
                      background: 'transparent',
                    }}>
                      {tier.letter}
                    </div>
                    <span style={{
                      fontSize: '12px',
                      color: 'var(--text-subtle)',
                      textAlign: 'center',
                      maxWidth: '80px',
                    }}>
                      {badge.name}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{
          background: 'var(--card-white)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-soft)',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '20px',
          }}>
            All Badges
          </h2>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {profile.badges.map(badge => {
              const tier = getTier(badge.current, badge.bronze, badge.silver, badge.gold)
              const progress = tier.tier === 'locked'
                ? (badge.current / badge.bronze)
                : tier.tier === 'bronze'
                  ? (badge.current - badge.bronze) / (badge.silver - badge.bronze)
                  : tier.tier === 'silver'
                    ? (badge.current - badge.silver) / (badge.gold - badge.silver)
                    : 1

              return (
                <div key={badge.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px',
                  background: tier.tier === 'locked' ? 'var(--surface-muted)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  opacity: tier.tier === 'locked' ? 0.6 : 1,
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: `3px solid ${tier.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: tier.color,
                    flexShrink: 0,
                  }}>
                    {tier.letter}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {badge.name}
                      </p>
                      <span style={{
                        color: tier.color,
                        fontWeight: 700,
                        fontSize: '11px',
                        textTransform: 'uppercase'
                      }}>
                        {tier.label}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginBottom: '6px' }}>
                      {badge.desc}
                    </p>
                    <div style={{
                      height: '4px',
                      background: 'var(--bg-cream)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        borderRadius: '2px',
                        width: `${Math.min(100, progress * 100)}%`,
                        background: tier.color,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <p style={{
                      fontSize: '10px',
                      color: 'var(--text-subtle)',
                      marginTop: '4px',
                      textAlign: 'right'
                    }}>
                      {badge.current} / {tier.nextTier} words
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}