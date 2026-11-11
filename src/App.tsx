import { useEffect, useState } from 'react'
import type { LifeEvent } from './types'
import { AppProvider, useApp } from './store/AppStore'
import { EventEditor } from './components/EventEditor'
import { TimelineView } from './components/TimelineView'
import { CalendarView } from './components/CalendarView'
import { ChatView } from './components/ChatView'
import { SettingsView } from './components/SettingsView'
import { ToastHost } from './components/ToastHost'
import {
  IconCalendar,
  IconChat,
  IconPlus,
  IconSettings,
  IconSparkles,
  IconTimeline,
} from './components/Icons'
import { APP_TAGLINE, APP_VERSION } from './config'

type Tab = 'timeline' | 'calendar' | 'chat' | 'settings'

const NAV: { id: Tab; label: string; icon: typeof IconTimeline }[] = [
  { id: 'timeline', label: '时光', icon: IconTimeline },
  { id: 'calendar', label: '日历', icon: IconCalendar },
  { id: 'chat', label: '倾诉', icon: IconChat },
  { id: 'settings', label: '设置', icon: IconSettings },
]

const TAB_IDS: Tab[] = ['timeline', 'calendar', 'chat', 'settings']

function readTab(): Tab {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return TAB_IDS.includes(hash as Tab) ? (hash as Tab) : 'timeline'
}

function Shell() {
  const { settings, events } = useApp()
  const [tab, setTab] = useState<Tab>(readTab)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<LifeEvent | null>(null)
  const [editorDate, setEditorDate] = useState<string | undefined>(undefined)

  useEffect(() => {
    const onHashChange = () => setTab(readTab())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = settings.theme === 'auto' ? (media.matches ? 'dark' : 'light') : settings.theme
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.colorScheme = resolved
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', resolved === 'dark' ? '#171411' : '#f7f3ec')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings.theme])

  useEffect(() => {
    document.body.dataset.tab = tab
    const titleMap: Record<Tab, string> = {
      timeline: '时光',
      calendar: '日历',
      chat: '倾诉',
      settings: '设置',
    }
    document.title = `${titleMap[tab]} · 人生倾诉器`
    window.scrollTo({ top: 0 })
  }, [tab])

  const navigate = (next: Tab) => {
    setTab(next)
    if (window.location.hash !== `#/${next}`) window.location.hash = `/${next}`
  }

  const openCreate = (date?: string) => {
    setEditing(null)
    setEditorDate(date)
    setEditorOpen(true)
  }

  const openEdit = (event: LifeEvent) => {
    setEditing(event)
    setEditorDate(undefined)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
  }

  const earliestYear = events.length
    ? [...events].sort((a, b) => a.date.localeCompare(b.date))[0].date.slice(0, 4)
    : null

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-mark" src="./favicon.svg" alt="" width={42} height={42} />
          <div className="brand-text">
            <strong>人生倾诉器</strong>
            <span>{APP_TAGLINE}</span>
          </div>
        </div>

        <nav className="nav" aria-label="主导航">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`nav-item ${tab === item.id ? 'is-active' : ''}`}
                onClick={() => navigate(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.id === 'chat' && events.length > 0 && <span className="nav-badge">{events.length}</span>}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-card">
          <IconSparkles size={18} />
          <p>{earliestYear ? `从 ${earliestYear} 年到现在，你留下了` : '把今天留下来，从第一件事开始'}</p>
          <strong>{earliestYear ? `${events.length} 件事` : '第一件事'}</strong>
          <button className="btn btn-primary btn-small" onClick={() => openCreate()}>
            <IconPlus size={16} /> 记录今天
          </button>
        </div>

        <div className="sidebar-foot">
          <span>数据只存在这台设备</span>
          <span>v{APP_VERSION}</span>
        </div>
      </aside>

      <main className="main">
        <header className="mobile-top">
          <div className="mobile-brand">
            <img src="./favicon.svg" alt="" width={30} height={30} />
            <strong>人生倾诉器</strong>
          </div>
          <button className="btn btn-primary btn-small" onClick={() => openCreate()}>
            <IconPlus size={16} /> 记录
          </button>
        </header>

        {tab === 'timeline' && <TimelineView onCreate={openCreate} onEdit={openEdit} />}
        {tab === 'calendar' && <CalendarView onCreate={openCreate} onEdit={openEdit} />}
        {tab === 'chat' && <ChatView onNavigate={navigate} />}
        {tab === 'settings' && <SettingsView />}
      </main>

      <nav className="bottom-nav" aria-label="主导航">
        {NAV.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={`bottom-item ${tab === item.id ? 'is-active' : ''}`}
              onClick={() => navigate(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <button className="fab" onClick={() => openCreate()} aria-label="记录一件事">
        <IconPlus size={22} />
      </button>

      {editorOpen && <EventEditor initial={editing} defaultDate={editorDate} onClose={closeEditor} />}
      <ToastHost />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
