import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ChatMessage, LifeEvent, Mood, Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { clearRecordings, deleteRecording, loadRecording, saveRecording } from '../lib/audio'
import { todayISO } from '../lib/date'
import { newId } from '../lib/id'
import { buildBackup, normalizeChat, normalizeEvents, normalizeSettings, sortEvents } from '../lib/model'
import { STORAGE_KEYS, loadJSON, removeJSON, saveJSON } from '../lib/storage'

export interface EventInput {
  title: string
  content: string
  date: string
  time: string
  mood: Mood
  tags: string[]
  audioId?: string
  audioDuration?: number
}

export interface ToastItem {
  id: string
  message: string
  tone: 'info' | 'success' | 'error'
}

export interface ImportResult {
  added: number
  skipped: number
}

interface AppContextValue {
  events: LifeEvent[]
  settings: Settings
  chat: ChatMessage[]
  toasts: ToastItem[]
  addEvent: (input: EventInput) => LifeEvent
  updateEvent: (id: string, input: EventInput) => LifeEvent | null
  deleteEvent: (id: string) => Promise<void>
  attachAudio: (eventId: string, blob: Blob, duration: number) => Promise<boolean>
  detachAudio: (eventId: string) => Promise<void>
  getAudio: (audioId: string) => Promise<Blob | null>
  updateSettings: (patch: Partial<Settings>) => void
  appendChat: (message: ChatMessage) => void
  patchChat: (id: string, patch: Partial<ChatMessage>) => void
  clearChat: () => void
  notify: (message: string, tone?: ToastItem['tone']) => void
  dismissToast: (id: string) => void
  exportData: () => void
  importData: (raw: string, mode: 'merge' | 'replace') => ImportResult
  clearAll: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

function loadInitialEvents(): LifeEvent[] {
  return sortEvents(normalizeEvents(loadJSON<unknown>(STORAGE_KEYS.events, [])))
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<LifeEvent[]>(loadInitialEvents)
  const [settings, setSettings] = useState<Settings>(() =>
    normalizeSettings(loadJSON<unknown>(STORAGE_KEYS.settings, DEFAULT_SETTINGS)),
  )
  const [chat, setChat] = useState<ChatMessage[]>(() => normalizeChat(loadJSON<unknown>(STORAGE_KEYS.chat, [])))
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const warnedStorageRef = useRef(false)

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: ToastItem['tone'] = 'info') => {
      const id = newId('toast_')
      setToasts((prev) => [...prev.slice(-2), { id, message, tone }])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
      }, tone === 'error' ? 4200 : 2600)
    },
    [],
  )

  useEffect(() => {
    if (!saveJSON(STORAGE_KEYS.events, events) && !warnedStorageRef.current) {
      warnedStorageRef.current = true
      notify('浏览器存储写入失败，可能是空间已满或处于无痕模式。记录可能丢失。', 'error')
    }
  }, [events, notify])

  useEffect(() => {
    saveJSON(STORAGE_KEYS.settings, settings)
  }, [settings])

  useEffect(() => {
    saveJSON(STORAGE_KEYS.chat, chat)
  }, [chat])

  const addEvent = useCallback((input: EventInput): LifeEvent => {
    const now = Date.now()
    const event: LifeEvent = {
      ...input,
      title: input.title.trim(),
      content: input.content.trim(),
      id: newId('evt_'),
      createdAt: now,
      updatedAt: now,
    }
    setEvents((prev) => sortEvents([...prev, event]))
    return event
  }, [])

  const updateEvent = useCallback(
    (id: string, input: EventInput): LifeEvent | null => {
      const existing = events.find((event) => event.id === id)
      if (!existing) return null
      const updated: LifeEvent = {
        ...existing,
        ...input,
        title: input.title.trim(),
        content: input.content.trim(),
        updatedAt: Date.now(),
      }
      setEvents((prev) => sortEvents(prev.map((event) => (event.id === id ? updated : event))))
      return updated
    },
    [events],
  )

  const deleteEvent = useCallback(
    async (id: string) => {
      const target = events.find((event) => event.id === id)
      setEvents((prev) => prev.filter((event) => event.id !== id))
      if (target?.audioId) await deleteRecording(target.audioId)
    },
    [events],
  )

  const attachAudio = useCallback(
    async (eventId: string, blob: Blob, duration: number): Promise<boolean> => {
      const audioId = newId('aud_')
      try {
        await saveRecording(audioId, blob)
      } catch {
        notify('录音保存失败，文字内容不受影响。', 'error')
        return false
      }
      setEvents((prev) =>
        sortEvents(
          prev.map((event) =>
            event.id === eventId
              ? { ...event, audioId, audioDuration: duration, updatedAt: Date.now() }
              : event,
          ),
        ),
      )
      return true
    },
    [notify],
  )

  const getAudio = useCallback((audioId: string) => loadRecording(audioId), [])

  const detachAudio = useCallback(async (eventId: string) => {
    const target = events.find((event) => event.id === eventId)
    if (target?.audioId) await deleteRecording(target.audioId)
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, audioId: undefined, audioDuration: undefined, updatedAt: Date.now() } : event,
      ),
    )
  }, [events])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => normalizeSettings({ ...prev, ...patch }))
  }, [])

  const appendChat = useCallback((message: ChatMessage) => {
    setChat((prev) => [...prev, message].slice(-200))
  }, [])

  const patchChat = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setChat((prev) => prev.map((message) => (message.id === id ? { ...message, ...patch } : message)))
  }, [])

  const clearChat = useCallback(() => setChat([]), [])

  const exportData = useCallback(() => {
    const backup = buildBackup(events, settings)
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `人生倾诉器-备份-${todayISO()}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    notify(`已导出 ${events.length} 条记录（不含 API Key）`, 'success')
  }, [events, notify, settings])

  const importData = useCallback(
    (raw: string, mode: 'merge' | 'replace'): ImportResult => {
      let payload: unknown
      try {
        payload = JSON.parse(raw)
      } catch {
        throw new Error('这不是有效的 JSON 文件')
      }
      const record = payload as Record<string, unknown>
      const rawEvents = Array.isArray(payload) ? payload : record.events
      if (!Array.isArray(rawEvents)) throw new Error('文件里没有找到 events 列表')
      const incoming = normalizeEvents(rawEvents)
      if (incoming.length === 0) throw new Error('文件里没有可用的记录')

      const existingIds = new Set(mode === 'replace' ? [] : events.map((event) => event.id))
      const merged = mode === 'replace' ? [] : [...events]
      let added = 0
      let skipped = 0
      for (const event of incoming) {
        if (existingIds.has(event.id)) {
          skipped += 1
          continue
        }
        existingIds.add(event.id)
        merged.push(event)
        added += 1
      }
      setEvents(sortEvents(merged))
      if (record.settings && typeof record.settings === 'object') {
        setSettings((prev) => normalizeSettings({ ...prev, ...(record.settings as object) }))
      }
      return { added, skipped }
    },
    [events],
  )

  const clearAll = useCallback(async () => {
    setEvents([])
    setChat([])
    removeJSON(STORAGE_KEYS.events)
    removeJSON(STORAGE_KEYS.chat)
    await clearRecordings()
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      events,
      settings,
      chat,
      toasts,
      addEvent,
      updateEvent,
      deleteEvent,
      attachAudio,
      detachAudio,
      getAudio,
      updateSettings,
      appendChat,
      patchChat,
      clearChat,
      notify,
      dismissToast,
      exportData,
      importData,
      clearAll,
    }),
    [
      events,
      settings,
      chat,
      toasts,
      addEvent,
      updateEvent,
      deleteEvent,
      attachAudio,
      detachAudio,
      getAudio,
      updateSettings,
      appendChat,
      patchChat,
      clearChat,
      notify,
      dismissToast,
      exportData,
      importData,
      clearAll,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp 必须在 AppProvider 内部使用')
  return context
}
