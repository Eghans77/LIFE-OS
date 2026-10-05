import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  BookOpen,
  ExternalLink,
  ArrowUpRight,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import {
  createHabitRecord,
  toggleHabitDateRecord,
  deleteHabitRecord,
  createLearningRecord,
  logStudySessionRecord,
  deleteLearningRecord,
  createTransactionRecord,
  deleteTransactionRecord,
} from '../lib/firebase';
import { LearningItemType, TransactionType } from '../types/lifeos';

// ============================================================================
// 1. HABITS MODULE
// ============================================================================
export const HabitsModule: React.FC = () => {
  const { user, habits, goals, selectedDate, showToast } = useLifeOS();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Health & Routine');
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'weekly'>('daily');
  const [linkedGoalId, setLinkedGoalId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Last 7 days strip ending on selectedDate
  const last7Days = useMemo(() => {
    const base = new Date(`${selectedDate}T12:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - (6 - i));
      const iso = d.toISOString().slice(0, 10);
      return {
        iso,
        shortDay: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        dayNum: d.getDate(),
      };
    });
  }, [selectedDate]);

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    await createHabitRecord(user.uid, {
      title,
      description,
      category,
      frequency,
      linkedGoalId,
    });
    setTitle('');
    setDescription('');
    setShowForm(false);
    showToast('Habit created.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-3xl text-white">Habits</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Build daily and weekly consistency connected to your long-term LIFE OS goals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreateHabit}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-white">Create Habit</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Habit Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Morning Exercise, Coding Practice, Prayer, Reading..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekdays' | 'weekly')}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="daily">Daily (7x / week)</option>
                <option value="weekdays">Weekdays (5x / week)</option>
                <option value="weekly">Weekly (3x / week)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Linked Goal (Optional)</label>
              <select
                value={linkedGoalId}
                onChange={(e) => setLinkedGoalId(e.target.value)}
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
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
            >
              Save Habit
            </button>
          </div>
        </form>
      )}

      {habits.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-3">
          <p className="text-sm font-medium text-white">No habits tracked yet.</p>
          <p className="text-xs text-slate-400">
            Create habits for exercise, reading, coding, journaling, prayer, or hydration.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 divide-y divide-slate-800/80">
          {habits.map((habit) => {
            const linkedGoal = goals.find((g) => g.id === habit.linkedGoalId);
            return (
              <div
                key={habit.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <span className="text-emerald-400 font-sans font-medium">
                      {habit.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{habit.frequency}</span>
                    <span aria-hidden="true">·</span>
                    <span>Current Streak: {habit.currentStreak}d</span>
                    <span aria-hidden="true">·</span>
                    <span>Best: {habit.bestStreak}d</span>
                  </div>
                  <h3 className="text-base font-semibold text-white">{habit.title}</h3>
                  {linkedGoal && (
                    <p className="text-xs text-sky-400">Supports Goal: {linkedGoal.title}</p>
                  )}
                </div>

                {/* 7-Day Interactive Completion Matrix */}
                <div className="flex items-center gap-2">
                  {last7Days.map((d) => {
                    const completed = habit.completedDates.includes(d.iso);
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => toggleHabitDateRecord(habit, d.iso)}
                        className={`w-10 h-12 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                          completed
                            ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                        title={`Toggle ${habit.title} on ${d.iso}`}
                      >
                        <span className="text-[10px] font-medium">{d.shortDay}</span>
                        <span className="font-mono text-xs font-semibold">{d.dayNum}</span>
                      </button>
                    );
                  })}

                  {confirmDeleteId === habit.id ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteHabitRecord(habit.id);
                        setConfirmDeleteId(null);
                        showToast('Habit deleted.');
                      }}
                      className="ml-2 px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(habit.id)}
                      className="ml-2 p-2 rounded-lg text-slate-500 hover:text-red-400"
                      title="Delete Habit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. LEARNING MODULE
