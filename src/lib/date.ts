/** 日期工具：全部按本地时区处理，iso 格式固定为 YYYY-MM-DD */

export const WEEKDAY_SHORT = ['一', '二', '三', '四', '五', '六', '日']
export const WEEKDAY_FULL = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const pad2 = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function isISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** 解析为本地零点，避免 new Date('2026-01-01') 被当成 UTC */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isValidISODate(iso: string): boolean {
  if (!isISODate(iso)) return false
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** 1 = 周一 … 7 = 周日 */
export function isoWeekday(iso: string): number {
  const d = parseISODate(iso).getDay()
  return d === 0 ? 7 : d
}

export interface CalendarCell {
  iso: string
  day: number
  inMonth: boolean
  isToday: boolean
  isWeekend: boolean
}

/** 周一开头的月历网格 */
export function monthGrid(year: number, month: number): CalendarCell[][] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const total = daysInMonth(year, month)
  const cellCount = Math.ceil((offset + total) / 7) * 7
  const today = todayISO()
  const weeks: CalendarCell[][] = []
  for (let i = 0; i < cellCount; i += 1) {
    const date = new Date(year, month, 1 - offset + i)
    const iso = toISODate(date)
    if (i % 7 === 0) weeks.push([])
    weeks[weeks.length - 1].push({
      iso,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: iso === today,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    })
  }
  return weeks
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function formatCN(iso: string): string {
  const d = parseISODate(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatShort(iso: string): string {
  const d = parseISODate(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatMonthLabel(year: number, month: number): string {
  return `${year}年${month + 1}月`
}

export function weekdayCN(iso: string): string {
  return WEEKDAY_FULL[isoWeekday(iso) - 1]
}

/** 两个 iso 日期相差的天数（to - from），用 UTC 计算以避免夏令时误差 */
export function dayDiff(fromISO: string, toISO: string): number {
  const [ay, am, ad] = fromISO.split('-').map(Number)
  const [by, bm, bd] = toISO.split('-').map(Number)
  const a = Date.UTC(ay, am - 1, ad)
  const b = Date.UTC(by, bm - 1, bd)
  return Math.round((b - a) / 86400000)
}

export function relativeDay(iso: string, today = todayISO()): string {
  const d = dayDiff(iso, today)
  if (d === 0) return '今天'
  if (d === 1) return '昨天'
  if (d === 2) return '前天'
  if (d === -1) return '明天'
  if (d > 2 && d <= 6) return `${d} 天前`
  const date = parseISODate(iso)
  if (date.getFullYear() === new Date().getFullYear()) return formatShort(iso)
  return formatCN(iso)
}

export function formatClock(ts: number): string {
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes(),
  )}`
}
