import { blockPosition } from './calendar-utils';
import { format } from 'date-fns';

export interface CalendarBlock {
  id: string;
  start: string; // ISO UTC
  end: string;   // ISO UTC
  label: string;
  color: string; // CSS color
  columnKey?: string;
}

export interface CalendarColumn {
  key: string;
  label: string;
}

const DAY_START = 6 * 60; // 06:00
const DAY_END = 21 * 60;  // 21:00
const PX_PER_MIN = 0.8;   // 48px per hour

interface DayViewProps {
  date: Date;
  blocks: CalendarBlock[];
  columns?: CalendarColumn[];
  onSelectDate?: (dayKey: string, minute: number) => void;
  onSelectBlock?: (blockId: string) => void;
}

export function DayView({ date, blocks, columns, onSelectDate, onSelectBlock }: DayViewProps) {
  const dayKey = format(date, 'yyyy-MM-dd');
  const cols: CalendarColumn[] = columns && columns.length > 0
    ? columns
    : [{ key: '__single', label: '' }];

  const hours: number[] = [];
  for (let h = DAY_START; h < DAY_END; h += 60) hours.push(h);
  const totalH = (DAY_END - DAY_START) * PX_PER_MIN;

  function blocksFor(colKey: string) {
    return blocks
      .map((b) => ({ b, pos: blockPosition(b.start, b.end) }))
      .filter(({ b, pos }) => pos.dayKey === dayKey && (cols.length === 1 || b.columnKey === colKey));
  }

  return (
    <div className="flex text-xs">
      <div className="w-12 shrink-0">
        <div className="h-6" />
        {hours.map((h) => (
          <div key={h} style={{ height: 60 * PX_PER_MIN }} className="text-right pr-1 text-muted-foreground">
            {String(h / 60).padStart(2, '0')}:00
          </div>
        ))}
      </div>
      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
        {cols.map((col) => (
          <div key={col.key} className="border-l border-border">
            {col.label && <div className="h-6 text-center text-muted-foreground">{col.label}</div>}
            {!col.label && <div className="h-6" />}
            <div className="relative" style={{ height: totalH }}
              onClick={(e) => {
                if (!onSelectDate) return;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const minute = DAY_START + Math.floor(((e.clientY - rect.top) / PX_PER_MIN) / 30) * 30;
                onSelectDate(dayKey, minute);
              }}
            >
              {hours.map((h) => (
                <div key={h} style={{ top: (h - DAY_START) * PX_PER_MIN, height: 60 * PX_PER_MIN }}
                  className="absolute inset-x-0 border-t border-border/50" />
              ))}
              {blocksFor(col.key).map(({ b, pos }) => (
                <button key={b.id} type="button"
                  onClick={(e) => { e.stopPropagation(); onSelectBlock?.(b.id); }}
                  style={{
                    top: (pos.startMinute - DAY_START) * PX_PER_MIN,
                    height: Math.max((pos.endMinute - pos.startMinute) * PX_PER_MIN, 14),
                    background: b.color,
                  }}
                  className="absolute inset-x-1 rounded px-1 text-left text-white text-[10px] overflow-hidden"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
