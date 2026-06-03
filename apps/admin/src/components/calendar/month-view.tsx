import { format, isSameMonth } from 'date-fns';
import { monthGrid, blockPosition } from './calendar-utils';
import type { CalendarBlock } from './day-view';

interface MonthViewProps {
  date: Date;
  blocks: CalendarBlock[];
  onSelectDate?: (dayKey: string, minute: number) => void;
}

export function MonthView({ date, blocks, onSelectDate }: MonthViewProps) {
  const weeks = monthGrid(date);
  const countByDay = new Map<string, number>();
  for (const b of blocks) {
    const { dayKey } = blockPosition(b.start, b.end);
    countByDay.set(dayKey, (countByDay.get(dayKey) ?? 0) + 1);
  }
  const dows = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="text-xs">
      <div className="grid grid-cols-7">
        {dows.map((d) => (
          <div key={d} className="text-center py-1 text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((d) => {
          const dayKey = format(d, 'yyyy-MM-dd');
          const n = countByDay.get(dayKey) ?? 0;
          return (
            <button key={dayKey} type="button"
              onClick={() => onSelectDate?.(dayKey, 9 * 60)}
              className={`h-20 border border-border/60 p-1 text-left align-top ${
                isSameMonth(d, date) ? '' : 'bg-muted/40 text-muted-foreground'
              }`}
            >
              <div>{format(d, 'd')}</div>
              {n > 0 && <div className="mt-1 inline-block rounded-full bg-primary/15 text-primary px-1.5 text-[10px]">{n}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
