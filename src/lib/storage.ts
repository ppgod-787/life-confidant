export const STORAGE_KEYS = {
  events: 'lifeconfidant.events.v1',
  settings: 'lifeconfidant.settings.v1',
  chat: 'lifeconfidant.chat.v1',
  tab: 'lifeconfidant.tab.v1',
} as const

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeJSON(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* 隐私模式下可能被禁用，忽略 */
  }
}

export function isStorageAvailable(): boolean {
  try {
    const probe = '__lifeconfidant_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}
