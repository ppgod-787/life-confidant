import type { ChatMessage, LifeEvent, Mood, Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { isValidISODate } from './date'
import { newId } from './id'

const moods = new Set([1, 2, 3, 4, 5])

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asTimestamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeTime(raw: unknown): string {
  const value = asString(raw)
  if (!/^\d{2}:\d{2}$/.test(value)) return ''
  const [hours, minutes] = value.split(':').map(Number)
  return hours < 24 && minutes < 60 ? value : ''
}

export function normalizeEvent(raw: unknown): LifeEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const date = asString(item.date)
  if (!isValidISODate(date)) return null
  const moodValue = Number(item.mood)
  const mood = (moods.has(moodValue) ? moodValue : 3) as Mood
  const now = Date.now()
  const title = asString(item.title).slice(0, 120)
  const content = asString(item.content)
  if (!title && !content) return null

  return {
    id: asString(item.id) || newId('evt_'),
    title,
    content,
    date,
    time: normalizeTime(item.time),
    mood,
    tags: Array.isArray(item.tags)
      ? item.tags
          .filter((tag): tag is string => typeof tag === 'string')
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [],
    audioId: typeof item.audioId === 'string' && item.audioId ? item.audioId : undefined,
    audioDuration:
      typeof item.audioDuration === 'number' && Number.isFinite(item.audioDuration)
        ? Math.max(0, Math.round(item.audioDuration))
        : undefined,
    createdAt: asTimestamp(item.createdAt, now),
    updatedAt: asTimestamp(item.updatedAt, now),
  }
}

export function normalizeEvents(raw: unknown): LifeEvent[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const events: LifeEvent[] = []
  for (const item of raw) {
    const event = normalizeEvent(item)
    if (!event) continue
    if (seen.has(event.id)) event.id = newId('evt_')
    seen.add(event.id)
    events.push(event)
  }
  return events
}

export function normalizeChat(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return []
  const messages: ChatMessage[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const msg = item as Record<string, unknown>
    const role = msg.role === 'assistant' ? 'assistant' : msg.role === 'user' ? 'user' : null
    const content = asString(msg.content)
    if (!role || !content) continue
    messages.push({
      id: asString(msg.id) || newId('msg_'),
      role,
      content,
      createdAt: asTimestamp(msg.createdAt, Date.now()),
      contextCount: typeof msg.contextCount === 'number' ? msg.contextCount : undefined,
      error: msg.error === true ? true : undefined,
    })
  }
  return messages.slice(-200)
}

export function normalizeSettings(raw: unknown): Settings {
  const item = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const theme = item.theme === 'light' || item.theme === 'dark' ? item.theme : 'auto'
  return {
    baseUrl: asString(item.baseUrl, DEFAULT_SETTINGS.baseUrl) || DEFAULT_SETTINGS.baseUrl,
    apiKey: asString(item.apiKey),
    model: asString(item.model, DEFAULT_SETTINGS.model) || DEFAULT_SETTINGS.model,
    theme,
    nickname: asString(item.nickname).slice(0, 20),
  }
}

export function sortEvents(events: LifeEvent[]): LifeEvent[] {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt - a.createdAt
  })
}

export interface BackupFile {
  app: 'life-confidant'
  version: 1
  exportedAt: string
  events: LifeEvent[]
  settings: Pick<Settings, 'theme' | 'nickname'>
}

export function buildBackup(events: LifeEvent[], settings: Settings): BackupFile {
  return {
    app: 'life-confidant',
    version: 1,
    exportedAt: new Date().toISOString(),
    events,
    settings: { theme: settings.theme, nickname: settings.nickname },
  }
}
