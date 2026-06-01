export interface Window { startMinute: number; endMinute: number; }
export interface BusyInterval { startMinute: number; endMinute: number; }

export interface GenerateInput {
  windows: Window[];
  busy: BusyInterval[];
  durationMinutes: number;
}

export interface Slot { startMinute: number; }

const GRID_STEP = 30;

export function generateSlots(input: GenerateInput): Slot[] {
  const result: Slot[] = [];
  const windows = [...input.windows].sort((a, b) => a.startMinute - b.startMinute);
  for (const w of windows) {
    const firstSlot = nextGridStep(w.startMinute);
    for (let m = firstSlot; m + input.durationMinutes <= w.endMinute; m += GRID_STEP) {
      const slotEnd = m + input.durationMinutes;
      if (overlapsAny(m, slotEnd, input.busy)) continue;
      result.push({ startMinute: m });
    }
  }
  return result;
}

function nextGridStep(minute: number): number {
  const rem = minute % GRID_STEP;
  return rem === 0 ? minute : minute + (GRID_STEP - rem);
}

function overlapsAny(start: number, end: number, busy: BusyInterval[]): boolean {
  return busy.some((b) => start < b.endMinute && b.startMinute < end);
}
