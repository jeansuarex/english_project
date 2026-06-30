interface ActivityDay {
  date: string
  count: number
}

interface ActivityGridProps {
  data: ActivityDay[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function MonthCalendar({ year, month, data, isCurrent }: { year: number; month: number; data: ActivityDay[]; isCurrent: boolean }) {
  const totalDays = daysInMonth(year, month)
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const todayStr = new Date().toISOString().slice(0, 10)
  const activeDates = new Set(data.map(d => d.date))

  const cells: { day: number; active: boolean; isToday: boolean }[] = []
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ day: 0, active: false, isToday: false })
  }
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, active: activeDates.has(dateStr), isToday: dateStr === todayStr })
  }

  const name = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div style={{ minWidth: '200px' }}>
      <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>{name}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {DAYS.map(d => (
          <div key={d} style={{ fontSize: '10px', color: 'var(--text-subtle)', textAlign: 'center', padding: '2px 0' }}>{d}</div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px',
              borderRadius: '50%',
              background: cell.active ? 'var(--activity-active)' : 'transparent',
              color: cell.active ? '#fff' : cell.day === 0 ? 'transparent' : 'var(--text-primary)',
              fontWeight: cell.isToday ? 700 : 400,
              outline: cell.isToday ? '2px solid var(--sage)' : 'none',
              outlineOffset: '1px',
            }}
            title={cell.day ? `${name} ${cell.day}${cell.active ? ' — active' : ''}` : ''}
          >
            {cell.day || ''}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ActivityGrid({ data }: ActivityGridProps) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const months = [
    { year: month === 0 ? year - 1 : year, month: month === 0 ? 11 : month - 1, isCurrent: false },
    { year, month, isCurrent: true },
    { year: month === 11 ? year + 1 : year, month: month === 11 ? 0 : month + 1, isCurrent: false },
  ]

  return (
    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
      {months.map((m, i) => (
        <MonthCalendar key={i} year={m.year} month={m.month} data={data} isCurrent={m.isCurrent} />
      ))}
    </div>
  )
}
