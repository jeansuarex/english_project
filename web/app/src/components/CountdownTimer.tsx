interface CountdownTimerProps {
  timeLeft: number
  totalTime: number
}

const CIRCUMFERENCE = 2 * Math.PI * 48

export default function CountdownTimer({ timeLeft, totalTime }: CountdownTimerProps) {
  const progress = timeLeft / totalTime
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const timerColor = timeLeft > 8 ? 'var(--sage)' : timeLeft > 4 ? 'var(--danger-color)' : 'var(--error-color)'

  return (
    <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 36px' }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <defs>
          <linearGradient id="timerGradientDef" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={timerColor} />
            <stop offset="100%" stopColor={timerColor} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={48} fill="none" strokeWidth="5" style={{ stroke: 'var(--timer-track)' }} />
        <circle
          cx="70" cy="70" r={48}
          fill="none"
          stroke={timeLeft <= 2 ? timerColor : "url(#timerGradientDef)"}
          strokeWidth="5"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '38px', fontWeight: 700, color: timerColor,
        fontVariantNumeric: 'tabular-nums',
        animation: timeLeft <= 2 ? 'countdown-pulse 0.5s ease-in-out infinite' : undefined,
      }}>
        {timeLeft}
      </div>
      <style>{`@keyframes countdown-pulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.15); } }`}</style>
    </div>
  )
}
