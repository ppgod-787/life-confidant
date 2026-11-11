import { describe, expect, it } from 'vitest'
import type { LifeEvent } from '../types'
import { buildEventContext, buildSystemPrompt, computeStats, moodTrend } from './context'

function makeEvent(overrides: Partial<LifeEvent> = {}): LifeEvent {
  return {
    id: overrides.id ?? 'evt_test',
    title: overrides.title ?? '一件小事',
    content: overrides.content ?? '今天发生了一件值得记住的事。',
    date: overrides.date ?? '2026-11-11',
    time: overrides.time ?? '',
    mood: overrides.mood ?? 3,
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? 1,
    updatedAt: overrides.updatedAt ?? 1,
    ...overrides,
  }
}

describe('AI 上下文', () => {
  it('空记录时明确告诉模型没有记录', () => {
    const result = buildEventContext([])
    expect(result.count).toBe(0)
    expect(result.text).toBe('')
  })

  it('预算不足时优先保留最近的记录', () => {
    const oldEvent = makeEvent({
      id: 'old',
      date: '2020-01-01',
      title: '很久以前',
      content: '旧'.repeat(500),
    })
    const newEvent = makeEvent({ id: 'new', date: '2026-11-01', title: '最近的事', content: '很短。' })
    const result = buildEventContext([oldEvent, newEvent], 180)
    expect(result.count).toBe(1)
    expect(result.text).toContain('最近的事')
    expect(result.text).not.toContain('很久以前')
  })

  it('按时间从早到晚排列', () => {
    const result = buildEventContext([
      makeEvent({ id: 'b', date: '2026-05-01', title: '五月' }),
      makeEvent({ id: 'a', date: '2026-01-01', title: '一月' }),
    ])
    expect(result.text.indexOf('一月')).toBeLessThan(result.text.indexOf('五月'))
  })

  it('统计心情、跨度和标签', () => {
    const stats = computeStats([
      makeEvent({ id: '1', mood: 5, tags: ['家人', '旅行'] }),
      makeEvent({ id: '2', mood: 3, tags: ['家人'], date: '2026-10-01' }),
      makeEvent({ id: '3', mood: 1, tags: [], date: '2026-01-01' }),
    ])
    expect(stats.total).toBe(3)
    expect(stats.avgMood).toBe(3)
    expect(stats.moodCounts[5]).toBe(1)
    expect(stats.firstDate).toBe('2026-01-01')
    expect(stats.lastDate).toBe('2026-11-11')
    expect(stats.topTags[0]).toEqual({ tag: '家人', count: 2 })
  })

  it('情绪趋势只统计有记录的月份', () => {
    const trend = moodTrend([makeEvent({ date: '2026-11-01', mood: 4 })])
    expect(trend).toContain('2026-11')
    expect(trend).not.toContain('2026-10')
  })

  it('系统提示词包含称呼与记录概况', () => {
    const prompt = buildSystemPrompt({
      nickname: '小林',
      context: '- 2026-11-11 一件事',
      contextCount: 1,
      stats: computeStats([makeEvent()]),
      trend: '',
    })
    expect(prompt).toContain('小林')
    expect(prompt).toContain('共 1 条')
    expect(prompt).toContain('不贴标签、不做诊断')
  })
})
