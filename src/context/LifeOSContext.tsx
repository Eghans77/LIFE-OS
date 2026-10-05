import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import {
  auth,
  db,
  ensureUserProfile,
  signInGuestUser,
  handleFirestoreError,
  OperationType,
  createTaskRecord,
  updateTaskRecord,
  toggleTaskRecord,
  rescheduleTaskRecord,
  deleteTaskRecord,
  createProjectRecord,
  updateProjectRecord,
  deleteProjectRecord,
  createGoalRecord,
  updateGoalRecord,
  deleteGoalRecord,
  createEventRecord,
  updateEventRecord,
  deleteEventRecord,
  createNoteRecord,
  updateNoteRecord,
  deleteNoteRecord,
  createHabitRecord,
  toggleHabitDateRecord,
  deleteHabitRecord,
  createLearningRecord,
  logStudySessionRecord,
  deleteLearningRecord,
  createTransactionRecord,
  deleteTransactionRecord,
  saveDailyPlanRecord,
  deleteDailyPlanRecord,
} from '../lib/firebase';
import {
  ModuleId,
  UserProfile,
  Task,
  Project,
  Goal,
  CalendarEvent,
  Note,
  Habit,
  LearningItem,
  FinanceTransaction,
  DailyPlan,
  AIActionProposal,
  NotificationItem,
} from '../types/lifeos';

