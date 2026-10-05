import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Mic,
  Plus,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Calendar as CalendarIcon,
  Timer,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLifeOS } from '../context/LifeOSContext';
import {
  toggleTaskRecord,
  toggleHabitDateRecord,
  saveDailyPlanRecord,
} from '../lib/firebase';
import { ScheduleBlock } from '../types/lifeos';
import dashboardHeroBanner from '../assets/images/dashboard_hero_banner_1790884378272.jpg';
import focusFlowBanner from '../assets/images/focus_flow_banner_1790884401370.jpg';
import avatarEghansImg from '../assets/images/avatar_eghans_profile_1790884410325.jpg';

export const DashboardView: React.FC = () => {
  const {
    user,
    profile,
    selectedDate,
    setSelectedDate,
    tasks,
    projects,
    goals,
    events,
    habits,
    learning,
    todayPlan,
    setActiveModule,
    openAIWithPrompt,
    openQuickAdd,
    openFocusTimer,
    showToast,
  } = useLifeOS();

  const [now, setNow] = useState(() => new Date());
  const [quickPrompt, setQuickPrompt] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setReviewNotes(todayPlan?.endOfDayReview || '');
  }, [todayPlan?.endOfDayReview, todayPlan?.id]);

  const timeString = useMemo(() => {
    const use12h = profile?.timeFormat === '12h';
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: use12h,
    });
  }, [now, profile?.timeFormat]);

  const dateDisplay = useMemo(() => {
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [now]);

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, [now]);

  // Identify Current Activity and Next Activity from Today's Plan
  const { currentBlock, nextBlock } = useMemo(() => {
    if (!todayPlan || !todayPlan.blocks.length) {
      return { currentBlock: null, nextBlock: null };
    }
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const inProg = todayPlan.blocks.find((b) => b.status === 'in_progress');
    const byTime = todayPlan.blocks.find(
      (b) => b.status !== 'completed' && b.startTime <= hhmm && b.endTime >= hhmm
    );
    const active =
      inProg ||
      byTime ||
      todayPlan.blocks.find((b) => b.status !== 'completed') ||
      todayPlan.blocks[0];

    const activeIdx = todayPlan.blocks.findIndex((b) => b.id === active?.id);
    const upcoming =
      activeIdx >= 0
        ? todayPlan.blocks.slice(activeIdx + 1).find((b) => b.status !== 'completed') || null
        : null;

    return { currentBlock: active, nextBlock: upcoming };
  }, [todayPlan, now]);

  const handleToggleBlockStatus = async (block: ScheduleBlock) => {
    if (!user || !todayPlan) return;
    const nextStatus: ScheduleBlock['status'] =
      block.status === 'completed' ? 'pending' : 'completed';
    const updatedBlocks = todayPlan.blocks.map((b) =>
      b.id === block.id ? { ...b, status: nextStatus } : b
    );
    await saveDailyPlanRecord(
      user.uid,
      todayPlan.date,
      {
        status: todayPlan.status,
        userInput: todayPlan.userInput,
        aiSummary: todayPlan.aiSummary,
        isOverloaded: todayPlan.isOverloaded,
        overloadMessage: todayPlan.overloadMessage,
        blocks: updatedBlocks,
        priorities: todayPlan.priorities,
        endOfDayReview: todayPlan.endOfDayReview,
      },
      todayPlan.id
    );
    showToast(
      nextStatus === 'completed'
        ? `Completed: ${block.title}`
        : `Reopened: ${block.title}`
    );
  };

  const handleSaveReview = async () => {
    if (!user || !todayPlan) return;
    setSavingReview(true);
    try {
      await saveDailyPlanRecord(
        user.uid,
        todayPlan.date,
        {
          status: todayPlan.status,
          userInput: todayPlan.userInput,
          aiSummary: todayPlan.aiSummary,
          isOverloaded: todayPlan.isOverloaded,
          overloadMessage: todayPlan.overloadMessage,
          blocks: todayPlan.blocks,
          priorities: todayPlan.priorities,
          endOfDayReview: reviewNotes,
        },
        todayPlan.id
      );
      showToast('End-of-day review saved.');
    } finally {
      setSavingReview(false);
    }
  };

  const incompleteTasks = tasks.filter((t) => !t.isCompleted);
  const completedTasksCount = tasks.filter((t) => t.isCompleted).length;
  const todayEvents = events.filter((e) => e.date === selectedDate);
  const activeProjects = projects.filter(
    (p) => p.status === 'active' || p.status === 'planning'
  );
  const activeGoals = goals.filter((g) => g.status === 'active');

  return (
    <div className="space-y-8">
      {/* Command Center Hero Greeting & AI Daily Opening Prompt with Atmospheric Banner */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl"
      >
        {/* Atmospheric Hero Image Backdrop */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={dashboardHeroBanner}
            alt="LIFE OS Command Center Atmosphere"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/85 to-slate-950/75" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="flex items-start sm:items-center gap-4">
            <img
              src={profile?.photoUrl || avatarEghansImg}
              alt="Eghans"
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl object-cover border border-emerald-500/60 shadow-lg shrink-0 hidden sm:block"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                <span>{dateDisplay}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400 font-semibold">{timeString}</span>
                <span aria-hidden="true">·</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 font-mono"
                  aria-label="Select active date"
                />
              </div>
              <h1 className="font-display text-3xl sm:text-4xl text-white">
                {greeting}{' '}
                {profile?.displayName && profile.displayName !== 'Commander'
                  ? profile.displayName
                  : 'Eghans'}
                . What does your day look like?
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                openFocusTimer(
                  currentBlock?.title || 'Deep Focus Session',
                  45
                )
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-emerald-400 transition-colors cursor-pointer min-h-[40px]"
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Focus Timer</span>
            </button>
            <button
              type="button"
              onClick={() => openQuickAdd('task')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition-colors cursor-pointer min-h-[40px]"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Quick Add</span>
            </button>
            <button
              type="button"
              onClick={() => openAIWithPrompt('')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer min-h-[40px]"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Daily Planning Session</span>
            </button>
          </div>
        </div>

        {/* Inline AI Natural Language Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!quickPrompt.trim()) return;
            openAIWithPrompt(quickPrompt);
            setQuickPrompt('');
          }}
          className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <input
            type="text"
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            placeholder="Describe your tasks, fixed commitments, deadlines, or schedule updates for today..."
            className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openAIWithPrompt(quickPrompt)}
              className="px-3.5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              title="Voice or Full Assistant"
            >
              <Mic className="w-4 h-4 text-emerald-400" />
              <span className="sm:hidden lg:inline">Voice</span>
            </button>
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[44px]"
            >
              <span>Plan / Reschedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Live Rescheduling Quick Triggers */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Quick commands:</span>
          {[
            'What should I work on right now?',
            "What's left for today?",
            'Push my current activity by 30 minutes',
            "I can't finish everything today. Help me prioritize.",
            'Plan tomorrow for me',
          ].map((trigger, i) => (
            <button
              key={i}
              type="button"
              onClick={() => openAIWithPrompt(trigger)}
              className="px-2.5 py-1 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-800/90 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              &ldquo;{trigger}&rdquo;
            </button>
          ))}
        </div>
      </motion.section>

      {/* Current & Next Activity Spotlight + Today's Priorities */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="surface-interactive rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
              <span>Current Activity</span>
              <span className="font-mono">
                {currentBlock
                  ? `${currentBlock.startTime} – ${currentBlock.endTime}`
                  : 'Unscheduled'}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white">
              {currentBlock ? currentBlock.title : 'No active block scheduled'}
            </h2>
            <p className="text-xs text-slate-400">
              {currentBlock?.notes ||
                'Start a Daily Planning Session so AI can organize your focus blocks.'}
            </p>
          </div>
          {currentBlock && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleBlockStatus(currentBlock)}
                  className="text-emerald-400 hover:underline font-medium cursor-pointer"
                >
                  {currentBlock.status === 'completed' ? 'Completed ✓' : 'Mark Completed'}
                </button>
                <button
                  type="button"
                  onClick={() => openFocusTimer(currentBlock.title, 45)}
                  className="flex items-center gap-1 text-slate-300 hover:text-emerald-400 font-medium cursor-pointer"
                >
                  <Timer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Start Focus</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  openAIWithPrompt(
                    `I'm still working on "${currentBlock.title}". Please reorganize the rest of my day while protecting fixed commitments.`
                  )
                }
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                Running late? Reschedule →
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-sky-400 font-medium">
              <span>Next Activity</span>
              <span className="font-mono">
                {nextBlock ? `${nextBlock.startTime} – ${nextBlock.endTime}` : '—'}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white">
              {nextBlock ? nextBlock.title : 'Clear schedule ahead'}
            </h2>
            <p className="text-xs text-slate-400">
              {nextBlock?.notes || 'All upcoming time blocks are open.'}
            </p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400 font-mono">
            <span>
              {nextBlock ? nextBlock.blockType.replace('_', ' ') : 'Buffer period'}
            </span>
            <button
              type="button"
              onClick={() => setActiveModule('calendar')}
              className="text-slate-300 hover:text-white font-sans cursor-pointer"
            >
              Open Calendar →
            </button>
          </div>
        </div>

        <div className="surface-interactive rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">Today&apos;s Top Priorities</span>
              <span className="font-mono">
                {completedTasksCount}/{tasks.length} tasks done
              </span>
            </div>
            {todayPlan && todayPlan.priorities.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {todayPlan.priorities.slice(0, 3).map((prio, idx) => (
                  <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                    <span className="font-mono text-emerald-400 font-semibold">
                      0{idx + 1}.
                    </span>
                    <span className="leading-snug">{prio}</span>
                  </li>
                ))}
              </ul>
            ) : incompleteTasks.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {incompleteTasks.slice(0, 3).map((t, idx) => (
                  <li key={t.id} className="text-xs text-slate-200 flex items-start gap-2">
                    <span className="font-mono text-emerald-400 font-semibold">
                      0{idx + 1}.
                    </span>
                    <span className="truncate">{t.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                No priorities locked yet. Let&apos;s plan your day.
              </p>
            )}
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">AI Insights Ready</span>
            <button
              type="button"
              onClick={() =>
                openAIWithPrompt("What should I work on right now based on my priorities?")
              }
              className="text-emerald-400 hover:underline font-medium cursor-pointer"
            >
              Ask AI Focus Guide →
            </button>
          </div>
        </div>
      </section>

      {/* Main Command Grid: Left 7 cols = Today's AI Plan Timeline, Right 5 cols = Tasks, Events, Habits, Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: TODAY'S AI PLAN */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Today&apos;s AI Schedule ({selectedDate})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {todayPlan
                    ? todayPlan.aiSummary
                    : "Let's plan your day — generate a realistic timeline with buffer blocks."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModule('daily_planning')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  Edit / Replan
                </button>
              </div>
            </div>

            {todayPlan?.isOverloaded && (
              <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-700/60 flex items-start gap-2.5 text-xs text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>{todayPlan.overloadMessage}</p>
              </div>
            )}

            {!todayPlan || todayPlan.blocks.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">Let&apos;s plan your day.</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Tell the AI Assistant what you need to accomplish today, or load the sample
                    workspace to see a complete daily schedule in action.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      openAIWithPrompt(
                        'I need to finish a church poster before 4 PM, study coding for two hours, edit a video, go to church at 6 and call my sister.'
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Generate Today&apos;s Plan with AI
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {todayPlan.blocks.map((blk) => {
                  const isCompleted = blk.status === 'completed';
                  const isCurrent = currentBlock?.id === blk.id;
                  return (
                    <div
                      key={blk.id}
                      className={`py-3.5 px-3 -mx-3 rounded-xl flex items-start justify-between gap-4 transition-colors ${
                        isCurrent ? 'bg-emerald-950/25 border border-emerald-800/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleBlockStatus(blk)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                          aria-label={`Toggle ${blk.title}`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-emerald-400">
                              {blk.startTime} — {blk.endTime}
                            </span>
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {blk.blockType.replace('_', ' ')}
                            </span>
                            {isCurrent && (
                              <>
                                <span aria-hidden="true" className="text-slate-600">
                                  ·
                                </span>
                                <span className="text-xs font-semibold text-emerald-300">
                                  Active Now
                                </span>
                              </>
                            )}
                          </div>
                          <p
                            className={`text-sm font-medium mt-0.5 ${
                              isCompleted ? 'line-through text-slate-500' : 'text-white'
                            }`}
                          >
                            {blk.title}
                          </p>
                          {blk.notes && (
                            <p className="text-xs text-slate-400 mt-0.5">{blk.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openFocusTimer(blk.title, 45)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-mono cursor-pointer"
                          title="Start Deep Focus Timer for this block"
                        >
                          Focus
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openAIWithPrompt(
                              `I need to reschedule "${blk.title}" (${blk.startTime}–${blk.endTime}). Help me adjust the remaining schedule.`
                            )
                          }
                          className="text-xs text-slate-500 hover:text-slate-200 font-mono cursor-pointer"
                          title="Reschedule block with AI"
                        >
                          Move
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* End-of-Day Review Section */}
            {todayPlan && (
              <div className="pt-4 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    End-of-Day Review & Reflection
                  </label>
                  <button
                    type="button"
                    onClick={handleSaveReview}
                    disabled={savingReview}
                    className="text-xs text-emerald-400 hover:underline font-medium cursor-pointer"
                  >
                    {savingReview ? 'Saving...' : 'Save Review'}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="How did today go? What worked well, and what should move to tomorrow?"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tasks, Upcoming Events, Habits, Active Projects & Goals */}
        <div className="lg:col-span-5 space-y-6">
          {/* Tasks Widget */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-white">Priority Tasks</h2>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => openQuickAdd('task')}
                  className="text-emerald-400 hover:underline font-medium cursor-pointer"
                >
                  + Add Task
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('tasks')}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  View All ({incompleteTasks.length})
                </button>
              </div>
            </div>

            {incompleteTasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Your task list is clear.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {incompleteTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="py-2.5 flex items-start justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTaskRecord(task.id, !task.isCompleted)}
                      className="flex items-start gap-2.5 text-left group cursor-pointer min-w-0"
                    >
                      <Circle className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>{task.priority}</span>
                          <span aria-hidden="true">·</span>
                          <span>{task.estimatedMinutes}m</span>
                          {task.scheduledTime && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{task.scheduledTime}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events & Fixed Commitments */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-white">
                Fixed Commitments & Events
              </h2>
              <button
                type="button"
                onClick={() => setActiveModule('calendar')}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Calendar →
              </button>
            </div>

            {todayEvents.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No fixed calendar commitments on {selectedDate}.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {todayEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{evt.title}</p>
                      <p className="text-slate-400 truncate mt-0.5">
                        {evt.location || evt.eventType.replace('_', ' ')}
                      </p>
                    </div>
                    <span className="font-mono text-emerald-400 shrink-0">
                      {evt.startTime} – {evt.endTime}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Habits Progress */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-white">Habit Progress</h2>
              <button
                type="button"
                onClick={() => setActiveModule('habits')}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Manage Habits →
              </button>
            </div>

            {habits.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No habits configured yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {habits.slice(0, 4).map((habit) => {
                  const doneToday = habit.completedDates.includes(selectedDate);
                  return (
                    <div
                      key={habit.id}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => toggleHabitDateRecord(habit, selectedDate)}
                        className="flex items-center gap-2.5 text-left cursor-pointer"
                      >
                        {doneToday ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span
                          className={`text-xs font-medium ${
                            doneToday ? 'text-slate-300' : 'text-white'
                          }`}
                        >
                          {habit.title}
                        </span>
                      </button>
                      <span className="font-mono text-xs text-slate-400">
                        {habit.currentStreak}d streak
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Projects & Goals Snapshot with Visual Banner */}
          <div className="surface-interactive rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
            <div className="relative h-24 w-full overflow-hidden border-b border-slate-800">
              <img
                src={focusFlowBanner}
                alt="Projects and Learning Horizon"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-65"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  Active Projects &amp; Goals
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveModule('projects')}
                  className="text-xs text-emerald-300 hover:text-white cursor-pointer"
                >
                  All Projects ({activeProjects.length}) →
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">

            {activeProjects.length === 0 && activeGoals.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Create your first project or goal to track long-term progress.
              </p>
            ) : (
              <div className="space-y-3">
                {activeProjects.slice(0, 3).map((proj) => (
                  <div key={proj.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white truncate">{proj.name}</span>
                      <span className="font-mono text-slate-400">{proj.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${proj.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
                {learning.slice(0, 1).map((item) => (
                  <div
                    key={item.id}
                    className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400"
                  >
                    <span className="truncate">Learning: {item.title}</span>
                    <span className="font-mono text-emerald-400 shrink-0">
                      {item.totalHoursLogged}/{item.targetHours}h
                    </span>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
