import { useMemo, useState, type CSSProperties } from 'react'
import type { LifeEvent, Mood } from '../types'
import { MOODS, MOOD_LIST } from '../types'
import { useApp } from '../store/AppStore'
import { formatCN, parseISODate, weekdayCN } from '../lib/date'
import { IconMic, IconPen, IconPlus, IconSearch, IconVolume } from './Icons'

interface TimelineViewProps {
  onCreate: (date?: string) => void
  onEdit: (event: LifeEvent) => void
}

interface MonthGroup {
  key: string
  year: number
  month: number
  events: LifeEvent[]
}

interface YearGroup {
  year: number
  count: number
  months: MonthGroup[]
}

function excerpt(content: string, max = 150): string {
  const text = content.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

export function TimelineView({ onCreate, onEdit }: TimelineViewProps) {
  const { events } = useApp()
  const [query, setQuery] = useState('')
  const [moodFilter, setMoodFilter] = useState<Mood | 'all'>('all')

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return events.filter((event) => {
      if (moodFilter !== 'all' && event.mood !== moodFilter) return false
      if (!keyword) return true
      const haystack = `${event.title} ${event.content} ${event.tags.join(' ')} ${event.date}`.toLowerCase()
      return haystack.includes(keyword)
    })
  }, [events, moodFilter, query])

  const groups = useMemo<YearGroup[]>(() => {
    const years = new Map<string, Map<string, LifeEvent[]>>()
    for (const event of filtered) {
      const [year, month] = event.date.split('-')
      if (!years.has(year)) years.set(year, new Map())
      const months = years.get(year)!
      if (!months.has(month)) months.set(month, [])
      months.get(month)!.push(event)
    }
    return [...years.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, months]) => {
        const monthGroups: MonthGroup[] = [...months.entries()]
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([month, list]) => ({
            key: `${year}-${month}`,
            year: Number(year),
            month: Number(month) - 1,
            events: list,
          }))
        return {
          year: Number(year),
          count: monthGroups.reduce((sum, group) => sum + group.events.length, 0),
          months: monthGroups,
        }
      })
  }, [filtered])

  const firstDate = events.length ? [...events].sort((a, b) => a.date.localeCompare(b.date))[0].date : null
  const hasFilter = query.trim() !== '' || moodFilter !== 'all'

  return (
    <section className="view">
      <header className="page-head">
        <div>
          <p className="eyebrow">人生档案 · 时光</p>
          <h1 className="page-title">时光</h1>
          <p className="page-sub">
            {events.length === 0
              ? '把重要的时刻留在这里，日后回看，都是证据。'
              : `共 ${events.length} 条记录${firstDate ? `，从 ${formatCN(firstDate)} 开始` : ''}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => onCreate()}>
          <IconPlus size={18} /> 记录一件事
        </button>
      </header>

      {events.length > 0 && (
        <div className="filters">
          <div className="search-box">
            <IconSearch size={18} />
            <input
              className="search-input"
              value={query}
              placeholder="搜一搜：人、地点、心情…"
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button className="search-clear" onClick={() => setQuery('')} aria-label="清空搜索">
                ×
              </button>
            )}
          </div>
          <div className="filter-chips">
            <button
              className={`chip ${moodFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setMoodFilter('all')}
            >
              全部
            </button>
            {MOOD_LIST.map((mood) => (
              <button
                key={mood}
                className={`chip ${moodFilter === mood ? 'is-active' : ''}`}
                style={{ '--chip-color': MOODS[mood].color } as CSSProperties}
                onClick={() => setMoodFilter(mood)}
              >
                <span className="chip-dot" />
                {MOODS[mood].label}
              </button>
            ))}
          </div>
          {hasFilter && (
            <p className="filter-count">
              找到 {filtered.length} 条
              <button
                className="link-btn"
                onClick={() => {
                  setQuery('')
                  setMoodFilter('all')
                }}
              >
                清除筛选
              </button>
            </p>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-art" aria-hidden="true">
            <svg viewBox="0 0 160 120" fill="none">
              <rect x="22" y="24" width="116" height="76" rx="14" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
              <path d="M38 46h56M38 60h72M38 74h40" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
              <circle cx="128" cy="34" r="12" fill="currentColor" opacity="0.12" />
              <path d="M124 34h8M128 30v8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
            </svg>
          </div>
          <h2>你的时间线还空着</h2>
          <p>第一件事可以很小：一次搬家、一顿难忘的饭、一句没说完的话。</p>
          <button className="btn btn-primary" onClick={() => onCreate()}>
            <IconPen size={17} /> 写下第一件事
          </button>
          <div className="empty-tips">
            <span>
              <IconMic size={15} /> 说出的话可以自动变成文字
            </span>
            <span>
              <IconVolume size={15} /> 也可以留下当时的声音
            </span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state empty-small">
          <h2>没有找到相关记录</h2>
          <p>换个关键词，或者看看别的心情。</p>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setQuery('')
              setMoodFilter('all')
            }}
          >
            清除筛选
          </button>
        </div>
      ) : (
        <div className="timeline">
          {groups.map((yearGroup) => (
            <div className="year-group" key={yearGroup.year}>
              <div className="year-label">
                <span>{yearGroup.year}</span>
                <span className="year-count">{yearGroup.count} 条</span>
              </div>
              {yearGroup.months.map((month) => (
                <div className="month-group" key={month.key}>
                  <h2 className="month-heading">
                    {month.month + 1} 月
                    <span>{month.events.length} 条</span>
                  </h2>
                  <div className="event-list">
                    {month.events.map((event) => {
                      const mood = MOODS[event.mood]
                      return (
                        <article
                          key={event.id}
                          className="event-card"
                          style={{ '--mood-color': mood.color } as CSSProperties}
                          role="button"
                          tabIndex={0}
                          onClick={() => onEdit(event)}
                          onKeyDown={(keyboardEvent) => {
                            if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                              keyboardEvent.preventDefault()
                              onEdit(event)
                            }
                          }}
                        >
                          <div className="event-date">
                            <span className="event-day">{parseISODate(event.date).getDate()}</span>
                            <span className="event-weekday">{weekdayCN(event.date)}</span>
                          </div>
                          <div className="event-content">
                            <div className="event-title-row">
                              <h3>{event.title || '未命名记录'}</h3>
                              <span className="mood-badge">
                                <span aria-hidden="true">{mood.emoji}</span> {mood.label}
                              </span>
                            </div>
                            {event.content && <p className="event-excerpt">{excerpt(event.content)}</p>}
                            <div className="event-meta">
                              {event.tags.map((tag) => (
                                <span className="tag-mini" key={tag}>
                                  #{tag}
                                </span>
                              ))}
                              {event.audioId && (
                                <span className="meta-item">
                                  <IconVolume size={13} /> 原声
                                </span>
                              )}
                              {event.time && <span className="meta-item">{event.time}</span>}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
