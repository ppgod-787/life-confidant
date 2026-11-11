import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../types'
import { buildBackup, normalizeChat, normalizeEvent, normalizeEvents, sortEvents } from './model'

describe('数据规范化', () => {
  it('拒绝没有日期或没有内容的记录', () => {
    expect(normalizeEvent(null)).toBeNull()
    expect(normalizeEvent({ date: '不是日期', title: '标题' })).toBeNull()
    expect(normalizeEvent({ date: '2026-11-11', title: '', content: '' })).toBeNull()
  })

  it('把未知心情回落到平静，并清理标签', () => {
    const event = normalizeEvent({
      date: '2026-11-11',
      title: '测试',
      content: '内容',
      mood: 99,
      tags: [' 家人 ', '', 3, '旅行'],
      time: '25:00',
    })
    expect(event?.mood).toBe(3)
    expect(event?.tags).toEqual(['家人', '旅行'])
    expect(event?.time).toBe('')
  })

  it('导入时修复重复 id', () => {
    const events = normalizeEvents([
      { id: 'same', date: '2026-11-11', title: 'A', content: 'a' },
      { id: 'same', date: '2026-11-10', title: 'B', content: 'b' },
    ])
    expect(events).toHaveLength(2)
    expect(events[0].id).not.toBe(events[1].id)
  })

  it('按时间倒序排列记录', () => {
    const events = sortEvents([
      { id: '1', date: '2026-01-01', title: '早', content: '', mood: 3, tags: [], time: '', createdAt: 1, updatedAt: 1 },
      { id: '2', date: '2026-12-01', title: '晚', content: '', mood: 3, tags: [], time: '', createdAt: 1, updatedAt: 1 },
    ])
    expect(events.map((event) => event.id)).toEqual(['2', '1'])
  })

  it('过滤格式不对的对话消息', () => {
    const chat = normalizeChat([
      { role: 'user', content: '你好' },
      { role: 'system', content: '忽略' },
      { role: 'assistant', content: '' },
    ])
    expect(chat).toHaveLength(1)
    expect(chat[0].role).toBe('user')
  })

  it('备份不包含 API Key，也不留下悬空的录音 id', () => {
    const backup = buildBackup(
      [
        {
          id: 'evt_audio',
          title: '有录音的记录',
          content: '',
          date: '2026-11-11',
          time: '',
          mood: 3,
          tags: [],
          audioId: 'aud_secret',
          audioDuration: 12,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      { ...DEFAULT_SETTINGS, apiKey: 'sk-secret' },
    )
    const serialized = JSON.stringify(backup)
    expect(serialized).not.toContain('sk-secret')
    expect(serialized).not.toContain('aud_secret')
    expect(serialized).not.toContain('audioDuration')
    expect(backup.settings).toEqual({ theme: DEFAULT_SETTINGS.theme, nickname: DEFAULT_SETTINGS.nickname })
  })
})
