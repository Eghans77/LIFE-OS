export type ModuleId =
  | 'dashboard'
  | 'daily_planning'
  | 'tasks'
  | 'projects'
  | 'goals'
  | 'calendar'
  | 'notes'
  | 'habits'
  | 'learning'
  | 'finance'
  | 'notifications'
  | 'settings';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'locked';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type ActivityClassification =
  | 'fixed'
  | 'deadline'
  | 'task'
  | 'time_block'
  | 'routine'
  | 'flexible'
  | 'optional';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  bio?: string;
  photoUrl?: string;
  timeFormat: '12h' | '24h';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  weekStart: 'monday' | 'sunday';
  theme: 'dark' | 'light' | 'system';
  defaultTaskMinutes?: number;
  dailyPlanningTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  notificationsEnabled: boolean;
  voiceEnabled: boolean;
  assistantTone: 'calm' | 'direct' | 'encouraging';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: PriorityLevel;
  dueDate: string;
  scheduledTime: string;
  category: string;
  projectId: string;
  goalId: string;
  estimatedMinutes: number;
  activityType: ActivityClassification;
  isCompleted: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived' | 'locked';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: PriorityLevel;
  startDate: string;
  deadline: string;
  progress: number;
  goalId: string;
  category: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type GoalStatus = 'active' | 'completed' | 'paused' | 'locked';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  deadline: string;
  progress: number;
  status: GoalStatus;
  milestones: string[];
  targetMetric: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type CalendarEventType =
  | 'event'
  | 'appointment'
  | 'meeting'
  | 'deadline'
  | 'fixed_commitment'
  | 'time_block';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  eventType: CalendarEventType;
  location: string;
  notes: string;
  projectId: string;
  taskId: string;
  isFixed: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  projectId: string;
  goalId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  frequency: 'daily' | 'weekdays' | 'weekly';
  targetPerWeek: number;
  currentStreak: number;
  bestStreak: number;
  completedDates: string[];
  linkedGoalId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type LearningItemType = 'subject' | 'skill' | 'course' | 'resource';

export interface LearningItem {
  id: string;
  userId: string;
  title: string;
  itemType: LearningItemType;
  category: string;
  status: 'active' | 'completed' | 'paused' | 'locked';
  progress: number;
  totalHoursLogged: number;
  targetHours: number;
  resourceUrl: string;
  notes: string;
  linkedGoalId: string;
  lastStudiedDate: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type TransactionType = 'income' | 'expense' | 'savings';

export interface FinanceTransaction {
  id: string;
  userId: string;
  title: string;
  amount: number;
  transactionType: TransactionType;
  category: string;
  date: string;
  notes: string;
  financialGoalTitle: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ScheduleBlock {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  blockType:
    | 'fixed_commitment'
    | 'deadline'
    | 'task'
    | 'time_block'
    | 'routine'
    | 'break'
    | 'flexible'
    | 'optional';
  priority: PriorityLevel;
  status: 'pending' | 'in_progress' | 'completed' | 'moved';
  notes: string;
  linkedTaskId?: string;
  linkedProjectId?: string;
  linkedGoalId?: string;
}

export interface DailyPlan {
  id: string;
  userId: string;
  date: string;
  status: 'draft' | 'active' | 'completed' | 'locked';
  userInput: string;
  aiSummary: string;
  isOverloaded: boolean;
  overloadMessage: string;
  blocks: ScheduleBlock[];
  priorities: string[];
  endOfDayReview: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AIExtractedEntity {
  title: string;
  classification: string;
  timeInfo: string;
  estimatedMinutes: number;
  priority: PriorityLevel;
}

export interface AIActionProposal {
  id: string;
  actionType: string;
  summary: string;
  riskLevel: 'low' | 'high';
  requiresConfirmation: boolean;
  targetId: string;
  payload: Record<string, unknown>;
  executed?: boolean;
}

export interface AIAssistantResponse {
  reply: string;
  intentCategory: string;
  extractedEntities: AIExtractedEntity[];
  isOverloaded: boolean;
  overloadMessage: string;
  proposedPlan: {
    date: string;
    aiSummary: string;
    isOverloaded: boolean;
    overloadMessage: string;
    priorities: string[];
    blocks: ScheduleBlock[];
  } | null;
  actions: AIActionProposal[];
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  category: 'event' | 'deadline' | 'habit' | 'planning' | 'goal' | 'ai';
  timeLabel: string;
  severity: 'normal' | 'warning' | 'urgent';
  targetModule: ModuleId;
}
