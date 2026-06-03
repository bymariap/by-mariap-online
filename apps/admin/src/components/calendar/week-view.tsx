import { format } from 'date-fns';
import { weekDays, blockPosition } from './calendar-utils';
import type { CalendarBlock } from './day-view';

const DAY_START = 6 * 60;
const DAY_END = 21 * 60;
const PX_PER_MIN = 0.7;

interface WeekViewProps {
  date: Date;
  blocks: CalendarBlock[];
  onSelectDate?: (dayKey: string, minute: number) => void;
  onSelectBlock?: (blockId: string) => void;
}

export function WeekView({ date, blocks, onSelectDate, onSelectBlock }: WeekViewProps) {
  const days = weekDays(date);
  const hours: number[] = [];
  for (let h = DAY_START; h < DAY_END; h += 60) hours.push(h);
  const totalH = (DAY_END - DAY_START) * PX_PER_MIN;

  return (
    <div className="flex text-xs">
      <div className="w-12 shrink-0">
        <div className="h-8" />
        {hours.map((h) => (
          <div key={h} style={{ height: 60 * PX_PER_MIN }} className="text-right pr-1 text-muted-foreground">
            {String(h / 60).padStart(2, '0')}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7">
        {days.map((d) => {
          const dayKey = format(d, 'yyyy-MM-dd');
          const dayBlocks = blocks
            .map((b) => ({ b, pos: blockPosition(b.start, b.end) }))
            .filter(({ pos }) => pos.dayKey === dayKey);
          return (
            <div key={dayKey} className="border-l border-border">
              <div className="h-8 text-center text-muted-foreground capitalize">
                {format(d, 'EEE d')}
              </div>
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
                {dayBlocks.map(({ b, pos }) => (
                  <button key={b.id} type="button"
                    onClick={(e) => { e.stopPropagation(); onSelectBlock?.(b.id); }}
                    style={{
                      top: (pos.startMinute - DAY_START) * PX_PER_MIN,
                      height: Math.max((pos.endMinute - pos.startMinute) * PX_PER_MIN, 12),
                      background: b.color,
                    }}
                    className="absolute inset-x-0.5 rounded px-1 text-left text-white text-[9px] overflow-hidden"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