// ============================================================================
export const LearningModule: React.FC = () => {
  const { user, learning, goals, selectedDate, openAIWithPrompt, showToast } = useLifeOS();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [itemType, setItemType] = useState<LearningItemType>('course');
  const [category, setCategory] = useState('Software Engineering');
  const [targetHours, setTargetHours] = useState(40);
  const [resourceUrl, setResourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [linkedGoalId, setLinkedGoalId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreateLearning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    await createLearningRecord(user.uid, {
      title,
      itemType,
      category,
      targetHours,
      resourceUrl,
      notes,
      linkedGoalId,
    });
    setTitle('');
    setResourceUrl('');
    setNotes('');
    setShowForm(false);
    showToast('Learning curriculum added.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-3xl text-white">Learning</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track subjects, skills, courses, study sessions, and AI-scheduled deep study blocks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Learning Plan</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreateLearning}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-white">Add Subject, Skill, or Course</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Full-Stack JavaScript & TypeScript Curriculum"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Type</label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as LearningItemType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="course">Course</option>
                <option value="skill">Skill</option>
                <option value="subject">Subject</option>
                <option value="resource">Resource / Book</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Target Study Hours</label>
              <input
                type="number"
                min={1}
                max={2000}
                value={targetHours}
                onChange={(e) => setTargetHours(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Resource Link (Optional)</label>
              <input
                type="url"
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Linked Goal</label>
              <select
                value={linkedGoalId}
                onChange={(e) => setLinkedGoalId(e.target.value)}
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
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Study Notes &amp; Syllabus</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white resize-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
            >
              Save Learning Item
            </button>
          </div>
        </form>
      )}

      {learning.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-white">Start your first learning plan.</p>
          <p className="text-xs text-slate-400">
            When you say &ldquo;I want to study coding today&rdquo;, the AI Assistant uses your
            learning curriculum here to schedule the right session.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {learning.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-sans font-medium">
                      {item.itemType.toUpperCase()}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.category}</span>
                  </div>
                  {confirmDeleteId === item.id ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteLearningRecord(item.id);
                        setConfirmDeleteId(null);
                        showToast('Learning item deleted.');
                      }}
                      className="px-2 py-1 rounded bg-red-600 text-white text-xs font-sans font-semibold"
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(item.id)}
                      className="p-1 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                {item.notes && (
                  <p className="text-xs text-slate-400 leading-relaxed">{item.notes}</p>
                )}
                {item.resourceUrl && (
                  <a
                    href={item.resourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                  >
                    <span>Open Study Resource</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-800/80">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      {item.totalHoursLogged}h / {item.targetHours}h logged
                    </span>
                    <span className="text-white font-semibold">{item.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await logStudySessionRecord(item, 1, selectedDate);
                        showToast(`Logged 1h study session for ${item.title}`);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white cursor-pointer"
                    >
                      + Log 1h
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await logStudySessionRecord(item, 2, selectedDate);
                        showToast(`Logged 2h study session for ${item.title}`);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white cursor-pointer"
                    >
                      + Log 2h
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openAIWithPrompt(
                        `Schedule a 2-hour study session for "${item.title}" today and suggest the next study milestone.`
                      )
                    }
                    className="text-xs text-emerald-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span>Schedule with AI</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. PERSONAL FINANCE MODULE
// ============================================================================
export const FinanceModule: React.FC = () => {
  const { user, transactions, selectedDate, showToast } = useLifeOS();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('Living & Essentials');
  const [date, setDate] = useState(selectedDate);
  const [notes, setNotes] = useState('');
  const [financialGoalTitle, setFinancialGoalTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const summary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let savings = 0;
    transactions.forEach((tx) => {
      if (tx.transactionType === 'income') income += tx.amount;
      else if (tx.transactionType === 'expense') expenses += tx.amount;
      else if (tx.transactionType === 'savings') savings += tx.amount;
    });
    const netBalance = income - expenses - savings;
    return { income, expenses, savings, netBalance };
  }, [transactions]);

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !amount) return;
    await createTransactionRecord(user.uid, {
      title,
      amount: Math.max(0.01, Number(amount)),
      transactionType,
      category,
      date,
      notes,
      financialGoalTitle,
    });
    setTitle('');
    setAmount('');
    setNotes('');
    setShowForm(false);
    showToast('Financial transaction recorded.');
  };

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-3xl text-white">Personal Finance</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track personal income, expenses, savings allocations, and financial goals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          <span>Record Transaction</span>
        </button>
      </div>

      {/* Summary Metric Cards (Strict Tabular Numerals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-1">
          <span className="text-xs text-slate-400">Total Income</span>
          <p className="font-mono text-2xl font-semibold text-emerald-400 tabular-nums">
            {formatMoney(summary.income)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-1">
          <span className="text-xs text-slate-400">Total Expenses</span>
          <p className="font-mono text-2xl font-semibold text-amber-400 tabular-nums">
            {formatMoney(summary.expenses)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-1">
          <span className="text-xs text-slate-400">Allocated Savings</span>
          <p className="font-mono text-2xl font-semibold text-sky-400 tabular-nums">
            {formatMoney(summary.savings)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-1">
          <span className="text-xs text-slate-400">Net Cash Flow</span>
          <p className="font-mono text-2xl font-semibold text-white tabular-nums">
            {formatMoney(summary.netBalance)}
          </p>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSaveTx}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-white">Record Financial Entry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Description / Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Client Design Retainer, Groceries, Studio Reserve..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150.00"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Transaction Type</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="savings">Savings</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Client Work, Workspace, Utilities..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">
                Financial Goal (Optional)
              </label>
              <input
                type="text"
                value={financialGoalTitle}
                onChange={(e) => setFinancialGoalTitle(e.target.value)}
                placeholder="e.g. Emergency & Studio Upgrade Fund"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
            >
              Save Entry
            </button>
          </div>
        </form>
      )}

      {/* High-Density Transactions Ledger */}
      {transactions.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-3">
          <p className="text-sm font-medium text-white">No financial entries recorded yet.</p>
          <p className="text-xs text-slate-400">
            Record income, expenses, and savings allocations to monitor your monthly cash flow.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Title</th>
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium text-right">Amount</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {tx.title}
                      {tx.financialGoalTitle && (
                        <span className="block text-[11px] text-sky-400 font-normal">
                          Goal: {tx.financialGoalTitle}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{tx.category}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {tx.transactionType}
                    </td>
                    <td
                      className={`py-3 px-4 font-mono font-semibold text-right tabular-nums whitespace-nowrap ${
                        tx.transactionType === 'income'
                          ? 'text-emerald-400'
                          : tx.transactionType === 'savings'
                          ? 'text-sky-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {tx.transactionType === 'expense' ? '-' : '+'}
                      {formatMoney(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {confirmDeleteId === tx.id ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteTransactionRecord(tx.id);
                            setConfirmDeleteId(null);
                            showToast('Transaction deleted.');
                          }}
                          className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-semibold"
                        >
                          Confirm Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(tx.id)}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="Delete Transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
