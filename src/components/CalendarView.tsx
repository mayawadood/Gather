import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, parseISO, startOfWeek, endOfWeek, addMonths, subMonths,
  addWeeks, subWeeks, isToday as dateFnsIsToday
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { GatherEvent } from '../types';

interface Props {
  events: GatherEvent[];
  onEventClick: (event: GatherEvent) => void;
}

type CalView = 'month' | 'week';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function CalendarView({ events, onEventClick }: Props) {
  const [current, setCurrent] = useState(new Date());
  const [view, setView] = useState<CalView>('month');

  const finalizedEvents = events.filter(e => e.status === 'finalized' && e.finalizedDate);

  function eventsOnDay(day: Date) {
    return finalizedEvents.filter(e => {
      try { return isSameDay(parseISO(e.finalizedDate), day); } catch { return false; }
    });
  }

  // Navigation
  function prev() {
    setCurrent(v => view === 'month' ? subMonths(v, 1) : subWeeks(v, 1));
  }
  function next() {
    setCurrent(v => view === 'month' ? addMonths(v, 1) : addWeeks(v, 1));
  }
  function goToday() { setCurrent(new Date()); }

  // Header label
  const weekStart = startOfWeek(current, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(current, { weekStartsOn: 0 });
  const headerLabel = view === 'month'
    ? format(current, 'MMMM yyyy')
    : format(weekStart, 'MMM d') + ' – ' + format(weekEnd, format(weekStart, 'MMM') === format(weekEnd, 'MMM') ? 'd, yyyy' : 'MMM d, yyyy');

  // Month grid days
  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(current), { weekStartsOn: 0 }),
  });

  // Week grid days
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft size={18} className="text-gray-500" />
        </button>
        <h3 className="font-bold text-gray-900 text-sm flex-1 text-center">{headerLabel}</h3>
        <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight size={18} className="text-gray-500" />
        </button>

        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 ml-1">
          {(['month', 'week'] as CalView[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors capitalize ${
                view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <button
          onClick={goToday}
          className="text-xs font-semibold text-[#d4607a] hover:text-[#c45070] px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors ml-1"
        >
          Today
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1.5">{d}</div>
        ))}
      </div>

      {/* Month view */}
      {view === 'month' && (
        <div className="grid grid-cols-7">
          {monthDays.map((day, i) => {
            const inMonth = isSameMonth(day, current);
            const today = dateFnsIsToday(day);
            const dayEvents = eventsOnDay(day);
            return (
              <div
                key={i}
                className={`min-h-[56px] p-1 border-b border-r border-gray-50 ${!inMonth ? 'bg-gray-50/50' : ''}`}
              >
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mx-auto mb-0.5 ${
                  today ? 'bg-[#FFB7C5] text-[#1a1014]' : inMonth ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  {format(day, 'd')}
                </span>
                {dayEvents.slice(0, 2).map(e => (
                  <EventPill key={e.id} event={e} onClick={() => onEventClick(e)} />
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[9px] text-gray-400 pl-1">+{dayEvents.length - 2}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Week view */}
      {view === 'week' && (
        <div className="grid grid-cols-7 divide-x divide-gray-50">
          {weekDays.map((day) => {
            const today = dateFnsIsToday(day);
            const dayEvents = eventsOnDay(day);
            return (
              <div key={day.toISOString()} className="min-h-[160px] flex flex-col">
                {/* Date header */}
                <div className={`flex flex-col items-center py-2 border-b border-gray-50 ${today ? 'bg-rose-50' : ''}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${today ? 'text-rose-400' : 'text-gray-400'}`}>
                    {format(day, 'EEE')}
                  </span>
                  <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mt-0.5 ${
                    today ? 'bg-[#FFB7C5] text-[#1a1014]' : 'text-gray-800'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
                {/* Events */}
                <div className="flex-1 p-1 flex flex-col gap-1">
                  {dayEvents.map(e => (
                    <button
                      key={e.id}
                      onClick={() => onEventClick(e)}
                      className="w-full text-left rounded-lg bg-sky-100 hover:bg-sky-200 transition-colors px-1.5 py-1"
                    >
                      <p className="text-[10px] font-semibold text-sky-800 truncate leading-tight">{e.name}</p>
                      {e.finalizedTime && (
                        <p className="text-[9px] text-sky-500 leading-tight">
                          {format(parseISO(`${e.finalizedDate}T${e.finalizedTime}`), 'h:mm a')}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EventPill({ event, onClick }: { event: GatherEvent; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left text-[10px] leading-tight font-medium bg-sky-100 text-sky-700 rounded px-1 py-0.5 mb-0.5 truncate hover:bg-sky-200 transition-colors"
    >
      {event.name}
    </button>
  );
}
