import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, X, Timer, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { useLifeOS } from '../context/LifeOSContext';
import {
  toggleTaskRecord,
  logStudySessionRecord,
  saveDailyPlanRecord,
} from '../lib/firebase';
import focusFlowBanner from '../assets/images/focus_flow_banner_1790884401370.jpg';

export const FocusTimerModal: React.FC = () => {
  const {
    user,
    isFocusTimerOpen,
    setIsFocusTimerOpen,
    focusInitialTitle,
    focusInitialMinutes,
    todayPlan,
    tasks,
    learning,
    selectedDate,
    showToast,
  } = useLifeOS();

  const [sessionTitle, setSessionTitle] = useState(focusInitialTitle || 'Deep Focus Session');
  const [totalSeconds, setTotalSeconds] = useState((focusInitialMinutes || 45) * 60);
  const [remainingSeconds, setRemainingSeconds] = useState((focusInitialMinutes || 45) * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedLearningId, setSelectedLearningId] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    if (isFocusTimerOpen) {
      const mins = focusInitialMinutes || 45;
      setSessionTitle(focusInitialTitle || 'Deep Focus Session');
      setTotalSeconds(mins * 60);
      setRemainingSeconds(mins * 60);
      setIsRunning(false);
    }
  }, [isFocusTimerOpen, focusInitialTitle, focusInitialMinutes]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  if (!isFocusTimerOpen || !user) return null;

  const setPresetMinutes = (mins: number) => {
    setIsRunning(false);
    setTotalSeconds(mins * 60);
    setRemainingSeconds(mins * 60);
  };

  const formatClock = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPct =
    totalSeconds > 0
      ? Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100))
      : 0;

  const elapsedMinutes = Math.max(1, Math.round((totalSeconds - remainingSeconds) / 60) || Math.round(totalSeconds / 60));

  const handleCompleteAndLog = async () => {
    setIsLogging(true);
    try {
      // 1. If sessionTitle matches a block in todayPlan, mark it completed
      if (todayPlan) {
        const matchingBlock = todayPlan.blocks.find(
          (b) => b.title.toLowerCase() === sessionTitle.toLowerCase()
        );
        if (matchingBlock && matchingBlock.status !== 'completed') {
          const updatedBlocks = todayPlan.blocks.map((b) =>
            b.id === matchingBlock.id ? { ...b, status: 'completed' as const } : b
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
        }
      }

      // 2. If a task is linked, mark it completed
      if (selectedTaskId) {
        await toggleTaskRecord(selectedTaskId, true);
      }

      // 3. If a learning curriculum is linked, log the study hours
      if (selectedLearningId) {
        const learnItem = learning.find((l) => l.id === selectedLearningId);
        if (learnItem) {
          const hoursToLog = Math.max(0.25, Math.round((elapsedMinutes / 60) * 10) / 10);
          await logStudySessionRecord(learnItem, hoursToLog, selectedDate);
        }
      }

      showToast(`Focus session completed (${elapsedMinutes}m logged to LIFE OS).`);
      setIsRunning(false);
      setIsFocusTimerOpen(false);
    } catch {
      showToast('Could not log focus session.');
    } finally {
      setIsLogging(false);
    }
  };

  const activeTasks = tasks.filter((t) => !t.isCompleted);
  const activeLearning = learning.filter((l) => l.status === 'active');

  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl"
      >
        {/* Atmospheric Focus Header Banner */}
        <div className="relative h-24 w-full overflow-hidden border-b border-slate-800">
          <img
            src={focusFlowBanner}
            alt="Deep Focus Flow Atmosphere"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/45 to-transparent" />
          <div className="absolute inset-0 px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-emerald-400" />
              <h2 className="font-display text-lg font-semibold text-white">
                Deep Work &amp; Focus Timer
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsFocusTimerOpen(false)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg bg-slate-950/60"
              aria-label="Close focus timer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">

        {/* Focus Session Title Input */}
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Current Focus Objective</label>
          <input
            type="text"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-medium text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Duration Presets */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { label: '25m Pomodoro', mins: 25 },
            { label: '45m Deep Work', mins: 45 },
            { label: '60m Sprint', mins: 60 },
            { label: '90m Flow Block', mins: 90 },
          ].map((preset) => (
            <button
              key={preset.mins}
              type="button"
              onClick={() => setPresetMinutes(preset.mins)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                Math.round(totalSeconds / 60) === preset.mins
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Circular SVG Countdown Ring */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-52 h-52 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-950"
              />
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="text-emerald-400 transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-4xl font-semibold text-white tabular-nums tracking-tight">
                {formatClock(remainingSeconds)}
              </span>
              <span className="text-xs text-slate-400 mt-1">
                {isRunning ? 'In Deep Focus' : remainingSeconds === 0 ? 'Session Complete' : 'Ready'}
              </span>
            </div>
          </div>

          {/* Primary Play / Pause / Reset Controls */}
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => setIsRunning((prev) => !prev)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer min-h-[42px]"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Focus</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRunning(false);
                setRemainingSeconds(totalSeconds);
              }}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer min-h-[42px]"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional Link to Task or Learning Plan for Automatic Logging */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Complete Task on Finish (Optional)
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => {
                setSelectedTaskId(e.target.value);
                const t = activeTasks.find((tsk) => tsk.id === e.target.value);
                if (t) {
                  setSessionTitle(t.title);
                  if (t.estimatedMinutes) setPresetMinutes(t.estimatedMinutes);
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            >
              <option value="">None</option>
              {activeTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.estimatedMinutes}m)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-emerald-400" />
              <span>Log Study Hours to Learning</span>
            </label>
            <select
              value={selectedLearningId}
              onChange={(e) => setSelectedLearningId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            >
              <option value="">None</option>
              {activeLearning.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} ({l.totalHoursLogged}/{l.targetHours}h)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Complete & Sync to Firestore */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCompleteAndLog}
            disabled={isLogging}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[42px]"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {isLogging ? 'Logging to Firestore...' : 'Complete Block & Log Session to LIFE OS'}
            </span>
          </button>
        </div>
        </div>
      </motion.div>
    </div>
  );
};
