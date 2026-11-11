import { useMemo, useState } from 'react'
import type { LifeEvent } from '../types'
import { MOODS } from '../types'
import { useApp } from '../store/AppStore'
import { computeStats } from '../lib/context'
import {
  formatCN,
  formatMonthLabel,
  formatShort,
  monthGrid,
  parseISODate,
  relativeDay,
  shiftMonth,
  todayISO,
  weekdayCN,
  WEEKDAY_SHORT,
} from '../lib/date'
import { IconChevronLeft, IconChevronRight, IconPlus, IconVolume } from './Icons'

interface CalendarViewProps {
  onCreate: (date?: string) => void
  onEdit: (event: LifeEvent) => void
}

export function CalendarView({ onCreate, onEdit }: CalendarViewProps) {
  const { events } = useApp()
  const today = todayISO()
  const initial = parseISODate(today)
  const [cursor, setCursor] = useState({ year: initial.getFullYear(), month: initial.getMonth() })
  const [selected, setSelected] = useState(today)

  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])

  const byDate = useMemo(() => {
    const map = new Map<string, LifeEvent[]>()
    for (const event of events) {
      if (!map.has(event.date)) map.set(event.date, [])
      map.get(event.date)!.push(event)
    }
    return map
  }, [events])

  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`
  const monthEvents = useMemo(() => events.filter((event) => event.date.startsWith(monthPrefix)), [events, monthPrefix])
  const monthStats = useMemo(() => computeStats(monthEvents), [monthEvents])
  const selectedEvents = byDate.get(selected) ?? []

  const goMonth = (delta: number) => {
    const next = shiftMonth(cursor.year, cursor.month, delta)
    setCursor(next)
    setSelected(`${next.year}-${String(next.month + 1).padStart(2, '0')}-01`)
  }

  const goToday = () => {
    setCursor({ year: initial.getFullYear(), month: initial.getMonth() })
    setSelected(today)
  }

  return (
    <section className="view">
      <header className="page-head">
        <div>
          <p className="eyebrow">人生档案 · 日历</p>
          <h1 className="page-title">日历</h1>
          <p className="page-sub">把日子摊开看，你会发现自己的节奏。</p>
        </div>
        <button className="btn btn-primary" onClick={() => onCreate(selected)}>
          <IconPlus size={18} /> 记录一件事
        </button>
      </header>

      <div className="calendar-layout">
        <div className="calendar-card card">
          <div className="calendar-top">
            <div>
              <h2 className="calendar-month">{formatMonthLabel(cursor.year, cursor.month)}</h2>
              <p className="calendar-sub">
                {monthEvents.length > 0
                  ? `记录了 ${monthEvents.length} 件事 · 心情均值 ${monthStats.avgMood ?? '—'}`
                  : '这个月还没有留下记录'}
              </p>
            </div>
            <div className="calendar-nav">
              <button className="icon-btn" onClick={() => goMonth(-1)} aria-label="上个月">
                <IconChevronLeft size={18} />
              </button>
              <button className="btn btn-small btn-ghost" onClick={goToday}>
                今天
              </button>
              <button className="icon-btn" onClick={() => goMonth(1)} aria-label="下个月">
                <IconChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="weekday-row">
            {WEEKDAY_SHORT.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {grid.map((week) =>
              week.map((cell) => {
                const dayEvents = byDate.get(cell.iso) ?? []
                const isSelected = selected === cell.iso
                return (
                  <button
                    key={cell.iso}
                    className={`day-cell ${cell.inMonth ? '' : 'is-out'} ${cell.isToday ? 'is-today' : ''} ${
                      isSelected ? 'is-selected' : ''
                    } ${cell.isWeekend ? 'is-weekend' : ''} ${dayEvents.length ? 'has-events' : ''}`}
                    onClick={() => setSelected(cell.iso)}
                    onDoubleClick={() => onCreate(cell.iso)}
                    aria-label={`${formatCN(cell.iso)}${dayEvents.length ? `，${dayEvents.length} 条记录` : ''}`}
                    aria-pressed={isSelected}
                  >
                    <span className="day-number">{cell.day}</span>
                    <span className="day-marker">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className="day-dot"
                          style={{ background: MOODS[event.mood].color }}
                        />
                      ))}
                      {dayEvents.length > 3 && <span className="day-more">+{dayEvents.length - 3}</span>}
                    </span>
                  </button>
                )
              }),
            )}
          </div>

          <div className="calendar-legend">
            {Object.entries(MOODS).map(([value, mood]) => (
              <span key={value}>
                <span className="legend-dot" style={{ background: mood.color }} />
                {mood.label}
              </span>
            ))}
          </div>
        </div>

        <aside className="day-panel card">
          <div className="day-panel-head">
            <p className="eyebrow">
              {relativeDay(selected)} · {weekdayCN(selected)}
            </p>
            <h2>{formatCN(selected)}</h2>
          </div>

          <button className="btn btn-soft btn-block" onClick={() => onCreate(selected)}>
            <IconPlus size={17} /> 在这天记录
          </button>

          <div className="day-events">
            {selectedEvents.length === 0 ? (
              <div className="day-empty">
                <p>这一天还没有记录。</p>
                <span>不一定是大事，当时的心情也算。</span>
              </div>
            ) : (
              selectedEvents.map((event) => (
                <button className="day-event" key={event.id} onClick={() => onEdit(event)}>
                  <span className="day-event-dot" style={{ background: MOODS[event.mood].color }} />
                  <span className="day-event-body">
                    <strong>{event.title || '未命名记录'}</strong>
                    <small>
                      {MOODS[event.mood].label}
                      {event.time ? ` · ${event.time}` : ''}
                      {event.audioId ? ' · 有原声' : ''}
                    </small>
                  </span>
                  <IconChevronRight size={16} />
                </button>
              ))
            )}
          </div>

          <div className="month-summary">
            <div>
              <span className="summary-label">本月记录</span>
              <strong>{monthEvents.length} 条</strong>
            </div>
            <div>
              <span className="summary-label">心情均值</span>
              <strong>{monthStats.avgMood ?? '—'}</strong>
            </div>
            <div>
              <span className="summary-label">最近一次</span>
              <strong>{monthStats.lastDate ? formatShort(monthStats.lastDate) : '—'}</strong>
            </div>
          </div>

          {monthEvents.length > 0 && (
            <div className="month-recent">
              <p className="summary-label">这个月</p>
              {monthEvents.slice(0, 3).map((event) => (
                <button key={event.id} className="mini-event" onClick={() => onEdit(event)}>
                  <span className="mini-date">{parseISODate(event.date).getDate()}日</span>
                  <span className="mini-title">{event.title || '未命名记录'}</span>
                  {event.audioId && <IconVolume size={13} />}
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
