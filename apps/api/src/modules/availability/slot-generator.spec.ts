import { generateSlots, Window, BusyInterval } from './slot-generator';

const W = (startMinute: number, endMinute: number): Window => ({ startMinute, endMinute });
const B = (startMinute: number, endMinute: number): BusyInterval => ({ startMinute, endMinute });

describe('generateSlots', () => {
  it('grid starts at first :00 or :30 ≥ window.start and skips slots that exceed window.end', () => {
    // 09:00-12:00, service 45min → 09:00, 09:30, 10:00, 10:30, 11:00 (11:30 exceeds)
    const out = generateSlots({ windows: [W(540, 720)], busy: [], durationMinutes: 45 });
    expect(out.map((s) => s.startMinute)).toEqual([540, 570, 600, 630, 660]);
  });

  it('snaps a window starting at 09:10 to 09:30', () => {
    const out = generateSlots({ windows: [W(550, 720)], busy: [], durationMinutes: 30 });
    expect(out[0].startMinute).toBe(570);
  });

  it('keeps the window start when it already lands on :00 / :30', () => {
    const out = generateSlots({ windows: [W(540, 720)], busy: [], durationMinutes: 30 });
    expect(out[0].startMinute).toBe(540);
  });

  it('drops slots overlapping a busy interval', () => {
    // window 09:00-12:00, busy 10:00-10:45 (45min), service 45min
    // 09:00 (09:00-09:45) → ok
    // 09:30 (09:30-10:15) → overlap with 10:00-10:45 → drop
    // 10:00 → conflict (exact) → drop
    // 10:30 (10:30-11:15) → overlap → drop
    // 11:00 (11:00-11:45) → ok
    const out = generateSlots({
      windows: [W(540, 720)], busy: [B(600, 645)], durationMinutes: 45,
    });
    expect(out.map((s) => s.startMinute)).toEqual([540, 660]);
  });

  it('handles multiple windows (e.g. lunch break 12:00-14:00)', () => {
    const out = generateSlots({
      windows: [W(540, 720), W(840, 1080)], busy: [], durationMinutes: 45,
    });
    // morning ends at 11:00 (last fitting), afternoon starts at 14:00 and last fitting is 17:00
    const minutes = out.map((s) => s.startMinute);
    expect(minutes).toContain(540);
    expect(minutes).toContain(660);
    expect(minutes).not.toContain(690); // 11:30 exceeds 12:00 window
    expect(minutes).toContain(840);
    expect(minutes).toContain(1020); // 17:00 (ends 17:45)
    expect(minutes).not.toContain(1050); // 17:30 exceeds 18:00
  });

  it('returns empty when no windows', () => {
    const out = generateSlots({ windows: [], busy: [], durationMinutes: 30 });
    expect(out).toEqual([]);
  });

  it('returns empty when service longer than every window', () => {
    const out = generateSlots({ windows: [W(540, 570)], busy: [], durationMinutes: 60 });
    expect(out).toEqual([]);
  });

  it('windows in unsorted order still work', () => {
    const out = generateSlots({
      windows: [W(840, 1080), W(540, 720)], busy: [], durationMinutes: 30,
    });
    expect(out[0].startMinute).toBeLessThan(out[out.length - 1].startMinute);
  });

  it('a busy interval that fully covers a window emits no slots in that window', () => {
    const out = generateSlots({
      windows: [W(540, 720)], busy: [B(540, 720)], durationMinutes: 30,
    });
    expect(out).toEqual([]);
  });

  it('back-to-back busy at end leaves earlier slots intact', () => {
    // window 09:00-12:00, busy 11:00-11:45, service 45min
    // 09:00, 09:30, 10:00 ok; 10:30 (10:30-11:15) overlap; 11:00 conflict
    const out = generateSlots({
      windows: [W(540, 720)], busy: [B(660, 705)], durationMinutes: 45,
    });
    expect(out.map((s) => s.startMinute)).toEqual([540, 570, 600]);
  });
});
