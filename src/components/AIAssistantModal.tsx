import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Send,
  X,
  Check,
  RefreshCw,
  AlertTriangle,
  Plus,
  Trash2,
  Edit3,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLifeOS } from '../context/LifeOSContext';
import { saveDailyPlanRecord } from '../lib/firebase';
import {
  AIAssistantResponse,
  ScheduleBlock,
  AIActionProposal,
} from '../types/lifeos';
import focusFlowBanner from '../assets/images/focus_flow_banner_1790884401370.jpg';

interface AIAssistantPanelProps {
  embedded?: boolean;
  onClose?: () => void;
}

const SAMPLE_PROMPTS = [
  'What should I work on right now?',
  "What's left for today?",
  'Push my current activity by 30 minutes and reorganize the rest of my day.',
  "I can't finish everything today. Help me prioritize.",
  'Plan tomorrow for me.',
  'What am I behind on?',
];

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  embedded = false,
  onClose,
}) => {
  const {
    user,
    profile,
    selectedDate,
    tasks,
    projects,
    goals,
    events,
    habits,
    learning,
    notes,
    todayPlan,
    aiInitialPrompt,
    executeAIAction,
    showToast,
    setActiveModule,
  } = useLifeOS();

  const [input, setInput] = useState(aiInitialPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [response, setResponse] = useState<AIAssistantResponse | null>(null);

  // User-editable proposed schedule blocks before accepting
  const [editableBlocks, setEditableBlocks] = useState<ScheduleBlock[]>([]);
  const [editablePriorities, setEditablePriorities] = useState<string[]>([]);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [executedActionIds, setExecutedActionIds] = useState<Record<string, boolean>>({});
  const [confirmingActionId, setConfirmingActionId] = useState<string | null>(null);
  const [planSaved, setPlanSaved] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const autoSubmittedPromptRef = useRef<string>('');

  useEffect(() => {
    if (aiInitialPrompt && aiInitialPrompt.trim() && aiInitialPrompt !== autoSubmittedPromptRef.current) {
      autoSubmittedPromptRef.current = aiInitialPrompt;
      setInput(aiInitialPrompt);
      void submitToAssistant(aiInitialPrompt);
    }
  }, [aiInitialPrompt]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (audioBlob.size === 0) return;

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = String(reader.result || '').split(',')[1];
            if (!base64Data || !user) {
              setIsTranscribing(false);
              return;
            }
            const res = await fetch('/api/ai/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.uid,
                audioBase64: base64Data,
                mimeType: audioBlob.type || 'audio/webm',
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || 'Voice transcription failed');
            }
            if (data.transcript) {
              setInput((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
              showToast('Voice transcribed accurately.');
            }
            setIsTranscribing(false);
          };
        } catch (err) {
          setIsTranscribing(false);
          setErrorMsg(err instanceof Error ? err.message : 'Could not transcribe voice input.');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setErrorMsg(
        'Microphone access was denied or unavailable. Please check your browser permissions.'
      );
    }
  };

  const submitToAssistant = async (promptToSend?: string) => {
    const messageText = (promptToSend ?? input).trim();
    if (!messageText || !user) return;

    setIsLoading(true);
    setErrorMsg(null);
    setPlanSaved(false);

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          message: messageText,
          currentDate: selectedDate,
          currentTime,
          preferences: {
            timeFormat: profile?.timeFormat || '24h',
            assistantTone: profile?.assistantTone || 'calm',
            defaultTaskMinutes: profile?.defaultTaskMinutes || 45,
          },
          context: {
            existingTodayPlan: todayPlan
              ? {
                  date: todayPlan.date,
                  priorities: todayPlan.priorities,
                  blocks: todayPlan.blocks,
                }
              : null,
            activeTasks: tasks
              .filter((t) => !t.isCompleted)
              .slice(0, 20)
              .map((t) => ({
                id: t.id,
                title: t.title,
                priority: t.priority,
                dueDate: t.dueDate,
                scheduledTime: t.scheduledTime,
                estimatedMinutes: t.estimatedMinutes,
                activityType: t.activityType,
                projectId: t.projectId,
                goalId: t.goalId,
              })),
            activeProjects: projects
              .filter((p) => p.status === 'active' || p.status === 'planning')
              .slice(0, 10)
              .map((p) => ({
                id: p.id,
                name: p.name,
                priority: p.priority,
                deadline: p.deadline,
                progress: p.progress,
              })),
            activeGoals: goals
              .filter((g) => g.status === 'active')
              .slice(0, 10)
              .map((g) => ({
                id: g.id,
                title: g.title,
                deadline: g.deadline,
                progress: g.progress,
              })),
            calendarEvents: events
              .filter((e) => e.date >= selectedDate)
              .slice(0, 15)
              .map((e) => ({
                id: e.id,
                title: e.title,
                date: e.date,
                startTime: e.startTime,
                endTime: e.endTime,
                eventType: e.eventType,
                isFixed: e.isFixed,
              })),
            habits: habits.slice(0, 10).map((h) => ({
              id: h.id,
              title: h.title,
              frequency: h.frequency,
              currentStreak: h.currentStreak,
            })),
            learningPlans: learning
              .filter((l) => l.status === 'active')
              .slice(0, 8)
              .map((l) => ({
                id: l.id,
                title: l.title,
                progress: l.progress,
                totalHoursLogged: l.totalHoursLogged,
                targetHours: l.targetHours,
              })),
            pinnedNotes: notes
              .filter((n) => n.isPinned && !n.isArchived)
              .slice(0, 5)
              .map((n) => ({
                id: n.id,
                title: n.title,
                category: n.category,
              })),
          },
        }),
      });

      const data: AIAssistantResponse & { error?: string } = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI Assistant could not complete the request.');
      }

      setResponse(data);
      if (data.proposedPlan) {
        const blocksToSave = data.proposedPlan.blocks || [];
        const prioritiesToSave = data.proposedPlan.priorities || [];
        setEditableBlocks(blocksToSave);
        setEditablePriorities(prioritiesToSave);

        // Automatically persist the AI-generated Daily Plan to Firestore so Dashboard updates immediately
        try {
          const targetDate = data.proposedPlan.date || selectedDate;
          await saveDailyPlanRecord(
            user.uid,
            targetDate,
            {
              status: 'active',
              userInput: messageText,
              aiSummary: data.proposedPlan.aiSummary || data.reply,
              isOverloaded: Boolean(data.isOverloaded || data.proposedPlan.isOverloaded),
              overloadMessage:
                data.overloadMessage || data.proposedPlan.overloadMessage || '',
              blocks: blocksToSave,
              priorities: prioritiesToSave,
            },
            targetDate === selectedDate ? todayPlan?.id : undefined
          );
          setPlanSaved(true);
        } catch (planErr) {
          console.error('Auto-save daily plan error:', planErr);
        }
      } else {
        setEditableBlocks([]);
        setEditablePriorities([]);
      }

      // Automatically execute all non-destructive / low-risk actions in Firestore
      const nextExecuted: Record<string, boolean> = {};
      if (Array.isArray(data.actions) && data.actions.length > 0) {
        for (const act of data.actions) {
          if (!act.requiresConfirmation && act.riskLevel !== 'high') {
            try {
              await executeAIAction(act);
              nextExecuted[act.id] = true;
            } catch (actErr) {
              console.error('Auto-execute AI action error:', actErr);
            }
          }
        }
      }
      setExecutedActionIds(nextExecuted);
      showToast('AI Plan & actions synced to your LIFE OS workspace.');
    } catch (err) {
      let rawMsg =
        err instanceof Error
          ? err.message
          : 'Network or AI error. Check your internet connection and try again.';
      try {
        if (rawMsg.startsWith('{') && rawMsg.includes('"error"')) {
          const parsed = JSON.parse(rawMsg);
          if (parsed?.error?.message) {
            rawMsg = parsed.error.message;
          }
        }
      } catch {
        // Use rawMsg
      }

      if (
        rawMsg.includes('503') ||
        rawMsg.includes('high demand') ||
        rawMsg.includes('UNAVAILABLE')
      ) {
        rawMsg =
          'The AI model experienced a temporary spike in demand. Automatic fallback was activated.';
      }

      setErrorMsg(rawMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptPlan = async () => {
    if (!user || !response?.proposedPlan) return;
    try {
      const targetDate = response.proposedPlan.date || selectedDate;
      await saveDailyPlanRecord(
        user.uid,
        targetDate,
        {
          status: 'active',
          userInput: input,
          aiSummary: response.proposedPlan.aiSummary || response.reply,
          isOverloaded: response.isOverloaded || response.proposedPlan.isOverloaded,
          overloadMessage:
            response.overloadMessage || response.proposedPlan.overloadMessage || '',
          blocks: editableBlocks,
          priorities: editablePriorities,
        },
        targetDate === selectedDate ? todayPlan?.id : undefined
      );
      setPlanSaved(true);
      showToast('Daily Plan accepted and synced to your Dashboard.');
    } catch {
      setErrorMsg('Failed to save Daily Plan to Firestore.');
    }
  };

  const handleExecuteSingleAction = async (action: AIActionProposal) => {
    if (action.requiresConfirmation && confirmingActionId !== action.id) {
      setConfirmingActionId(action.id);
      return;
    }
    try {
      await executeAIAction(action);
      setExecutedActionIds((prev) => ({ ...prev, [action.id]: true }));
      setConfirmingActionId(null);
    } catch {
      setErrorMsg(`Could not execute action: ${action.summary}`);
    }
  };

  const handleExecuteAllLowRisk = async () => {
    if (!response?.actions) return;
    for (const act of response.actions) {
      if (!act.requiresConfirmation && act.riskLevel !== 'high' && !executedActionIds[act.id]) {
        await executeAIAction(act);
        setExecutedActionIds((prev) => ({ ...prev, [act.id]: true }));
      }
    }
  };

  const handleUpdateBlock = (idx: number, field: keyof ScheduleBlock, val: string) => {
    setEditableBlocks((prev) =>
      prev.map((blk, i) => (i === idx ? { ...blk, [field]: val } : blk))
    );
  };

  const handleRemoveBlock = (idx: number) => {
    setEditableBlocks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddBlock = () => {
    setEditableBlocks((prev) => [
      ...prev,
      {
        id: `blk_custom_${Date.now()}`,
        startTime: '15:00',
        endTime: '16:00',
        title: 'Focused Work Block',
        blockType: 'time_block',
        priority: 'medium',
        status: 'pending',
        notes: 'Added manually',
      },
    ]);
  };

  return (
    <div
      className={
        embedded
          ? 'space-y-6'
          : 'rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto'
      }
    >
      {/* Header with Atmospheric Twilight Flow Visual */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border border-slate-800/80 p-5 sm:p-6"
      >
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={focusFlowBanner}
            alt="AI Daily Planning Horizon"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/85 to-slate-950/75" />
        </div>

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-emerald-400">
              AI Personal Assistant · Daily Planning & Live Rescheduling
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-white mt-1">
              {getGreeting()}{' '}
              {profile?.displayName && profile.displayName !== 'Commander'
                ? profile.displayName
                : 'Eghans'}
              . What does your day look like?
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Speak naturally or type your tasks, deadlines, and fixed commitments. I will check your
              existing LIFE OS goals, projects, and calendar to create a realistic schedule.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Close assistant"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Natural Language Input & Voice Bar */}
      <div className="space-y-3">
        <div className="relative rounded-xl bg-slate-950 border border-slate-800 focus-within:border-emerald-500/70 transition-colors p-3">
          <textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Example: "I need to finish a church poster before 4 PM, study coding for two hours, edit a video, go to church at 6 and call my sister."'
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900">
            <div className="flex items-center gap-2">
              {profile?.voiceEnabled !== false && (
                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  disabled={isTranscribing || isLoading}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer min-h-[40px] ${
                    isRecording
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Recording</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isTranscribing ? 'Transcribing voice...' : 'Speak Naturally'}</span>
                    </>
                  )}
                </button>
              )}
              {input && (
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="px-2.5 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => submitToAssistant()}
              disabled={isLoading || isTranscribing || !input.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer min-h-[40px]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing & Planning...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Organize My Day</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Natural Language Prompts */}
        <div className="space-y-1.5">
          <p className="text-xs text-slate-400">Quick natural language prompts:</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInput(sample);
                  submitToAssistant(sample);
                }}
                disabled={isLoading}
                className="text-left px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors truncate max-w-xs sm:max-w-md"
              >
                &ldquo;{sample}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-800/60 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => submitToAssistant()}
              disabled={isLoading}
              className="px-3 py-1 rounded-lg bg-amber-700/60 hover:bg-amber-600 text-white font-medium cursor-pointer"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-amber-300 hover:text-white underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* AI Response Area */}
      {response && (
        <div className="space-y-6 pt-2 border-t border-slate-800">
          {/* Overloaded Day Recognition Warning */}
          {(response.isOverloaded || response.proposedPlan?.isOverloaded) && (
            <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-700/60 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-amber-200">
                  Overloaded Day Recognized — Realistic Prioritization Applied
                </h3>
                <p className="text-xs text-amber-100/90 leading-relaxed">
                  {response.overloadMessage ||
                    response.proposedPlan?.overloadMessage ||
                    "You have more work than available time today. I've protected your fixed commitments and top deadlines while moving flexible items to tomorrow."}
                </p>
              </div>
            </div>
          )}

          {/* Conversational AI Reply */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>LIFE OS Assistant Analysis</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{response.intentCategory}</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{response.reply}</p>
          </div>

          {/* Extracted Natural Language Classifications (Zero-Pill Unboxed Metadata) */}
          {response.extractedEntities && response.extractedEntities.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-300">
                Identified Activities & Commitments
              </h3>
              <div className="divide-y divide-slate-800/70 rounded-xl border border-slate-800 bg-slate-950/60">
                {response.extractedEntities.map((ent, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-medium text-white">{ent.title}</span>
                    <div className="flex items-center gap-2 text-slate-400 font-mono">
                      <span className="text-emerald-400">{ent.classification.replace('_', ' ')}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ent.timeInfo || `${ent.estimatedMinutes}m`}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ent.priority} priority</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proposed Realistic Daily Schedule */}
          {response.proposedPlan && editableBlocks.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Proposed Schedule for {response.proposedPlan.date || selectedDate}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {response.proposedPlan.aiSummary}
                  </p>
                </div>

                {/* User Control Bar: Accept, Edit, Regenerate, Reject */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingPlan((prev) => !prev)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors cursor-pointer min-h-[38px]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingPlan ? 'Done Editing' : 'Edit Plan'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => submitToAssistant()}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors cursor-pointer min-h-[38px]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditableBlocks([]);
                      showToast('Proposed schedule discarded.');
                    }}
                    className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-red-950/50 border border-slate-800 text-xs font-medium text-slate-400 hover:text-red-300 transition-colors cursor-pointer min-h-[38px]"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptPlan}
                    disabled={planSaved}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer min-h-[38px]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{planSaved ? 'Plan Active on Dashboard' : 'Accept Plan'}</span>
                  </button>
                </div>
              </div>

              {/* Top Priorities */}
              {editablePriorities.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-400">Today&apos;s Key Priorities:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {editablePriorities.map((prio, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200 flex items-center gap-2"
                      >
                        <span className="font-mono text-emerald-400 font-semibold">0{i + 1}.</span>
                        <span className="truncate">{prio}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Blocks Timeline */}
              <div className="divide-y divide-slate-800/70 border-t border-slate-800">
                {editableBlocks.map((blk, idx) => (
                  <div
                    key={blk.id || idx}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    {isEditingPlan ? (
                      <div className="flex flex-wrap items-center gap-2 w-full">
                        <input
                          type="text"
                          value={blk.startTime}
                          onChange={(e) => handleUpdateBlock(idx, 'startTime', e.target.value)}
                          className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-white"
                        />
                        <span className="text-slate-500">—</span>
                        <input
                          type="text"
                          value={blk.endTime}
                          onChange={(e) => handleUpdateBlock(idx, 'endTime', e.target.value)}
                          className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-white"
                        />
                        <input
                          type="text"
                          value={blk.title}
                          onChange={(e) => handleUpdateBlock(idx, 'title', e.target.value)}
                          className="flex-1 min-w-[180px] px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveBlock(idx)}
                          className="p-1.5 text-red-400 hover:text-red-300"
                          title="Remove block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start sm:items-center gap-3">
                          <span className="font-mono text-xs text-emerald-400 shrink-0 w-28">
                            {blk.startTime} — {blk.endTime}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-white">{blk.title}</p>
                            {blk.notes && (
                              <p className="text-xs text-slate-400 mt-0.5">{blk.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono shrink-0">
                          <span>{blk.blockType.replace('_', ' ')}</span>
                          <span aria-hidden="true">·</span>
                          <span>{blk.priority}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {isEditingPlan && (
                <button
                  type="button"
                  onClick={handleAddBlock}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-emerald-400 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Schedule Block</span>
                </button>
              )}

              {planSaved && (
                <div className="pt-2 flex items-center justify-between text-xs text-emerald-300">
                  <span>Your schedule is live on the Dashboard.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('dashboard');
                      if (onClose) onClose();
                    }}
                    className="underline font-semibold"
                  >
                    Go to Dashboard →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Controlled Backend Actions (Tasks, Events, Notes, Projects, Habits) */}
          {response.actions && response.actions.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Recommended LIFE OS Database Actions ({response.actions.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Low-risk creations can be applied immediately. Destructive or high-risk changes
                    require confirmation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExecuteAllLowRisk}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-emerald-400 transition-colors cursor-pointer"
                >
                  Apply All Low-Risk Actions
                </button>
              </div>

              <div className="divide-y divide-slate-800/70">
                {response.actions.map((act) => {
                  const isDone = Boolean(executedActionIds[act.id]);
                  const isConfirming = confirmingActionId === act.id;
                  return (
                    <div
                      key={act.id}
                      className="py-3 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-emerald-400">{act.actionType}</span>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span
                            className={
                              act.riskLevel === 'high' ? 'text-amber-400 font-medium' : 'text-slate-400'
                            }
                          >
                            {act.riskLevel === 'high'
                              ? 'High-Risk (Requires Confirmation)'
                              : 'Standard Action'}
                          </span>
                        </div>
                        <p className="text-sm text-white">{act.summary}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Applied
                          </span>
                        ) : isConfirming ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleExecuteSingleAction(act)}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Confirm Action
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingActionId(null)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleExecuteSingleAction(act)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-white transition-colors cursor-pointer"
                          >
                            {act.requiresConfirmation ? 'Review & Confirm' : 'Apply Action'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Existing Today's Plan Summary when no new response has been generated yet */}
      {!response && todayPlan && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active Daily Plan for {todayPlan.date}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{todayPlan.blocks.length} blocks scheduled</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{todayPlan.aiSummary}</p>
        </div>
      )}
    </div>
  );
};
