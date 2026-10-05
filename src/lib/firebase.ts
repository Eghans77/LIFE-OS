import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import {
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
  ScheduleBlock,
} from '../types/lifeos';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Mandatory connection validation on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to generate clean schema-compliant document IDs matching ^[a-zA-Z0-9_\-]+$
export function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

const cleanStr = (val: unknown, max: number, fallback = ''): string => {
  const s = typeof val === 'string' ? val.trim() : fallback;
  return s.slice(0, max);
};

const cleanOptId = (val: unknown): string => {
  if (typeof val !== 'string' || !val.trim()) return '';
  return val.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
};

const clampNum = (val: unknown, min: number, max: number, fallback: number): number => {
  const n = Number(val);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

// Authentication Actions
export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signInGuestUser() {
  return signInAnonymously(auth);
}

export async function registerWithEmail(email: string, password: string, displayName: string) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim().slice(0, 100) });
  }
  try {
    await sendEmailVerification(cred.user);
  } catch {
    // Ignore if verification email rate-limited
  }
  return cred;
}

export async function resetUserPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser() {
  return firebaseSignOut(auth);
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageRef = ref(storage, `users/${userId}/avatar_${Date.now()}_${safeName}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// 1. UserProfile CRUD
export async function ensureUserProfile(
  uid: string,
  email: string,
  displayName: string,
  photoUrl?: string
): Promise<UserProfile> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const existing = snap.data() as UserProfile;
      if (!existing.displayName || existing.displayName === 'Commander') {
        await updateDoc(doc(db, 'users', uid), {
          displayName: 'Eghans',
          updatedAt: serverTimestamp(),
        });
        return { ...existing, displayName: 'Eghans' };
      }
      return existing;
    }
    const resolvedName =
      displayName && displayName !== 'Commander' ? displayName : 'Eghans';
    const resolvedEmail =
      email && email.includes('@') ? email : 'eghans@lifeos.app';
    const newProfile: UserProfile = {
      userId: uid,
      email: cleanStr(resolvedEmail, 256, 'eghans@lifeos.app'),
      displayName: cleanStr(resolvedName, 100, 'Eghans'),
      bio: 'Personal Life Management Operating System',
      photoUrl: cleanStr(photoUrl || '', 1000, ''),
      timeFormat: '24h',
      dateFormat: 'YYYY-MM-DD',
      weekStart: 'monday',
      theme: 'dark',
      defaultTaskMinutes: 45,
      dailyPlanningTime: '08:00',
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      notificationsEnabled: true,
      voiceEnabled: true,
      assistantTone: 'calm',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', uid), newProfile);
    return newProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function saveUserProfilePreferences(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.displayName !== undefined)
      payload.displayName = cleanStr(updates.displayName, 100, 'Eghans');
    if (updates.bio !== undefined) payload.bio = cleanStr(updates.bio, 500, '');
    if (updates.photoUrl !== undefined) payload.photoUrl = cleanStr(updates.photoUrl, 1000, '');
    if (updates.timeFormat !== undefined) payload.timeFormat = updates.timeFormat;
    if (updates.dateFormat !== undefined) payload.dateFormat = updates.dateFormat;
    if (updates.weekStart !== undefined) payload.weekStart = updates.weekStart;
    if (updates.theme !== undefined) payload.theme = updates.theme;
    if (updates.defaultTaskMinutes !== undefined)
      payload.defaultTaskMinutes = clampNum(updates.defaultTaskMinutes, 5, 480, 45);
    if (updates.dailyPlanningTime !== undefined)
      payload.dailyPlanningTime = cleanStr(updates.dailyPlanningTime, 10, '08:00');
    if (updates.quietHoursStart !== undefined)
      payload.quietHoursStart = cleanStr(updates.quietHoursStart, 10, '22:00');
    if (updates.quietHoursEnd !== undefined)
      payload.quietHoursEnd = cleanStr(updates.quietHoursEnd, 10, '07:00');
    if (updates.notificationsEnabled !== undefined)
      payload.notificationsEnabled = Boolean(updates.notificationsEnabled);
    if (updates.voiceEnabled !== undefined) payload.voiceEnabled = Boolean(updates.voiceEnabled);
    if (updates.assistantTone !== undefined) payload.assistantTone = updates.assistantTone;

    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 2. Tasks CRUD
export async function createTaskRecord(
  userId: string,
  input: Partial<Omit<Task, 'id' | 'userId'>>
): Promise<string> {
  const taskId = generateSafeId('task');
  const path = `tasks/${taskId}`;
  const status =
    input.status && ['todo', 'in_progress', 'completed', 'cancelled', 'locked'].includes(input.status)
      ? input.status
      : 'todo';
  const priority =
    input.priority && ['low', 'medium', 'high', 'urgent'].includes(input.priority)
      ? input.priority
      : 'medium';
  const activityType =
    input.activityType &&
    ['fixed', 'deadline', 'task', 'time_block', 'routine', 'flexible', 'optional'].includes(
      input.activityType
    )
      ? input.activityType
      : 'task';

  try {
    await setDoc(doc(db, 'tasks', taskId), {
      userId,
      title: cleanStr(input.title, 200, 'Untitled Task'),
      description: cleanStr(input.description, 2000, ''),
      status,
      priority,
      dueDate: cleanStr(input.dueDate, 20, new Date().toISOString().slice(0, 10)),
      scheduledTime: cleanStr(input.scheduledTime, 20, ''),
      category: cleanStr(input.category, 60, 'General'),
      projectId: cleanOptId(input.projectId),
      goalId: cleanOptId(input.goalId),
      estimatedMinutes: clampNum(input.estimatedMinutes, 0, 1440, 45),
      activityType,
      isCompleted: status === 'completed' || Boolean(input.isCompleted),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return taskId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleTaskRecord(
  taskId: string,
  isCompleted: boolean
): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      isCompleted: Boolean(isCompleted),
      status: isCompleted ? 'completed' : 'todo',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function rescheduleTaskRecord(
  taskId: string,
  dueDate: string,
  scheduledTime: string,
  estimatedMinutes: number,
  activityType: Task['activityType'] = 'task'
): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      dueDate: cleanStr(dueDate, 20, ''),
      scheduledTime: cleanStr(scheduledTime, 20, ''),
      estimatedMinutes: clampNum(estimatedMinutes, 0, 1440, 45),
      activityType,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateTaskRecord(
  taskId: string,
  existing: Task,
  updates: Partial<Task>
): Promise<void> {
  const path = `tasks/${taskId}`;
  const status = updates.status ?? existing.status;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      title: cleanStr(updates.title ?? existing.title, 200, 'Untitled Task'),
      description: cleanStr(updates.description ?? existing.description, 2000, ''),
      status,
      priority: updates.priority ?? existing.priority,
      dueDate: cleanStr(updates.dueDate ?? existing.dueDate, 20, ''),
      scheduledTime: cleanStr(updates.scheduledTime ?? existing.scheduledTime, 20, ''),
      category: cleanStr(updates.category ?? existing.category, 60, 'General'),
      projectId: cleanOptId(updates.projectId ?? existing.projectId),
      goalId: cleanOptId(updates.goalId ?? existing.goalId),
      estimatedMinutes: clampNum(
        updates.estimatedMinutes ?? existing.estimatedMinutes,
        0,
        1440,
        45
      ),
      activityType: updates.activityType ?? existing.activityType,
      isCompleted: updates.isCompleted ?? status === 'completed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTaskRecord(taskId: string): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 3. Projects CRUD
export async function createProjectRecord(
  userId: string,
  input: Partial<Omit<Project, 'id' | 'userId'>>
): Promise<string> {
  const projectId = generateSafeId('proj');
  const path = `projects/${projectId}`;
  const status =
    input.status &&
    ['planning', 'active', 'on_hold', 'completed', 'archived', 'locked'].includes(input.status)
      ? input.status
      : 'active';
  const priority =
    input.priority && ['low', 'medium', 'high', 'urgent'].includes(input.priority)
      ? input.priority
      : 'medium';

  try {
    await setDoc(doc(db, 'projects', projectId), {
      userId,
      name: cleanStr(input.name, 150, 'New Project'),
      description: cleanStr(input.description, 2000, ''),
      status,
      priority,
      startDate: cleanStr(input.startDate, 20, new Date().toISOString().slice(0, 10)),
      deadline: cleanStr(input.deadline, 20, ''),
      progress: clampNum(input.progress, 0, 100, 0),
      goalId: cleanOptId(input.goalId),
      category: cleanStr(input.category, 60, 'Work'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return projectId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateProjectRecord(
  projectId: string,
  existing: Project,
  updates: Partial<Project>
): Promise<void> {
  const path = `projects/${projectId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId), {
      name: cleanStr(updates.name ?? existing.name, 150, 'New Project'),
      description: cleanStr(updates.description ?? existing.description, 2000, ''),
      status: updates.status ?? existing.status,
      priority: updates.priority ?? existing.priority,
      startDate: cleanStr(updates.startDate ?? existing.startDate, 20, ''),
      deadline: cleanStr(updates.deadline ?? existing.deadline, 20, ''),
      progress: clampNum(updates.progress ?? existing.progress, 0, 100, 0),
      goalId: cleanOptId(updates.goalId ?? existing.goalId),
      category: cleanStr(updates.category ?? existing.category, 60, 'Work'),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteProjectRecord(projectId: string): Promise<void> {
  const path = `projects/${projectId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 4. Goals CRUD
export async function createGoalRecord(
  userId: string,
  input: Partial<Omit<Goal, 'id' | 'userId'>>
): Promise<string> {
  const goalId = generateSafeId('goal');
  const path = `goals/${goalId}`;
  const milestones = Array.isArray(input.milestones)
    ? input.milestones
        .map((m) => cleanStr(m, 200, ''))
        .filter(Boolean)
        .slice(0, 20)
    : [];

  try {
    await setDoc(doc(db, 'goals', goalId), {
      userId,
      title: cleanStr(input.title, 150, 'New Goal'),
      description: cleanStr(input.description, 2000, ''),
      category: cleanStr(input.category, 60, 'Personal Growth'),
      deadline: cleanStr(input.deadline, 20, ''),
      progress: clampNum(input.progress, 0, 100, 0),
      status:
        input.status && ['active', 'completed', 'paused', 'locked'].includes(input.status)
          ? input.status
          : 'active',
      milestones,
      targetMetric: cleanStr(input.targetMetric, 150, '100% completion'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return goalId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateGoalRecord(
  goalId: string,
  existing: Goal,
  updates: Partial<Goal>
): Promise<void> {
  const path = `goals/${goalId}`;
  const rawMilestones = updates.milestones ?? existing.milestones;
  const milestones = Array.isArray(rawMilestones)
    ? rawMilestones
        .map((m) => cleanStr(m, 200, ''))
        .filter(Boolean)
        .slice(0, 20)
    : [];

  try {
    await updateDoc(doc(db, 'goals', goalId), {
      title: cleanStr(updates.title ?? existing.title, 150, 'New Goal'),
      description: cleanStr(updates.description ?? existing.description, 2000, ''),
      category: cleanStr(updates.category ?? existing.category, 60, 'Personal Growth'),
      deadline: cleanStr(updates.deadline ?? existing.deadline, 20, ''),
      progress: clampNum(updates.progress ?? existing.progress, 0, 100, 0),
      status: updates.status ?? existing.status,
      milestones,
      targetMetric: cleanStr(updates.targetMetric ?? existing.targetMetric, 150, ''),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteGoalRecord(goalId: string): Promise<void> {
  const path = `goals/${goalId}`;
  try {
    await deleteDoc(doc(db, 'goals', goalId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 5. Calendar Events CRUD
export async function createEventRecord(
  userId: string,
  input: Partial<Omit<CalendarEvent, 'id' | 'userId'>>
): Promise<string> {
  const eventId = generateSafeId('evt');
  const path = `events/${eventId}`;
  const eventType =
    input.eventType &&
    ['event', 'appointment', 'meeting', 'deadline', 'fixed_commitment', 'time_block'].includes(
      input.eventType
    )
      ? input.eventType
      : 'event';

  try {
    await setDoc(doc(db, 'events', eventId), {
      userId,
      title: cleanStr(input.title, 200, 'Scheduled Event'),
      description: cleanStr(input.description, 2000, ''),
      date: cleanStr(input.date, 20, new Date().toISOString().slice(0, 10)),
      startTime: cleanStr(input.startTime, 20, '09:00'),
      endTime: cleanStr(input.endTime, 20, '10:00'),
      eventType,
      location: cleanStr(input.location, 200, ''),
      notes: cleanStr(input.notes, 2000, ''),
      projectId: cleanOptId(input.projectId),
      taskId: cleanOptId(input.taskId),
      isFixed: eventType === 'fixed_commitment' ? true : Boolean(input.isFixed),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return eventId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateEventRecord(
  eventId: string,
  existing: CalendarEvent,
  updates: Partial<CalendarEvent>
): Promise<void> {
  const path = `events/${eventId}`;
  try {
    await updateDoc(doc(db, 'events', eventId), {
      title: cleanStr(updates.title ?? existing.title, 200, 'Scheduled Event'),
      description: cleanStr(updates.description ?? existing.description, 2000, ''),
      date: cleanStr(updates.date ?? existing.date, 20, existing.date),
      startTime: cleanStr(updates.startTime ?? existing.startTime, 20, existing.startTime),
      endTime: cleanStr(updates.endTime ?? existing.endTime, 20, existing.endTime),
      eventType: updates.eventType ?? existing.eventType,
      location: cleanStr(updates.location ?? existing.location, 200, ''),
      notes: cleanStr(updates.notes ?? existing.notes, 2000, ''),
      projectId: cleanOptId(updates.projectId ?? existing.projectId),
      taskId: cleanOptId(updates.taskId ?? existing.taskId),
      isFixed: updates.isFixed ?? existing.isFixed,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEventRecord(eventId: string): Promise<void> {
  const path = `events/${eventId}`;
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 6. Notes / Second Brain CRUD
export async function createNoteRecord(
  userId: string,
  input: Partial<Omit<Note, 'id' | 'userId'>>
): Promise<string> {
  const noteId = generateSafeId('note');
  const path = `notes/${noteId}`;
  const tags = Array.isArray(input.tags)
    ? input.tags
        .map((t) => cleanStr(t, 50, ''))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  try {
    await setDoc(doc(db, 'notes', noteId), {
      userId,
      title: cleanStr(input.title, 200, 'Untitled Note'),
      content: cleanStr(input.content, 15000, ''),
      category: cleanStr(input.category, 60, 'Ideas'),
      tags,
      isPinned: Boolean(input.isPinned),
      isArchived: Boolean(input.isArchived),
      projectId: cleanOptId(input.projectId),
      goalId: cleanOptId(input.goalId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return noteId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateNoteRecord(
  noteId: string,
  existing: Note,
  updates: Partial<Note>
): Promise<void> {
  const path = `notes/${noteId}`;
  const rawTags = updates.tags ?? existing.tags;
  const tags = Array.isArray(rawTags)
    ? rawTags
        .map((t) => cleanStr(t, 50, ''))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  try {
    await updateDoc(doc(db, 'notes', noteId), {
      title: cleanStr(updates.title ?? existing.title, 200, 'Untitled Note'),
      content: cleanStr(updates.content ?? existing.content, 15000, ''),
      category: cleanStr(updates.category ?? existing.category, 60, 'Ideas'),
      tags,
      isPinned: updates.isPinned ?? existing.isPinned,
      isArchived: updates.isArchived ?? existing.isArchived,
      projectId: cleanOptId(updates.projectId ?? existing.projectId),
      goalId: cleanOptId(updates.goalId ?? existing.goalId),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteNoteRecord(noteId: string): Promise<void> {
  const path = `notes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'notes', noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 7. Habits CRUD
export async function createHabitRecord(
  userId: string,
  input: Partial<Omit<Habit, 'id' | 'userId'>>
): Promise<string> {
  const habitId = generateSafeId('habit');
  const path = `habits/${habitId}`;
  const frequency =
    input.frequency && ['daily', 'weekdays', 'weekly'].includes(input.frequency)
      ? input.frequency
      : 'daily';

  try {
    await setDoc(doc(db, 'habits', habitId), {
      userId,
      title: cleanStr(input.title, 150, 'New Habit'),
      description: cleanStr(input.description, 500, ''),
      category: cleanStr(input.category, 60, 'Health & Focus'),
      frequency,
      targetPerWeek: clampNum(
        input.targetPerWeek,
        1,
        7,
        frequency === 'daily' ? 7 : frequency === 'weekdays' ? 5 : 3
      ),
      currentStreak: clampNum(input.currentStreak, 0, 10000, 0),
      bestStreak: clampNum(input.bestStreak, 0, 10000, 0),
      completedDates: Array.isArray(input.completedDates)
        ? input.completedDates.map((d) => cleanStr(d, 20, '')).filter(Boolean).slice(0, 366)
        : [],
      linkedGoalId: cleanOptId(input.linkedGoalId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return habitId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleHabitDateRecord(
  habit: Habit,
  dateStr: string
): Promise<void> {
  const path = `habits/${habit.id}`;
  const exists = habit.completedDates.includes(dateStr);
  const nextDates = exists
    ? habit.completedDates.filter((d) => d !== dateStr)
    : [dateStr, ...habit.completedDates].slice(0, 366);

  const nextStreak = exists
    ? Math.max(0, habit.currentStreak - 1)
    : habit.currentStreak + 1;
  const nextBest = Math.max(habit.bestStreak, nextStreak);

  try {
    await updateDoc(doc(db, 'habits', habit.id), {
      completedDates: nextDates,
      currentStreak: nextStreak,
      bestStreak: nextBest,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteHabitRecord(habitId: string): Promise<void> {
  const path = `habits/${habitId}`;
  try {
    await deleteDoc(doc(db, 'habits', habitId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 8. Learning Items CRUD
export async function createLearningRecord(
  userId: string,
  input: Partial<Omit<LearningItem, 'id' | 'userId'>>
): Promise<string> {
  const learningId = generateSafeId('learn');
  const path = `learning/${learningId}`;
  const itemType =
    input.itemType && ['subject', 'skill', 'course', 'resource'].includes(input.itemType)
      ? input.itemType
      : 'skill';

  try {
    await setDoc(doc(db, 'learning', learningId), {
      userId,
      title: cleanStr(input.title, 150, 'New Learning Topic'),
      itemType,
      category: cleanStr(input.category, 60, 'Engineering'),
      status: 'active',
      progress: clampNum(input.progress, 0, 100, 0),
      totalHoursLogged: clampNum(input.totalHoursLogged, 0, 10000, 0),
      targetHours: clampNum(input.targetHours, 1, 10000, 40),
      resourceUrl: cleanStr(input.resourceUrl, 500, ''),
      notes: cleanStr(input.notes, 5000, ''),
      linkedGoalId: cleanOptId(input.linkedGoalId),
      lastStudiedDate: cleanStr(input.lastStudiedDate, 20, ''),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return learningId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function logStudySessionRecord(
  item: LearningItem,
  hoursAdded: number,
  sessionDate: string
): Promise<void> {
  const path = `learning/${item.id}`;
  const nextHours = Math.round((item.totalHoursLogged + hoursAdded) * 10) / 10;
  const nextProgress = Math.min(100, Math.round((nextHours / Math.max(1, item.targetHours)) * 100));
  const nextStatus = nextProgress >= 100 ? 'completed' : 'active';

  try {
    await updateDoc(doc(db, 'learning', item.id), {
      totalHoursLogged: clampNum(nextHours, 0, 10000, 0),
      progress: clampNum(nextProgress, 0, 100, 0),
      lastStudiedDate: cleanStr(sessionDate, 20, new Date().toISOString().slice(0, 10)),
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteLearningRecord(learningId: string): Promise<void> {
  const path = `learning/${learningId}`;
  try {
    await deleteDoc(doc(db, 'learning', learningId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 9. Finance Transactions CRUD
export async function createTransactionRecord(
  userId: string,
  input: Partial<Omit<FinanceTransaction, 'id' | 'userId'>>
): Promise<string> {
  const txId = generateSafeId('tx');
  const path = `transactions/${txId}`;
  const transactionType =
    input.transactionType && ['income', 'expense', 'savings'].includes(input.transactionType)
      ? input.transactionType
      : 'expense';

  try {
    await setDoc(doc(db, 'transactions', txId), {
      userId,
      title: cleanStr(input.title, 150, 'Transaction'),
      amount: clampNum(input.amount, 0.01, 100000000, 10),
      transactionType,
      category: cleanStr(input.category, 60, 'General'),
      date: cleanStr(input.date, 20, new Date().toISOString().slice(0, 10)),
      notes: cleanStr(input.notes, 1000, ''),
      financialGoalTitle: cleanStr(input.financialGoalTitle, 150, ''),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return txId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteTransactionRecord(txId: string): Promise<void> {
  const path = `transactions/${txId}`;
  try {
    await deleteDoc(doc(db, 'transactions', txId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 10. Daily Plans CRUD
export async function saveDailyPlanRecord(
  userId: string,
  dateStr: string,
  input: {
    status?: 'draft' | 'active' | 'completed' | 'locked';
    userInput: string;
    aiSummary: string;
    isOverloaded: boolean;
    overloadMessage: string;
    blocks: ScheduleBlock[];
    priorities: string[];
    endOfDayReview?: string;
  },
  existingPlanId?: string
): Promise<string> {
  const planId = existingPlanId || `plan_${userId.slice(0, 20)}_${dateStr}`.replace(/[^a-zA-Z0-9_-]/g, '');
  const path = `dailyPlans/${planId}`;

  const cleanBlocks: ScheduleBlock[] = (input.blocks || []).slice(0, 40).map((b, i) => ({
    id: cleanStr(b.id || `blk_${i}`, 60, `blk_${i}`),
    startTime: cleanStr(b.startTime, 20, '09:00'),
    endTime: cleanStr(b.endTime, 20, '10:00'),
    title: cleanStr(b.title, 200, 'Scheduled Activity'),
    blockType: b.blockType || 'task',
    priority: b.priority || 'medium',
    status: b.status || 'pending',
    notes: cleanStr(b.notes, 500, ''),
    linkedTaskId: cleanOptId(b.linkedTaskId),
    linkedProjectId: cleanOptId(b.linkedProjectId),
    linkedGoalId: cleanOptId(b.linkedGoalId),
  }));

  const cleanPriorities = (input.priorities || [])
    .map((p) => cleanStr(p, 200, ''))
    .filter(Boolean)
    .slice(0, 10);

  try {
    if (existingPlanId) {
      await updateDoc(doc(db, 'dailyPlans', existingPlanId), {
        status: input.status || 'active',
        userInput: cleanStr(input.userInput, 3000, ''),
        aiSummary: cleanStr(input.aiSummary, 3000, ''),
        isOverloaded: Boolean(input.isOverloaded),
        overloadMessage: cleanStr(input.overloadMessage, 1000, ''),
        blocks: cleanBlocks,
        priorities: cleanPriorities,
        endOfDayReview: cleanStr(input.endOfDayReview || '', 3000, ''),
        updatedAt: serverTimestamp(),
      });
      return existingPlanId;
    }

    try {
      await setDoc(doc(db, 'dailyPlans', planId), {
        userId,
        date: cleanStr(dateStr, 20, new Date().toISOString().slice(0, 10)),
        status: input.status || 'active',
        userInput: cleanStr(input.userInput, 3000, ''),
        aiSummary: cleanStr(input.aiSummary, 3000, ''),
        isOverloaded: Boolean(input.isOverloaded),
        overloadMessage: cleanStr(input.overloadMessage, 1000, ''),
        blocks: cleanBlocks,
        priorities: cleanPriorities,
        endOfDayReview: cleanStr(input.endOfDayReview || '', 3000, ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      await updateDoc(doc(db, 'dailyPlans', planId), {
        status: input.status || 'active',
        userInput: cleanStr(input.userInput, 3000, ''),
        aiSummary: cleanStr(input.aiSummary, 3000, ''),
        isOverloaded: Boolean(input.isOverloaded),
        overloadMessage: cleanStr(input.overloadMessage, 1000, ''),
        blocks: cleanBlocks,
        priorities: cleanPriorities,
        endOfDayReview: cleanStr(input.endOfDayReview || '', 3000, ''),
        updatedAt: serverTimestamp(),
      });
    }
    return planId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDailyPlanRecord(planId: string): Promise<void> {
  const path = `dailyPlans/${planId}`;
  try {
    await deleteDoc(doc(db, 'dailyPlans', planId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
