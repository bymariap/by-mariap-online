import { describe, it, expect } from 'vitest';
import {
  navigate, visibleRange, weekDays, monthGrid, blockPosition, localHHmm,
} from './calendar-utils';

describe('navigate', () => {
  it('month +1 moves to next month', () => {
    expect(navigate('month', new Date('2026-06-15'), 1).getMonth()).toBe(6); // July
  });
  it('week +1 moves 7 days forward', () => {
    const out = navigate('week', new Date('2026-06-01'), 1);
    expect(out.getDate()).toBe(8);
  });
  it('day -1 moves one day back', () => {
    const out = navigate('day', new Date('2026-06-02'), -1);
    expect(out.getDate()).toBe(1);
  });
  it('dir 0 returns today', () => {
    const out = navigate('month', new Date('2020-01-01'), 0);
    expect(out.getFullYear()).toBe(new Date().getFullYear());
  });
});

describe('visibleRange', () => {
  it('week spans Monday..Sunday', () => {
    // 2026-06-03 is a Wednesday
    expect(visibleRange('week', new Date('2026-06-03'))).toEqual({
      from: '2026-06-01', to: '2026-06-07',
    });
  });
  it('day from === to', () => {
    expect(visibleRange('day', new Date('2026-06-03'))).toEqual({
      from: '2026-06-03', to: '2026-06-03',
    });
  });
  it('month covers full weeks around the month', () => {
    const r = visibleRange('month', new Date('2026-06-15'));
    // June 2026 starts Monday Jun 1, ends Tuesday Jun 30 -> grid Jun 1 .. Jul 5
    expect(r.from).toBe('2026-06-01');
    expect(r.to).toBe('2026-07-05');
  });
});

describe('weekDays', () => {
  it('returns 7 days starting Monday', () => {
    const days = weekDays(new Date('2026-06-03'));
    expect(days).toHaveLength(7);
    expect(days[0].getDate()).toBe(1); // Monday Jun 1
    expect(days[6].getDate()).toBe(7); // Sunday Jun 7
  });
});

describe('monthGrid', () => {
  it('returns weeks of 7 days, first cell is a Monday', () => {
    const grid = monthGrid(new Date('2026-06-15'));
    expect(grid[0]).toHaveLength(7);
    expect(grid[0][0].getDate()).toBe(1); // Mon Jun 1
    // flatten contains Jun 15
    const flat = grid.flat().map((d) => d.toISOString().slice(0, 10));
    expect(flat).toContain('2026-06-15');
  });
});

describe('blockPosition', () => {
  it('maps a UTC instant to local Bogota day and minutes', () => {
    // 14:00Z == 09:00 Bogota (UTC-5); 45 min later 14:45Z == 09:45
    const out = blockPosition('2026-06-01T14:00:00.000Z', '2026-06-01T14:45:00.000Z');
    expect(out.dayKey).toBe('2026-06-01');
    expect(out.startMinute).toBe(540);
    expect(out.endMinute).toBe(585);
  });
  it('handles an instant that falls on the previous local day', () => {
    // 02:00Z == 21:00 previous day Bogota
    const out = blockPosition('2026-06-02T02:00:00.000Z', '2026-06-02T02:45:00.000Z');
    expect(out.dayKey).toBe('2026-06-01');
    expect(out.startMinute).toBe(1260); // 21:00
  });
});

describe('localHHmm', () => {
  it('formats a UTC instant as Bogota HH:mm', () => {
    expect(localHHmm('2026-06-01T14:00:00.000Z')).toBe('09:00');
  });
});
