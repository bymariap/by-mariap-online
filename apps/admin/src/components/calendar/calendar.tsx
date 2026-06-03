import { type ReactNode } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { navigate, visibleRange, type CalendarView } from './calendar-utils';
import { DayView, type CalendarBlock, type CalendarColumn } from './day-view';
import { WeekView } from './week-view';
import { MonthView } from './month-view';

export type { CalendarBlock, CalendarColumn } from './day-view';
export type { CalendarView } from './calendar-utils';
export { visibleRange };

interface CalendarProps {
  view: CalendarView;
  date: Date;
  blocks: CalendarBlock[];
  columns?: CalendarColumn[];
  onViewChange: (v: CalendarView) => void;
  onDateChange: (d: Date) => void;
  onSelectDate?: (dayKey: string, minute: number) => void;
  onSelectBlock?: (blockId: string) => void;
  rightSlot?: ReactNode;
}

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'month', label: 'Mes' },
  { key: 'week', label: 'Semana' },
  { key: 'day', label: 'Día' },
];

export function Calendar({
  view, date, blocks, columns, onViewChange, onDateChange,
  onSelectDate, onSelectBlock, rightSlot,
}: CalendarProps) {
  const title =
    view === 'month' ? format(date, 'MMMM yyyy')
    : view === 'week' ? (() => { const r = visibleRange('week', date); return `${r.from} – ${r.to}`; })()
    : format(date, 'EEEE d MMM yyyy');

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-border gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onDateChange(navigate(view, date, 0))}>Hoy</Button>
          <Button variant="outline" size="sm" onClick={() => onDateChange(navigate(view, date, -1))}>‹</Button>
          <Button variant="outline" size="sm" onClick={() => onDateChange(navigate(view, date, 1))}>›</Button>
          <strong className="text-sm capitalize">{title}</strong>
        </div>
        <div className="flex items-center gap-2">
          {rightSlot}
          <div className="flex border border-border rounded-md overflow-hidden">
            {VIEWS.map((v) => (
              <button key={v.key} onClick={() => onViewChange(v.key)}
                className={cn('px-3 py-1 text-sm', view === v.key ? 'bg-foreground text-background' : 'text-muted-foreground')}
              >{v.label}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-2 overflow-auto max-h-[70vh]">
        {view === 'month' && <MonthView date={date} blocks={blocks} onSelectDate={onSelectDate} />}
        {view === 'week' && <WeekView date={date} blocks={blocks} onSelectDate={onSelectDate} onSelectBlock={onSelectBlock} />}
        {view === 'day' && <DayView date={date} blocks={blocks} columns={columns} onSelectDate={onSelectDate} onSelectBlock={onSelectBlock} />}
      </div>
    </div>
  );
}
