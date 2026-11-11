import type { LifeEvent, Mood } from '../types'
import { MOODS } from '../types'
import { dayDiff, formatCN, todayISO, weekdayCN } from './date'

export interface ContextResult {
  text: string
  count: number
}

const MAX_CONTENT_LENGTH = 220

function eventLine(event: LifeEvent): string {
  const mood = MOODS[event.mood]?.label ?? '未记录'
  const content = event.content.replace(/\s+/g, ' ').trim()
  const clipped = content.length > MAX_CONTENT_LENGTH ? `${content.slice(0, MAX_CONTENT_LENGTH)}…` : content
  const tags = event.tags.length ? `｜标签：${event.tags.join('、')}` : ''
  const time = event.time ? ` ${event.time}` : ''
  const body = clipped ? `\n  ${clipped}` : ''
  return `- ${event.date}（${weekdayCN(event.date)}）${time}｜心情：${mood}｜${event.title || '无标题'}${tags}${body}`
}

/**
 * 把人生记录压成一段给模型看的上下文。
 * 超出预算时优先保留最近的记录，避免把早期的小事挤掉后完全失真。
 */
export function buildEventContext(events: LifeEvent[], maxChars = 7000): ContextResult {
  if (events.length === 0) return { text: '', count: 0 }
  const sorted = [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.createdAt - b.createdAt
  })

  const selected: string[] = []
  let used = 0
  let count = 0
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const line = eventLine(sorted[i])
    if (used + line.length > maxChars && count > 0) continue
    selected.push(line)
    used += line.length
    count += 1
  }
  selected.reverse()
  return { text: selected.join('\n'), count }
}

export interface LifeStats {
  total: number
  firstDate: string | null
  lastDate: string | null
  spanDays: number
  avgMood: number | null
  moodCounts: Record<Mood, number>
  topTags: { tag: string; count: number }[]
}

export function computeStats(events: LifeEvent[]): LifeStats {
  const moodCounts: Record<Mood, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const tagMap = new Map<string, number>()
  let moodSum = 0
  let firstDate: string | null = null
  let lastDate: string | null = null

  for (const event of events) {
    moodCounts[event.mood] = (moodCounts[event.mood] ?? 0) + 1
    moodSum += event.mood
    if (!firstDate || event.date < firstDate) firstDate = event.date
    if (!lastDate || event.date > lastDate) lastDate = event.date
    for (const tag of event.tags) tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
  }

  return {
    total: events.length,
    firstDate,
    lastDate,
    spanDays: firstDate ? dayDiff(firstDate, todayISO()) : 0,
    avgMood: events.length ? Math.round((moodSum / events.length) * 10) / 10 : null,
    moodCounts,
    topTags: [...tagMap.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  }
}

/** 最近 6 个月的情绪均值，让模型能看出趋势而不是只看到单条记录 */
export function moodTrend(events: LifeEvent[], months = 6): string {
  if (events.length === 0) return ''
  const buckets = new Map<string, { sum: number; count: number }>()
  const now = new Date()
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.set(key, { sum: 0, count: 0 })
  }
  for (const event of events) {
    const key = event.date.slice(0, 7)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.sum += event.mood
    bucket.count += 1
  }
  const parts: string[] = []
  for (const [key, bucket] of buckets) {
    if (bucket.count === 0) continue
    parts.push(`${key} 平均 ${(bucket.sum / bucket.count).toFixed(1)} 分（${bucket.count} 条）`)
  }
  return parts.join('；')
}

export interface PromptOptions {
  nickname?: string
  context: string
  contextCount: number
  stats: LifeStats
  trend: string
}

export function buildSystemPrompt({ nickname, context, contextCount, stats, trend }: PromptOptions): string {
  const name = (nickname ?? '').trim() || '你'
  const today = formatCN(todayISO())
  const lines: string[] = [
    '你是「人生倾诉器」里的 AI 知己。用户把人生中重要的事记录在这里，现在想和你聊聊。',
    '',
    '【你的角色】',
    '一个温暖、诚实、有洞察力的朋友。不是心理咨询师，也不是说教者。你会认真读完用户的记录，再说话。',
    '',
    '【怎么回答】',
    '1. 先接住情绪：用一两句话让对方感到被听见，不要用“我理解你”“想开点”这类空话。',
    '2. 结合具体记录：提到日期、事件或反复出现的模式，至少引用一条记录。如果记录里确实没有相关内容，就坦白说没有看到，不要编造。',
    '3. 给建议时给 2–3 条一周内就能做的小步骤，具体、可执行。不要说“保持积极心态”这种正确但没用的话。',
    '4. 像朋友聊天：可以用简短的小标题或列表，但别写长篇报告，一般不超过 400 字。',
    '5. 不贴标签、不做诊断。如果对方流露出自伤或危机，要认真对待，建议立刻联系身边信任的人或专业心理援助热线（中国大陆可拨 12356），必要时就医。',
    '6. 用中文回答，除非用户用别的语言。',
    '',
    `【今天】${today}`,
    `【用户称呼】${name}`,
    `【记录概况】共 ${stats.total} 条，最早 ${stats.firstDate ?? '无'}，最近 ${stats.lastDate ?? '无'}，平均心情 ${
      stats.avgMood ?? '—'
    } / 5`,
  ]

  if (stats.topTags.length > 0) {
    lines.push(`【常出现的标签】${stats.topTags.map((t) => `${t.tag}（${t.count}）`).join('、')}`)
  }
  if (trend) lines.push(`【近半年心情趋势】${trend}`)

  lines.push('', '【用户的人生记录（从早到晚，可能不完整）】')
  if (contextCount === 0) {
    lines.push('（还没有任何记录。先好奇地问问对方最近过得怎么样，不要假装看过记录。）')
  } else {
    lines.push(context)
    if (contextCount < stats.total) {
      lines.push('', `（以上是最近的 ${contextCount} 条，共 ${stats.total} 条。更早的记录这次没有带上。）`)
    }
  }
  return lines.join('\n')
}

export function buildOpeningMessage(nickname: string): string {
  const name = nickname.trim()
  if (name) return `${name}，晚上好。想聊聊最近哪件事？`
  return '晚上好。想聊聊最近哪件事？'
}