interface LifeOSContextValue {
  user: User | null;
  authReady: boolean;
  dataLoading: boolean;
  hasPendingWrites: boolean;
  activeModule: ModuleId;
  setActiveModule: (mod: ModuleId) => void;
  selectedDate: string;
  setSelectedDate: (dateStr: string) => void;
  profile: UserProfile | null;
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  events: CalendarEvent[];
  notes: Note[];
  habits: Habit[];
  learning: LearningItem[];
  transactions: FinanceTransaction[];
  dailyPlans: DailyPlan[];
  todayPlan: DailyPlan | null;
  notifications: NotificationItem[];
  isQuietHoursActive: boolean;
  isAIModalOpen: boolean;
  setIsAIModalOpen: (open: boolean) => void;
  aiInitialPrompt: string;
  openAIWithPrompt: (promptText?: string) => void;
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  quickAddDefaultTab: 'task' | 'note' | 'event' | 'project' | 'goal' | 'finance' | 'habit' | 'learning';
  openQuickAdd: (tab?: 'task' | 'note' | 'event' | 'project' | 'goal' | 'finance' | 'habit' | 'learning') => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isFocusTimerOpen: boolean;
  setIsFocusTimerOpen: (open: boolean) => void;
  focusInitialTitle: string;
  focusInitialMinutes: number;
  openFocusTimer: (title?: string, minutes?: number) => void;
  executeAIAction: (action: AIActionProposal) => Promise<void>;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const LifeOSContext = createContext<LifeOSContextValue | undefined>(undefined);

export function getTodayIsoString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const LifeOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoString);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [learning, setLearning] = useState<LearningItem[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([]);

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddDefaultTab, setQuickAddDefaultTab] = useState<
    'task' | 'note' | 'event' | 'project' | 'goal' | 'finance' | 'habit' | 'learning'
  >('task');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFocusTimerOpen, setIsFocusTimerOpen] = useState(false);
  const [focusInitialTitle, setFocusInitialTitle] = useState('Deep Focus Session');
  const [focusInitialMinutes, setFocusInitialMinutes] = useState(45);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  const openAIWithPrompt = useCallback((promptText = '') => {
    setAiInitialPrompt(promptText);
    setIsAIModalOpen(true);
  }, []);

  const openQuickAdd = useCallback(
    (
      tab: 'task' | 'note' | 'event' | 'project' | 'goal' | 'finance' | 'habit' | 'learning' = 'task'
    ) => {
      setQuickAddDefaultTab(tab);
      setIsQuickAddOpen(true);
    },
    []
  );

  const openFocusTimer = useCallback((title = 'Deep Focus Session', minutes = 45) => {
    setFocusInitialTitle(title);
    setFocusInitialMinutes(minutes);
    setIsFocusTimerOpen(true);
  }, []);

  // Global keyboard shortcut Cmd/Ctrl + K for Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auth state listener: Instant Zero-Friction Access (No manual login required)
  useEffect(() => {
    let isMounted = true;
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        try {
          await signInGuestUser();
        } catch (err) {
          console.error('Instant guest authentication error:', err);
          if (isMounted) setAuthReady(true);
        }
        return;
      }

      if (!isMounted) return;
      setUser(currentUser);
      setAuthReady(true);

      try {
        await ensureUserProfile(
          currentUser.uid,
          currentUser.email || 'eghans@lifeos.app',
          currentUser.displayName || 'Eghans',
          currentUser.photoURL || ''
        );
      } catch (err) {
        console.error('Profile initialization error:', err);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Apply light/dark theme preference to documentElement
  useEffect(() => {
    const root = document.documentElement;
    const theme = profile?.theme || 'dark';
    if (theme === 'light') {
      root.classList.remove('dark');
      document.body.className =
        'bg-slate-50 text-slate-900 antialiased selection:bg-emerald-500/20 selection:text-emerald-900';
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        document.body.className =
          'bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200';
      } else {
        root.classList.remove('dark');
        document.body.className =
          'bg-slate-50 text-slate-900 antialiased selection:bg-emerald-500/20 selection:text-emerald-900';
      }
    } else {
      root.classList.add('dark');
      document.body.className =
        'bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200';
    }
  }, [profile?.theme]);

  // Firestore real-time listeners (ONLY when authReady && user is authenticated)
  useEffect(() => {
    if (!authReady || !user) return;
    setDataLoading(true);
    const uid = user.uid;

    const unsubUser = onSnapshot(
      doc(db, 'users', uid),
      { includeMetadataChanges: true },
      (snap) => {
        setHasPendingWrites(snap.metadata.hasPendingWrites);
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
    );

    const unsubTasks = onSnapshot(
      query(collection(db, 'tasks'), where('userId', '==', uid)),
      { includeMetadataChanges: true },
      (snap) => {
        setHasPendingWrites(snap.metadata.hasPendingWrites);
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }));
        list.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
        setTasks(list);
        setDataLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'tasks')
    );

    const unsubProjects = onSnapshot(
      query(collection(db, 'projects'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, 'id'>) }));
        setProjects(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'projects')
    );

    const unsubGoals = onSnapshot(
      query(collection(db, 'goals'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Goal, 'id'>) }));
        setGoals(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'goals')
    );

    const unsubEvents = onSnapshot(
      query(collection(db, 'events'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CalendarEvent, 'id'>),
        }));
        list.sort((a, b) => `${a.date}_${a.startTime}`.localeCompare(`${b.date}_${b.startTime}`));
        setEvents(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'events')
    );

    const unsubNotes = onSnapshot(
      query(collection(db, 'notes'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Note, 'id'>) }));
        list.sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
        setNotes(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notes')
    );

    const unsubHabits = onSnapshot(
      query(collection(db, 'habits'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Habit, 'id'>) }));
        setHabits(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'habits')
    );

    const unsubLearning = onSnapshot(
      query(collection(db, 'learning'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<LearningItem, 'id'>),
        }));
        setLearning(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'learning')
    );

    const unsubTransactions = onSnapshot(
      query(collection(db, 'transactions'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FinanceTransaction, 'id'>),
        }));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setTransactions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
    );

    const unsubPlans = onSnapshot(
      query(collection(db, 'dailyPlans'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DailyPlan, 'id'>) }));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setDailyPlans(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'dailyPlans')
    );

    return () => {
      unsubUser();
      unsubTasks();
      unsubProjects();
      unsubGoals();
      unsubEvents();
      unsubNotes();
      unsubHabits();
      unsubLearning();
      unsubTransactions();
      unsubPlans();
    };
  }, [authReady, user]);

  const todayStr = getTodayIsoString();

  const todayPlan = useMemo(() => {
    return dailyPlans.find((p) => p.date === selectedDate) || null;
  }, [dailyPlans, selectedDate]);

  const isQuietHoursActive = useMemo(() => {
    if (!profile) return false;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const start = profile.quietHoursStart || '22:00';
    const end = profile.quietHoursEnd || '07:00';
    if (start > end) {
      return hhmm >= start || hhmm < end;
    }
    return hhmm >= start && hhmm < end;
  }, [profile]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    if (!todayPlan) {
      items.push({
        id: 'notif_daily_plan',
        title: 'Daily Planning Session Ready',
        detail: 'Tell the AI Assistant what your day looks like to generate a realistic schedule.',
        category: 'planning',
        timeLabel: profile?.dailyPlanningTime || '08:00',
        severity: 'normal',
        targetModule: 'daily_planning',
      });
    } else if (todayPlan.isOverloaded) {
      items.push({
        id: 'notif_overloaded',
        title: 'Overloaded Schedule Detected',
        detail:
          todayPlan.overloadMessage ||
          'More tasks than available hours today. Review AI prioritization.',
        category: 'ai',
        timeLabel: 'Today',
        severity: 'warning',
        targetModule: 'daily_planning',
      });
    }

    // Upcoming events today
    events
      .filter((e) => e.date === todayStr)
      .forEach((evt) => {
        items.push({
          id: `notif_evt_${evt.id}`,
          title: evt.isFixed ? `Fixed Commitment: ${evt.title}` : `Event: ${evt.title}`,
          detail: `${evt.startTime} – ${evt.endTime}${evt.location ? ` · ${evt.location}` : ''}`,
          category: 'event',
          timeLabel: evt.startTime,
          severity: evt.isFixed ? 'urgent' : 'normal',
          targetModule: 'calendar',
        });
      });

    // Urgent or due-today incomplete tasks
    tasks
      .filter((t) => !t.isCompleted && (t.dueDate <= todayStr || t.priority === 'urgent'))
      .slice(0, 5)
      .forEach((tsk) => {
        items.push({
          id: `notif_tsk_${tsk.id}`,
          title: `Task Due: ${tsk.title}`,
          detail: `${tsk.priority.toUpperCase()} priority · ${tsk.estimatedMinutes} min est.`,
          category: 'deadline',
          timeLabel: tsk.scheduledTime || tsk.dueDate || 'Today',
          severity: tsk.priority === 'urgent' ? 'urgent' : 'warning',
          targetModule: 'tasks',
        });
      });

    // Unlogged daily habits
    const unloggedHabits = habits.filter(
      (h) => h.frequency === 'daily' && !h.completedDates.includes(todayStr)
    );
    if (unloggedHabits.length > 0) {
      items.push({
        id: 'notif_habits',
        title: `${unloggedHabits.length} Daily Habit${unloggedHabits.length > 1 ? 's' : ''} Pending`,
        detail: unloggedHabits.map((h) => h.title).join(', '),
        category: 'habit',
        timeLabel: 'Today',
        severity: 'normal',
        targetModule: 'habits',
      });
    }

    return items;
  }, [todayPlan, events, tasks, habits, todayStr, profile]);

  // Controlled Backend AI Action Executor (validates user ownership and schema)
  const executeAIAction = useCallback(
    async (action: AIActionProposal) => {
      if (!user) throw new Error('Authentication required');
      const uid = user.uid;
      const p = action.payload || {};

      const validProjectId =
        p.projectId && projects.some((pr) => pr.id === String(p.projectId))
          ? String(p.projectId)
          : '';
      const validGoalId =
        p.goalId && goals.some((g) => g.id === String(p.goalId)) ? String(p.goalId) : '';
      const validLinkedGoalId =
        p.linkedGoalId && goals.some((g) => g.id === String(p.linkedGoalId))
          ? String(p.linkedGoalId)
          : '';
      const validTaskId =
        p.taskId && tasks.some((t) => t.id === String(p.taskId)) ? String(p.taskId) : '';

      switch (action.actionType) {
        case 'createTask': {
          await createTaskRecord(uid, {
            title: String(p.title || action.summary || 'New Task'),
            description: String(p.description || ''),
            priority: (p.priority as Task['priority']) || 'medium',
            dueDate: String(p.dueDate || selectedDate),
            scheduledTime: String(p.scheduledTime || ''),
            category: String(p.category || 'General'),
            estimatedMinutes: Number(p.estimatedMinutes || 45),
            activityType: (p.activityType as Task['activityType']) || 'task',
            projectId: validProjectId,
            goalId: validGoalId,
          });
          showToast(`Task created: ${p.title || action.summary}`);
          break;
        }
        case 'completeTask': {
          const target =
            tasks.find((t) => t.id === action.targetId) ||
            tasks.find(
              (t) =>
                p.title && t.title.toLowerCase().includes(String(p.title).toLowerCase())
            );
          if (target) {
            await toggleTaskRecord(target.id, true);
            showToast(`Completed task: ${target.title}`);
          }
          break;
        }
        case 'rescheduleTask': {
          const target =
            tasks.find((t) => t.id === action.targetId) ||
            tasks.find(
              (t) =>
                p.title && t.title.toLowerCase().includes(String(p.title).toLowerCase())
            );
          if (target) {
            await rescheduleTaskRecord(
              target.id,
              String(p.dueDate || target.dueDate),
              String(p.scheduledTime ?? target.scheduledTime),
              Number(p.estimatedMinutes ?? target.estimatedMinutes),
              (p.activityType as Task['activityType']) || target.activityType
            );
            showToast(`Rescheduled: ${target.title}`);
          }
          break;
        }
        case 'updateTask': {
          const target =
            tasks.find((t) => t.id === action.targetId) ||
            tasks.find(
              (t) =>
                p.title && t.title.toLowerCase().includes(String(p.title).toLowerCase())
            );
          if (target) {
            await updateTaskRecord(target.id, target, p as Partial<Task>);
            showToast(`Updated task: ${target.title}`);
          }
          break;
        }
        case 'deleteTask': {
          const target =
            tasks.find((t) => t.id === action.targetId) ||
            tasks.find(
              (t) =>
                p.title && t.title.toLowerCase().includes(String(p.title).toLowerCase())
            );
          if (target) {
            await deleteTaskRecord(target.id);
            showToast(`Deleted task: ${target.title}`);
          }
          break;
        }
        case 'createEvent': {
          await createEventRecord(uid, {
            title: String(p.title || action.summary || 'New Event'),
            description: String(p.description || ''),
            date: String(p.date || selectedDate),
            startTime: String(p.startTime || '09:00'),
            endTime: String(p.endTime || '10:00'),
            eventType: (p.eventType as CalendarEvent['eventType']) || 'event',
            location: String(p.location || ''),
            notes: String(p.notes || ''),
            projectId: validProjectId,
            taskId: validTaskId,
            isFixed: Boolean(p.isFixed ?? p.eventType === 'fixed_commitment'),
          });
          showToast(`Event scheduled: ${p.title || action.summary}`);
          break;
        }
        case 'updateEvent': {
          const target = events.find((e) => e.id === action.targetId);
          if (target) {
            await updateEventRecord(target.id, target, p as Partial<CalendarEvent>);
            showToast(`Updated event: ${target.title}`);
          }
          break;
        }
        case 'deleteEvent': {
          const target = events.find((e) => e.id === action.targetId);
          if (target) {
            await deleteEventRecord(target.id);
            showToast(`Deleted event: ${target.title}`);
          }
          break;
        }
        case 'createNote': {
          await createNoteRecord(uid, {
            title: String(p.title || action.summary || 'Quick Note'),
            content: String(p.content || p.description || ''),
            category: String(p.category || 'Ideas'),
            tags: Array.isArray(p.tags) ? (p.tags as string[]) : ['ai-captured'],
            isPinned: Boolean(p.isPinned),
          });
          showToast(`Saved note: ${p.title || action.summary}`);
          break;
        }
        case 'updateNote': {
          const target = notes.find((n) => n.id === action.targetId);
          if (target) {
            await updateNoteRecord(target.id, target, p as Partial<Note>);
            showToast(`Updated note: ${target.title}`);
          }
          break;
        }
        case 'createProject': {
          await createProjectRecord(uid, {
            name: String(p.name || p.title || action.summary || 'New Project'),
            description: String(p.description || ''),
            status: (p.status as Project['status']) || 'active',
            priority: (p.priority as Project['priority']) || 'medium',
            startDate: String(p.startDate || selectedDate),
            deadline: String(p.deadline || ''),
            category: String(p.category || 'Work'),
          });
          showToast(`Created project: ${p.name || p.title || action.summary}`);
          break;
        }
        case 'updateProject': {
          const target = projects.find((pr) => pr.id === action.targetId);
          if (target) {
            await updateProjectRecord(target.id, target, p as Partial<Project>);
            showToast(`Updated project: ${target.name}`);
          }
          break;
        }
        case 'deleteProject': {
          const target = projects.find((pr) => pr.id === action.targetId);
          if (target) {
            await deleteProjectRecord(target.id);
            showToast(`Deleted project: ${target.name}`);
          }
          break;
        }
        case 'createGoal': {
          await createGoalRecord(uid, {
            title: String(p.title || action.summary || 'New Goal'),
            description: String(p.description || ''),
            category: String(p.category || 'Personal Growth'),
            deadline: String(p.deadline || ''),
            milestones: Array.isArray(p.milestones) ? (p.milestones as string[]) : [],
            targetMetric: String(p.targetMetric || '100% completion'),
          });
          showToast(`Created goal: ${p.title || action.summary}`);
          break;
        }
        case 'updateGoal': {
          const target = goals.find((g) => g.id === action.targetId);
          if (target) {
            await updateGoalRecord(target.id, target, p as Partial<Goal>);
            showToast(`Updated goal: ${target.title}`);
          }
          break;
        }
        case 'createHabit': {
          await createHabitRecord(uid, {
            title: String(p.title || action.summary || 'New Habit'),
            description: String(p.description || ''),
            category: String(p.category || 'Daily Routine'),
            frequency: (p.frequency as Habit['frequency']) || 'daily',
            linkedGoalId: validLinkedGoalId,
          });
          showToast(`Created habit: ${p.title || action.summary}`);
          break;
        }
        case 'logHabit': {
          const target =
            habits.find((h) => h.id === action.targetId) ||
            habits.find(
              (h) =>
                p.title && h.title.toLowerCase().includes(String(p.title).toLowerCase())
            );
          if (target && !target.completedDates.includes(todayStr)) {
            await toggleHabitDateRecord(target, todayStr);
            showToast(`Logged habit: ${target.title}`);
          }
          break;
        }
        case 'createLearningItem': {
          await createLearningRecord(uid, {
            title: String(p.title || action.summary || 'New Learning Topic'),
            itemType: (p.itemType as LearningItem['itemType']) || 'skill',
            category: String(p.category || 'Learning'),
            targetHours: Number(p.targetHours || 40),
            notes: String(p.notes || p.description || ''),
            linkedGoalId: validLinkedGoalId,
          });
          showToast(`Added learning topic: ${p.title || action.summary}`);
          break;
        }
        case 'createDailyPlan':
        case 'updateDailyPlan': {
          const planDate = String(p.date || selectedDate);
          const existingPlan = dailyPlans.find((dp) => dp.date === planDate);
          await saveDailyPlanRecord(
            uid,
            planDate,
            {
              status: 'active',
              userInput: String(p.userInput || action.summary || ''),
              aiSummary: String(p.aiSummary || action.summary || ''),
              isOverloaded: Boolean(p.isOverloaded),
              overloadMessage: String(p.overloadMessage || ''),
              blocks: Array.isArray(p.blocks) ? (p.blocks as DailyPlan['blocks']) : [],
              priorities: Array.isArray(p.priorities) ? (p.priorities as string[]) : [],
            },
            existingPlan?.id
          );
          showToast('Daily schedule synced to your Dashboard.');
          break;
        }
        case 'createTransaction': {
          await createTransactionRecord(uid, {
            title: String(p.title || action.summary || 'Transaction'),
            amount: Number(p.amount || 10),
            transactionType:
              (p.transactionType as FinanceTransaction['transactionType']) || 'expense',
            category: String(p.category || 'General'),
            date: String(p.date || todayStr),
            notes: String(p.notes || ''),
          });
          showToast(`Recorded ${p.transactionType || 'expense'}: ${p.title || action.summary}`);
          break;
        }
        default:
          showToast(`Action processed: ${action.summary}`);
      }
    },
    [
      user,
      tasks,
      events,
      notes,
      projects,
      goals,
      habits,
      dailyPlans,
      selectedDate,
      todayStr,
      showToast,
    ]
  );

  // Automatically purge any previously seeded demo records from Firestore once
  useEffect(() => {
    if (!authReady || !user || dataLoading) return;
    const purgeKey = `lifeos_demo_purged_${user.uid}`;
    if (localStorage.getItem(purgeKey)) return;

    const demoTaskTitles = new Set([
      'Finish church poster before 4 PM',
      'Study JavaScript & TypeScript for 2 hours',
      'Edit ministry highlight video',
      'Call my sister',
    ]);
    const demoProjectNames = new Set([
      'JavaScript & TypeScript Learning Plan',
      'Sunday Service & Media Deliverables',
    ]);
    const demoGoalTitles = new Set([
      'Master Full-Stack TypeScript & AI Architecture',
      'Creative Ministry & Media Production',
    ]);
    const demoEventTitles = new Set(['Church Evening Service', 'Poster Print Deadline']);
    const demoNoteTitles = new Set([
      'JavaScript Async & Event Loop Architecture',
      'Church Poster Visual Direction',
    ]);
    const demoHabitTitles = new Set([
      'Morning Prayer & Scripture Reflection',
      'Deep Coding Session (2 Hours)',
      'Physical Exercise & Mobility',
    ]);
    const demoLearningTitles = new Set(['Full-Stack JavaScript & TypeScript Curriculum']);
    const demoTxTitles = new Set([
      'Creative Design Retainer & Project Income',
      'High-Speed Cloud & Software Subscriptions',
      'Automated Transfer to Studio Reserve',
    ]);

    const hasDemoData =
      tasks.some((t) => demoTaskTitles.has(t.title)) ||
      projects.some((p) => demoProjectNames.has(p.name)) ||
      goals.some((g) => demoGoalTitles.has(g.title)) ||
      events.some((e) => demoEventTitles.has(e.title)) ||
      notes.some((n) => demoNoteTitles.has(n.title)) ||
      habits.some((h) => demoHabitTitles.has(h.title)) ||
      learning.some((l) => demoLearningTitles.has(l.title)) ||
      transactions.some((tx) => demoTxTitles.has(tx.title)) ||
      dailyPlans.some((dp) => dp.userInput.includes('finish a church poster before 4 PM'));

    localStorage.setItem(purgeKey, 'true');
    if (!hasDemoData) return;

    void (async () => {
      try {
        for (const t of tasks) {
          if (demoTaskTitles.has(t.title)) await deleteTaskRecord(t.id);
        }
        for (const e of events) {
          if (demoEventTitles.has(e.title)) await deleteEventRecord(e.id);
        }
        for (const n of notes) {
          if (demoNoteTitles.has(n.title)) await deleteNoteRecord(n.id);
        }
        for (const h of habits) {
          if (demoHabitTitles.has(h.title)) await deleteHabitRecord(h.id);
        }
        for (const l of learning) {
          if (demoLearningTitles.has(l.title)) await deleteLearningRecord(l.id);
        }
        for (const tx of transactions) {
          if (demoTxTitles.has(tx.title)) await deleteTransactionRecord(tx.id);
        }
        for (const p of projects) {
          if (demoProjectNames.has(p.name)) await deleteProjectRecord(p.id);
        }
        for (const g of goals) {
          if (demoGoalTitles.has(g.title)) await deleteGoalRecord(g.id);
        }
        for (const dp of dailyPlans) {
          if (dp.userInput.includes('finish a church poster before 4 PM')) {
            await deleteDailyPlanRecord(dp.id);
          }
        }
      } catch (err) {
        console.error('Demo cleanup error:', err);
      }
    })();
  }, [
    authReady,
    user,
    dataLoading,
    tasks,
    projects,
    goals,
    events,
    notes,
    habits,
    learning,
    transactions,
    dailyPlans,
  ]);

  const value = useMemo<LifeOSContextValue>(
    () => ({
      user,
      authReady,
      dataLoading,
      hasPendingWrites,
      activeModule,
      setActiveModule,
      selectedDate,
      setSelectedDate,
      profile,
      tasks,
      projects,
      goals,
      events,
      notes,
      habits,
      learning,
      transactions,
      dailyPlans,
      todayPlan,
      notifications,
      isQuietHoursActive,
      isAIModalOpen,
      setIsAIModalOpen,
      aiInitialPrompt,
      openAIWithPrompt,
      isQuickAddOpen,
      setIsQuickAddOpen,
      quickAddDefaultTab,
      openQuickAdd,
      isSearchOpen,
      setIsSearchOpen,
      isFocusTimerOpen,
      setIsFocusTimerOpen,
      focusInitialTitle,
      focusInitialMinutes,
      openFocusTimer,
      executeAIAction,
      toastMessage,
      showToast,
    }),
    [
      user,
      authReady,
      dataLoading,
      hasPendingWrites,
      activeModule,
      selectedDate,
      profile,
      tasks,
      projects,
      goals,
      events,
      notes,
      habits,
      learning,
      transactions,
      dailyPlans,
      todayPlan,
      notifications,
      isQuietHoursActive,
      isAIModalOpen,
      aiInitialPrompt,
      openAIWithPrompt,
      isQuickAddOpen,
      quickAddDefaultTab,
      openQuickAdd,
      isSearchOpen,
      isFocusTimerOpen,
      focusInitialTitle,
      focusInitialMinutes,
      openFocusTimer,
      executeAIAction,
      toastMessage,
      showToast,
    ]
  );

  return <LifeOSContext.Provider value={value}>{children}</LifeOSContext.Provider>;
};

export function useLifeOS(): LifeOSContextValue {
  const ctx = useContext(LifeOSContext);
  if (!ctx) {
    throw new Error('useLifeOS must be used within a LifeOSProvider');
  }
  return ctx;
}
