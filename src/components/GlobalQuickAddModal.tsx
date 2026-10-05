import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import {
  createTaskRecord,
  createNoteRecord,
  createEventRecord,
  createProjectRecord,
  createGoalRecord,
  createTransactionRecord,
  createHabitRecord,
  createLearningRecord,
} from '../lib/firebase';
import { PriorityLevel } from '../types/lifeos';

export const GlobalQuickAddModal: React.FC = () => {
  const {
    user,
    isQuickAddOpen,
    setIsQuickAddOpen,
    quickAddDefaultTab,
    selectedDate,
    projects,
    goals,
    showToast,
  } = useLifeOS();

  const [tab, setTab] = useState<
    'task' | 'note' | 'event' | 'project' | 'goal' | 'finance' | 'habit' | 'learning'
  >(quickAddDefaultTab);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [dueDate, setDueDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);
  const [projectId, setProjectId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [amount, setAmount] = useState('25');
  const [txType, setTxType] = useState<'income' | 'expense' | 'savings'>('expense');
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'weekly'>('daily');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTab(quickAddDefaultTab);
    setDueDate(selectedDate);
  }, [quickAddDefaultTab, selectedDate, isQuickAddOpen]);

  if (!isQuickAddOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      const uid = user.uid;
      if (tab === 'task') {
        await createTaskRecord(uid, {
          title,
          description,
          priority,
          dueDate,
          scheduledTime: startTime,
          category: category || 'General',
          estimatedMinutes,
          projectId,
          goalId,
        });
        showToast('Task added to LIFE OS.');
      } else if (tab === 'note') {
        await createNoteRecord(uid, {
          title,
          content: description,
          category: category || 'Ideas',
          tags: category ? [category.toLowerCase()] : ['quick-note'],
          isPinned: false,
          projectId,
          goalId,
        });
        showToast('Note captured in Second Brain.');
      } else if (tab === 'event') {
        await createEventRecord(uid, {
          title,
          description,
          date: dueDate,
          startTime,
          endTime,
          eventType: 'event',
          location: category,
          projectId,
          isFixed: true,
        });
        showToast('Event added to Calendar.');
      } else if (tab === 'project') {
        await createProjectRecord(uid, {
          name: title,
          description,
          priority,
          startDate: selectedDate,
          deadline: dueDate,
          category: category || 'Work',
          goalId,
        });
        showToast('Project created.');
      } else if (tab === 'goal') {
        await createGoalRecord(uid, {
          title,
          description,
          category: category || 'Personal Growth',
          deadline: dueDate,
          milestones: [],
          targetMetric: '100% completion',
        });
        showToast('Goal created.');
      } else if (tab === 'finance') {
        await createTransactionRecord(uid, {
          title,
          amount: Math.max(0.01, Number(amount) || 10),
          transactionType: txType,
          category: category || 'General',
          date: dueDate,
          notes: description,
        });
        showToast('Financial transaction recorded.');
      } else if (tab === 'habit') {
        await createHabitRecord(uid, {
          title,
          description,
          category: category || 'Routine',
          frequency,
          linkedGoalId: goalId,
        });
        showToast('Habit added.');
      } else if (tab === 'learning') {
        await createLearningRecord(uid, {
          title,
          itemType: 'skill',
          category: category || 'Engineering',
          targetHours: Math.max(1, Number(amount) || 40),
          notes: description,
          linkedGoalId: goalId,
        });
        showToast('Learning topic added.');
      }

      setTitle('');
      setDescription('');
      setCategory('');
      setIsQuickAddOpen(false);
    } catch {
      showToast('Failed to save item. Please check your inputs.');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: {
    id: 'task' | 'note' | 'event' | 'project' | 'goal' | 'finance' | 'habit' | 'learning';
    label: string;
  }[] = [
    { id: 'task', label: 'Task' },
    { id: 'note', label: 'Note' },
    { id: 'event', label: 'Event' },
    { id: 'project', label: 'Project' },
    { id: 'goal', label: 'Goal' },
    { id: 'finance', label: 'Finance' },
    { id: 'habit', label: 'Habit' },
    { id: 'learning', label: 'Learning' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-semibold text-white">Quick Capture (+ Add to LIFE OS)</h2>
          <button
            onClick={() => setIsQuickAddOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Segmented Tab Selector */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                tab === t.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {tab === 'project' ? 'Project Name' : 'Title'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${tab} title...`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {tab === 'note' ? 'Note Content' : 'Description / Details'}
            </label>
            <textarea
              rows={tab === 'note' ? 4 : 2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes or context..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {tab === 'event' ? 'Location' : 'Category'}
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={tab === 'event' ? 'Studio / Sanctuary' : 'Work, Personal, Learning...'}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            {(tab === 'task' || tab === 'event' || tab === 'project' || tab === 'goal' || tab === 'finance') && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {tab === 'event' || tab === 'finance' ? 'Date' : 'Due Date / Deadline'}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>
            )}

            {(tab === 'task' || tab === 'project') && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            )}

            {tab === 'task' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>
            )}

            {tab === 'event' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </>
            )}

            {tab === 'finance' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as 'income' | 'expense' | 'savings')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
              </>
            )}

            {tab === 'habit' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekdays' | 'weekly')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays (Mon–Fri)</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            )}

            {(tab === 'task' || tab === 'note' || tab === 'event') && projects.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Linked Project (Optional)
                </label>
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
            )}

            {(tab === 'task' || tab === 'project' || tab === 'habit' || tab === 'learning') &&
              goals.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Linked Goal (Optional)
                  </label>
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
              )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : `Create ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
