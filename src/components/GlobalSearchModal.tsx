import React, { useState, useMemo } from 'react';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import { ModuleId } from '../types/lifeos';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  module: ModuleId;
  moduleLabel: string;
}

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    setActiveModule,
    tasks,
    projects,
    goals,
    notes,
    events,
    learning,
    habits,
    openAIWithPrompt,
  } = useLifeOS();

  const [queryText, setQueryText] = useState('');

  const results = useMemo<SearchResultItem[]>(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return [];
    const list: SearchResultItem[] = [];

    tasks.forEach((t) => {
      if (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      ) {
        list.push({
          id: `t_${t.id}`,
          title: t.title,
          subtitle: `${t.priority} priority · ${t.dueDate || 'No date'} · ${t.status}`,
          module: 'tasks',
          moduleLabel: 'Task',
        });
      }
    });

    projects.forEach((p) => {
      if (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) {
        list.push({
          id: `p_${p.id}`,
          title: p.name,
          subtitle: `${p.status} · ${p.progress}% complete`,
          module: 'projects',
          moduleLabel: 'Project',
        });
      }
    });

    goals.forEach((g) => {
      if (g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)) {
        list.push({
          id: `g_${g.id}`,
          title: g.title,
          subtitle: `${g.category} · ${g.progress}% complete`,
          module: 'goals',
          moduleLabel: 'Goal',
        });
      }
    });

    notes.forEach((n) => {
      if (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((tag) => tag.toLowerCase().includes(q))
      ) {
        list.push({
          id: `n_${n.id}`,
          title: n.title,
          subtitle: `${n.category} · ${n.content.slice(0, 80)}`,
          module: 'notes',
          moduleLabel: 'Second Brain Note',
        });
      }
    });

    events.forEach((e) => {
      if (e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)) {
        list.push({
          id: `e_${e.id}`,
          title: e.title,
          subtitle: `${e.date} · ${e.startTime}–${e.endTime}`,
          module: 'calendar',
          moduleLabel: 'Calendar Event',
        });
      }
    });

    learning.forEach((l) => {
      if (l.title.toLowerCase().includes(q) || l.notes.toLowerCase().includes(q)) {
        list.push({
          id: `l_${l.id}`,
          title: l.title,
          subtitle: `${l.itemType} · ${l.totalHoursLogged}/${l.targetHours}h`,
          module: 'learning',
          moduleLabel: 'Learning',
        });
      }
    });

    habits.forEach((h) => {
      if (h.title.toLowerCase().includes(q)) {
        list.push({
          id: `h_${h.id}`,
          title: h.title,
          subtitle: `${h.frequency} · ${h.currentStreak} day streak`,
          module: 'habits',
          moduleLabel: 'Habit',
        });
      }
    });

    return list.slice(0, 25);
  }, [queryText, tasks, projects, goals, notes, events, learning, habits]);

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm p-4 pt-16">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <Search className="w-4 h-4 text-emerald-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search across tasks, projects, goals, notes, calendar events, and learning..."
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/70">
          {!queryText.trim() ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Type a keyword to search your entire LIFE OS knowledge base, or press Esc to close.
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-xs text-slate-400">
                No records matching &ldquo;{queryText}&rdquo; found.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  openAIWithPrompt(queryText);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
              >
                Ask AI Assistant about &ldquo;{queryText}&rdquo;
              </button>
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveModule(item.module);
                  setIsSearchOpen(false);
                }}
                className="w-full px-5 py-3.5 text-left hover:bg-slate-800/70 flex items-center justify-between gap-4 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-emerald-400 font-medium">{item.moduleLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{item.subtitle}</span>
                  </div>
                  <p className="text-sm font-medium text-white truncate mt-0.5">{item.title}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
