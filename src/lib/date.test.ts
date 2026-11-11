import { describe, expect, it } from 'vitest'
import {
  dayDiff,
  formatCN,
  formatMonthLabel,
  isValidISODate,
  monthGrid,
  relativeDay,
  shiftMonth,
  todayISO,
  weekdayCN,
} from './date'

describe('日期工具', () => {
  it('校验真实存在的日期', () => {
    expect(isValidISODate('2026-11-11')).toBe(true)
    expect(isValidISODate('2026-02-29')).toBe(false)
    expect(isValidISODate('2024-02-29')).toBe(true)
    expect(isValidISODate('2026-13-01')).toBe(false)
    expect(isValidISODate('2026-1-1')).toBe(false)
  })

  it('生成周一开头、覆盖整月的网格', () => {
    const grid = monthGrid(2026, 10)
    expect(grid[0][0].iso).toBe('2026-10-26')
    expect(grid.flat().filter((cell) => cell.inMonth)).toHaveLength(30)
    expect(grid.flat()).toHaveLength(42)
    expect(grid.every((week) => week.length === 7)).toBe(true)
    expect(grid[0][0].day).toBe(26)

    const today = todayISO()
    const todayCell = monthGrid(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1)
      .flat()
      .find((cell) => cell.iso === today)
    expect(todayCell?.isToday).toBe(true)
  })

  it('把 2026 年 11 月 11 日认成周三', () => {
    expect(weekdayCN('2026-11-11')).toBe('周三')
    expect(formatCN('2026-11-11')).toBe('2026年11月11日')
    expect(formatMonthLabel(2026, 10)).toBe('2026年11月')
  })

  it('跨年切换月份', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
  })

  it('计算日期差与相对日期', () => {
    expect(dayDiff('2026-11-01', '2026-11-11')).toBe(10)
    expect(dayDiff('2026-11-11', '2026-11-10')).toBe(-1)
    expect(relativeDay('2026-11-11', '2026-11-11')).toBe('今天')
    expect(relativeDay('2026-11-10', '2026-11-11')).toBe('昨天')
    expect(relativeDay('2026-11-04', '2026-11-11')).toBe('11月4日')
  })
})
