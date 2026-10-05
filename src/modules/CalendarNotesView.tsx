import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Pin,
  Archive,
  Search,
  MapPin,
  Clock,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import {
  createEventRecord,
  updateEventRecord,
  deleteEventRecord,
  createNoteRecord,
  updateNoteRecord,
  deleteNoteRecord,
} from '../lib/firebase';
import { CalendarEvent, CalendarEventType, Note } from '../types/lifeos';

// ============================================================================
// 1. CALENDAR MODULE (DAY, WEEK, MONTH VIEWS)
// ============================================================================
export const CalendarModule: React.FC = () => {
  const {
    user,
    events,
    projects,
    tasks,
    selectedDate,
    setSelectedDate,
    todayPlan,
    showToast,
  } = useLifeOS();

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [eventType, setEventType] = useState<CalendarEventType>('event');
  const [location, setLocation] = useState('');
  const [notesText, setNotesText] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [isFixed, setIsFixed] = useState(true);

  const openEdit = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setTitle(evt.title);
    setDescription(evt.description);
    setDate(evt.date);
    setStartTime(evt.startTime);
    setEndTime(evt.endTime);
    setEventType(evt.eventType);
    setLocation(evt.location);
    setNotesText(evt.notes);
    setProjectId(evt.projectId);
    setTaskId(evt.taskId);
    setIsFixed(evt.isFixed);
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setDate(selectedDate);
    setStartTime('09:00');
    setEndTime('10:00');
    setEventType('event');
    setLocation('');
    setNotesText('');
    setProjectId('');
    setTaskId('');
    setIsFixed(true);
    setShowForm(false);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    if (editingEvent) {
      await updateEventRecord(editingEvent.id, editingEvent, {
        title,
        description,
        date,
        startTime,
        endTime,
        eventType,
        location,
        notes: notesText,
        projectId,
        taskId,
        isFixed,
      });
      showToast('Calendar event updated.');
    } else {
      await createEventRecord(user.uid, {
        title,
        description,
        date,
        startTime,
        endTime,
        eventType,
        location,
        notes: notesText,
        projectId,
        taskId,
        isFixed,
      });
      showToast('Calendar event scheduled.');
    }
    resetForm();
  };

  const shiftSelectedDate = (days: number) => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  // Compute 7 days of the selected week
  const weekDays = useMemo(() => {
    const base = new Date(`${selectedDate}T12:00:00`);
    const dayOfWeek = base.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday);

    return Array.from({ length: 7 }, (_, idx) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + idx);
      const iso = dt.toISOString().slice(0, 10);
      return {
        iso,
        dayName: dt.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: dt.getDate(),
      };
    });
  }, [selectedDate]);

  // Compute days of the selected month
  const monthDays = useMemo(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      const monthStr = String(m).padStart(2, '0');
      return `${y}-${monthStr}-${day}`;
    });
  }, [selectedDate]);

  const dayEvents = events.filter((e) => e.date === selectedDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-3xl text-white">Calendar</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage fixed commitments, appointments, meetings, deadlines, and AI schedule blocks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Day / Week / Month View Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
            {(['day', 'week', 'month'] as const).map((vm) => (
              <button
                key={vm}
                type="button"
                onClick={() => setViewMode(vm)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === vm
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {vm.charAt(0).toUpperCase() + vm.slice(1)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-800 px-4 py-3">
        <button
          type="button"
          onClick={() => shiftSelectedDate(viewMode === 'day' ? -1 : viewMode === 'week' ? -7 : -30)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          aria-label="Previous period"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-white">{selectedDate}</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono"
          />
        </div>

        <button
          type="button"
          onClick={() => shiftSelectedDate(viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          aria-label="Next period"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSaveEvent}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-white">
            {editingEvent ? 'Edit Event' : 'Schedule Calendar Event'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Event Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Church Evening Service"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as CalendarEventType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="fixed_commitment">Fixed Commitment</option>
                <option value="appointment">Appointment</option>
                <option value="meeting">Meeting</option>
                <option value="deadline">Deadline</option>
                <option value="time_block">Focus Time Block</option>
                <option value="event">General Event</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Start Time</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">End Time</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Main Sanctuary / Studio / Online"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Linked Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Linked Task</label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="">None</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                id="fixed-check"
                type="checkbox"
                checked={isFixed}
                onChange={(e) => setIsFixed(e.target.checked)}
                className="accent-emerald-500 w-4 h-4"
              />
              <label htmlFor="fixed-check" className="text-xs text-slate-200">
                Fixed commitment (AI cannot move this time slot)
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Notes / Prep Details</label>
              <textarea
                rows={2}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
            >
              {editingEvent ? 'Update Event' : 'Save Event'}
            </button>
          </div>
        </form>
      )}

      {/* DAY VIEW */}
      {viewMode === 'day' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">
              Calendar Events on {selectedDate} ({dayEvents.length})
            </h2>
            {dayEvents.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No calendar events scheduled for {selectedDate}.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {dayEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="py-3.5 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {evt.startTime} — {evt.endTime}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className="text-slate-400">
                          {evt.eventType.replace('_', ' ')}
                        </span>
                        {evt.isFixed && (
                          <>
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="text-amber-400 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Fixed
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white">{evt.title}</p>
                      {evt.location && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {evt.location}
                        </p>
                      )}
                      {evt.notes && (
                        <p className="text-xs text-slate-400">{evt.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(evt)}
                        className="p-1.5 text-slate-400 hover:text-white"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {confirmDeleteId === evt.id ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteEventRecord(evt.id);
                            setConfirmDeleteId(null);
                            showToast('Event deleted.');
                          }}
                          className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(evt.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Synced AI Daily Plan Blocks on this Day */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">
              AI Planned Time Blocks ({todayPlan?.blocks.length || 0})
            </h2>
            {!todayPlan || todayPlan.blocks.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No AI schedule generated for {selectedDate} yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {todayPlan.blocks.map((b) => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-emerald-400 font-medium">
                        {b.startTime} – {b.endTime}
                      </span>
                      <p className="text-sm text-white font-medium mt-0.5">{b.title}</p>
                    </div>
                    <span className="font-mono text-slate-400">
                      {b.blockType.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {weekDays.map((wd) => {
            const wdEvents = events.filter((e) => e.date === wd.iso);
            const isSelected = wd.iso === selectedDate;
            return (
              <div
                key={wd.iso}
                onClick={() => setSelectedDate(wd.iso)}
                className={`rounded-2xl border p-4 space-y-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500/60'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-400">{wd.dayName}</span>
                  <span className="font-mono text-sm font-semibold text-white">
                    {wd.dayNum}
                  </span>
                </div>
                {wdEvents.length === 0 ? (
                  <p className="text-[11px] text-slate-500">Open</p>
                ) : (
                  <div className="space-y-2">
                    {wdEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-0.5"
                      >
                        <p className="font-mono text-[10px] text-emerald-400">
                          {ev.startTime}
                        </p>
                        <p className="text-white font-medium truncate">{ev.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {monthDays.map((iso) => {
            const dEvents = events.filter((e) => e.date === iso);
            const dTasks = tasks.filter((t) => t.dueDate === iso && !t.isCompleted);
            const isSelected = iso === selectedDate;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  setSelectedDate(iso);
                  setViewMode('day');
                }}
                className={`p-3 rounded-xl border text-left space-y-2 transition-colors cursor-pointer min-h-[88px] flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="font-mono text-xs font-semibold text-white">
                  {iso.slice(-2)}
                </span>
                <div className="space-y-1 w-full">
                  {dEvents.length > 0 && (
                    <p className="text-[11px] text-emerald-400 truncate font-mono">
                      {dEvents.length} event{dEvents.length > 1 ? 's' : ''}
                    </p>
                  )}
                  {dTasks.length > 0 && (
                    <p className="text-[11px] text-sky-400 truncate font-mono">
                      {dTasks.length} task{dTasks.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. NOTES / SECOND BRAIN MODULE
// ============================================================================
export const NotesModule: React.FC = () => {
  const { user, notes, projects, goals, openAIWithPrompt, showToast } = useLifeOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState<'active' | 'pinned' | 'archived'>('active');
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Ideas');
  const [tagsInput, setTagsInput] = useState('');
  const [projectId, setProjectId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  const openEdit = (n: Note) => {
    setEditingNote(n);
    setTitle(n.title);
    setContent(n.content);
    setCategory(n.category);
    setTagsInput(n.tags.join(', '));
    setProjectId(n.projectId);
    setGoalId(n.goalId);
    setIsPinned(n.isPinned);
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setCategory('Ideas');
    setTagsInput('');
    setProjectId('');
    setGoalId('');
    setIsPinned(false);
    setShowForm(false);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    if (editingNote) {
      await updateNoteRecord(editingNote.id, editingNote, {
        title,
        content,
        category,
        tags,
        projectId,
        goalId,
        isPinned,
      });
      showToast('Note updated.');
    } else {
      await createNoteRecord(user.uid, {
        title,
        content,
        category,
        tags,
        projectId,
        goalId,
        isPinned,
        isArchived: false,
      });
      showToast('Note saved to Second Brain.');
    }
    resetForm();
  };

  const filteredNotes = notes.filter((n) => {
    if (filterView === 'active' && n.isArchived) return false;
    if (filterView === 'pinned' && (!n.isPinned || n.isArchived)) return false;
    if (filterView === 'archived' && !n.isArchived) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-3xl text-white">Notes &amp; Second Brain</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Capture ideas, research, creative concepts, and project documentation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          <span>Capture Note</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by title, content, category, or tags..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
          {(['active', 'pinned', 'archived'] as const).map((fv) => (
            <button
              key={fv}
              type="button"
              onClick={() => setFilterView(fv)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterView === fv
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {fv.charAt(0).toUpperCase() + fv.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSaveNote}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-white">
            {editingNote ? 'Edit Note' : 'Capture Note'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Idea, research topic, or concept..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Content</label>
              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your thoughts, research notes, or action items..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white resize-y"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Engineering, Creative, Ministry, Personal..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="javascript, design, ideas"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Linked Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Linked Goal</label>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="">None</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Pin to top of Second Brain</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                {editingNote ? 'Save Changes' : 'Save Note'}
              </button>
            </div>
          </div>
        </form>
      )}

      {filteredNotes.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-3">
          <p className="text-sm font-medium text-white">Capture an idea.</p>
          <p className="text-xs text-slate-400">
            Your Second Brain stores notes, research, and project context that the AI Assistant can
            draw upon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNotes.map((note) => {
            const linkedProj = projects.find((p) => p.id === note.projectId);
            return (
              <div
                key={note.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-medium">{note.category}</span>
                      {note.isPinned && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-400">Pinned</span>
                        </>
                      )}
                      {linkedProj && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{linkedProj.name}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateNoteRecord(note.id, note, { isPinned: !note.isPinned })
                        }
                        className={`p-1.5 rounded hover:bg-slate-800 ${
                          note.isPinned ? 'text-amber-400' : 'text-slate-400'
                        }`}
                        title="Toggle Pin"
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(note)}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                        title="Edit Note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateNoteRecord(note.id, note, { isArchived: !note.isArchived })
                        }
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400"
                        title="Toggle Archive"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === note.id ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteNoteRecord(note.id);
                            setConfirmDeleteId(null);
                            showToast('Note deleted.');
                          }}
                          className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-semibold"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(note.id)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-white">{note.title}</h3>
                  <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed line-clamp-5">
                    {note.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <div className="text-slate-400 font-mono truncate">
                    {note.tags.length > 0 ? note.tags.map((t) => `#${t}`).join(' · ') : 'No tags'}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openAIWithPrompt(
                        `Turn this note into actionable tasks or schedule blocks: "${note.title}: ${note.content.slice(
                          0,
                          300
                        )}"`
                      )
                    }
                    className="text-emerald-400 hover:underline font-medium shrink-0 cursor-pointer"
                  >
                    Send to AI →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
