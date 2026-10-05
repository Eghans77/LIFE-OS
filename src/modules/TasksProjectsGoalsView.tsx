import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Archive,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { useLifeOS } from '../context/LifeOSContext';
import {
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
  createHabitRecord,
} from '../lib/firebase';
import {
  Task,
  Project,
  Goal,
  PriorityLevel,
  TaskStatus,
  ProjectStatus,
  ActivityClassification,
} from '../types/lifeos';

// ============================================================================
// 1. TASKS MODULE
// ============================================================================
export const TasksModule: React.FC = () => {
  const { user, tasks, projects, goals, selectedDate, showToast } = useLifeOS();

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [reschedulingTaskId, setReschedulingTaskId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = useState(selectedDate);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [category, setCategory] = useState('Work');
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);
  const [activityType, setActivityType] = useState<ActivityClassification>('task');
  const [projectId, setProjectId] = useState('');
  const [goalId, setGoalId] = useState('');

  const openEdit = (t: Task) => {
    setEditingTask(t);
    setTitle(t.title);
    setDescription(t.description);
    setPriority(t.priority);
    setStatus(t.status);
    setDueDate(t.dueDate);
    setScheduledTime(t.scheduledTime);
    setCategory(t.category);
    setEstimatedMinutes(t.estimatedMinutes);
    setActivityType(t.activityType);
    setProjectId(t.projectId);
    setGoalId(t.goalId);
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setStatus('todo');
    setDueDate(selectedDate);
    setScheduledTime('');
    setCategory('General');
    setEstimatedMinutes(45);
    setActivityType('task');
    setProjectId('');
    setGoalId('');
    setShowForm(false);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    if (editingTask) {
      await updateTaskRecord(editingTask.id, editingTask, {
        title,
        description,
        priority,
        status,
        dueDate,
        scheduledTime,
        category,
        estimatedMinutes,
        activityType,
        projectId,
        goalId,
        isCompleted: status === 'completed',
      });
      showToast('Task updated.');
    } else {
      await createTaskRecord(user.uid, {
        title,
        description,
        priority,
        status,
        dueDate,
        scheduledTime,
        category,
        estimatedMinutes,
        activityType,
        projectId,
        goalId,
        isCompleted: status === 'completed',
      });
      showToast('Task created.');
    }
    resetForm();
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'active' && t.isCompleted) return false;
    if (statusFilter === 'completed' && !t.isCompleted) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-3xl text-white">Tasks</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Capture, prioritize, estimate duration, and link tasks to your projects and goals.
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
          <span>New Task</span>
        </button>
      </div>

      {/* Interactive Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
          {(['all', 'active', 'completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
          {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((pr) => (
            <button
              key={pr}
              type="button"
              onClick={() => setPriorityFilter(pr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                priorityFilter === pr
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {pr === 'all' ? 'All Priorities' : pr.charAt(0).toUpperCase() + pr.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Create / Edit Task Form */}
      {showForm && (
        <form
          onSubmit={handleSaveTask}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-white">
            {editingTask ? 'Edit Task' : 'Create Task'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Task Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Finish church poster before 4 PM"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details, acceptance criteria, or notes..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Priority</label>
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
            <div>
              <label className="block text-xs text-slate-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Scheduled Time (Optional)</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Estimated Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={1440}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Activity Type</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as ActivityClassification)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="task">Standard Task</option>
                <option value="deadline">Deadline</option>
                <option value="time_block">Focus Time Block</option>
                <option value="fixed">Fixed Commitment</option>
                <option value="routine">Routine</option>
                <option value="flexible">Flexible Activity</option>
                <option value="optional">Optional Activity</option>
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
            <div>
              <label className="block text-xs text-slate-300 mb-1">Linked Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="">No Project</option>
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
                <option value="">No Goal</option>
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
              onClick={resetForm}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
            >
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-3">
          <p className="text-sm font-medium text-white">Your task list is clear.</p>
          <p className="text-xs text-slate-400">
            Add a new task above or tell the AI Assistant what you need to get done today.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 divide-y divide-slate-800/80">
          {filteredTasks.map((t) => {
            const linkedProject = projects.find((p) => p.id === t.projectId);
            const linkedGoal = goals.find((g) => g.id === t.goalId);
            return (
              <div
                key={t.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleTaskRecord(t.id, !t.isCompleted)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-400 cursor-pointer shrink-0"
                  >
                    {t.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>
                  <div className="min-w-0 space-y-1">
                    <p
                      className={`text-sm font-medium ${
                        t.isCompleted ? 'line-through text-slate-500' : 'text-white'
                      }`}
                    >
                      {t.title}
                    </p>
                    {t.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{t.description}</p>
                    )}
                    {/* Zero-Pill Unboxed Metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                      <span
                        className={
                          t.priority === 'urgent'
                            ? 'text-red-400 font-semibold'
                            : t.priority === 'high'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }
                      >
                        {t.priority} priority
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{t.estimatedMinutes}m</span>
                      {t.dueDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Due {t.dueDate}</span>
                        </>
                      )}
                      {t.scheduledTime && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>at {t.scheduledTime}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="font-sans">{t.category}</span>
                      {linkedProject && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans text-emerald-400">
                            Project: {linkedProject.name}
                          </span>
                        </>
                      )}
                      {linkedGoal && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans text-sky-400">
                            Goal: {linkedGoal.title}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Task Actions: Reschedule, Edit, Delete */}
                <div className="flex items-center gap-2 shrink-0">
                  {reschedulingTaskId === t.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        defaultValue={t.dueDate || selectedDate}
                        onChange={async (e) => {
                          await rescheduleTaskRecord(
                            t.id,
                            e.target.value,
                            t.scheduledTime,
                            t.estimatedMinutes,
                            t.activityType
                          );
                          setReschedulingTaskId(null);
                          showToast(`Rescheduled to ${e.target.value}`);
                        }}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setReschedulingTaskId(null)}
                        className="text-xs text-slate-400 px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setReschedulingTaskId(t.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Reschedule Task"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Task"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {confirmDeleteId === t.id ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteTaskRecord(t.id);
                            setConfirmDeleteId(null);
                            showToast('Task deleted.');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold"
                        >
                          Confirm Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(t.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
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
// 2. PROJECTS MODULE
// ============================================================================
export const ProjectsModule: React.FC = () => {
  const { user, projects, tasks, notes, goals, selectedDate, showToast } = useLifeOS();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [startDate, setStartDate] = useState(selectedDate);
  const [deadline, setDeadline] = useState('');
  const [progress, setProgress] = useState(0);
  const [goalId, setGoalId] = useState('');
  const [category, setCategory] = useState('Work');

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setName(p.name);
    setDescription(p.description);
    setStatus(p.status);
    setPriority(p.priority);
    setStartDate(p.startDate);
    setDeadline(p.deadline);
    setProgress(p.progress);
    setGoalId(p.goalId);
    setCategory(p.category);
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingProject(null);
    setName('');
    setDescription('');
    setStatus('active');
    setPriority('medium');
    setStartDate(selectedDate);
    setDeadline('');
    setProgress(0);
    setGoalId('');
    setCategory('Work');
    setShowForm(false);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    if (editingProject) {
      await updateProjectRecord(editingProject.id, editingProject, {
        name,
        description,
        status,
        priority,
        startDate,
        deadline,
        progress,
        goalId,
        category,
      });
      showToast('Project updated.');
    } else {
      await createProjectRecord(user.uid, {
        name,
        description,
        status,
        priority,
        startDate,
        deadline,
        progress,
        goalId,
        category,
      });
      showToast('Project created.');
    }
    resetForm();
  };

  const filteredProjects = projects.filter(
    (p) => statusFilter === 'all' || p.status === statusFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-3xl text-white">Projects</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize multi-step deliverables connected to your goals, tasks, and notes.
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
          <span>New Project</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
        {(['all', 'planning', 'active', 'on_hold', 'completed', 'archived'] as const).map(
          (st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          )
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSaveProject}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-white">
            {editingProject ? 'Edit Project' : 'Create Project'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Project Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. JavaScript Learning Plan"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Priority</label>
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
            <div>
              <label className="block text-xs text-slate-300 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Progress ({progress}%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Linked Goal</label>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="">No Linked Goal</option>
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
              onClick={resetForm}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
            >
              {editingProject ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      )}

      {filteredProjects.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-3">
          <p className="text-sm font-medium text-white">Create your first project.</p>
          <p className="text-xs text-slate-400">
            Projects group related tasks, notes, and milestones toward your goals.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((proj) => {
            const projTasks = tasks.filter((t) => t.projectId === proj.id);
            const projNotes = notes.filter((n) => n.projectId === proj.id);
            const linkedGoal = goals.find((g) => g.id === proj.goalId);
            return (
              <div
                key={proj.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">{proj.status.replace('_', ' ')}</span>
                      <span aria-hidden="true">·</span>
                      <span>{proj.priority} priority</span>
                      {proj.deadline && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Due {proj.deadline}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(proj)}
                        className="p-1.5 text-slate-400 hover:text-white"
                        title="Edit Project"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateProjectRecord(proj.id, proj, { status: 'archived' })
                        }
                        className="p-1.5 text-slate-400 hover:text-amber-400"
                        title="Archive Project"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === proj.id ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteProjectRecord(proj.id);
                            setConfirmDeleteId(null);
                            showToast('Project deleted.');
                          }}
                          className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-sans font-semibold"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(proj.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-white">{proj.name}</h3>
                  {proj.description && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {proj.description}
                    </p>
                  )}
                  {linkedGoal && (
                    <p className="text-xs text-sky-400">
                      Goal: {linkedGoal.title}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Completion Progress</span>
                      <span className="font-mono text-white font-semibold">
                        {proj.progress}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${proj.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>{projTasks.length} linked tasks</span>
                    <span aria-hidden="true">·</span>
                    <span>{projNotes.length} notes</span>
                  </div>
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
// 3. GOALS MODULE (WITH AI GOAL → PROJECT → TASKS BREAKDOWN)
// ============================================================================
export const GoalsModule: React.FC = () => {
  const { user, goals, projects, tasks, selectedDate, showToast } = useLifeOS();

  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [breakingDownGoalId, setBreakingDownGoalId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Personal Growth');
  const [deadline, setDeadline] = useState('');
  const [progress, setProgress] = useState(0);
  const [targetMetric, setTargetMetric] = useState('100% completion');
  const [milestonesText, setMilestonesText] = useState('');

  const openEdit = (g: Goal) => {
    setEditingGoal(g);
    setTitle(g.title);
    setDescription(g.description);
    setCategory(g.category);
    setDeadline(g.deadline);
    setProgress(g.progress);
    setTargetMetric(g.targetMetric);
    setMilestonesText(g.milestones.join('\n'));
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingGoal(null);
    setTitle('');
    setDescription('');
    setCategory('Personal Growth');
    setDeadline('');
    setProgress(0);
    setTargetMetric('100% completion');
    setMilestonesText('');
    setShowForm(false);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    const milestones = milestonesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingGoal) {
      await updateGoalRecord(editingGoal.id, editingGoal, {
        title,
        description,
        category,
        deadline,
        progress,
        targetMetric,
        milestones,
      });
      showToast('Goal updated.');
    } else {
      await createGoalRecord(user.uid, {
        title,
        description,
        category,
        deadline,
        progress,
        targetMetric,
        milestones,
      });
      showToast('Goal created.');
    }
    resetForm();
  };

  // AI Goal Breakdown: GOAL -> PROJECT -> TASKS + HABIT
  const handleAIBreakdown = async (goal: Goal) => {
    if (!user) return;
    setBreakingDownGoalId(goal.id);
    try {
      const res = await fetch('/api/ai/breakdown-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          goalTitle: goal.title,
          goalDescription: goal.description,
          category: goal.category,
          deadline: goal.deadline,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to break down goal');

      // 1. Create the linked Project
      const createdProjectId = await createProjectRecord(user.uid, {
        name: data.project?.name || `${goal.title} Plan`,
        description: data.project?.description || `Action plan for ${goal.title}`,
        priority: data.project?.priority || 'high',
        category: data.project?.category || goal.category,
        startDate: selectedDate,
        deadline: goal.deadline,
        goalId: goal.id,
        status: 'active',
        progress: 0,
      });

      // 2. Create the linked Tasks
      if (Array.isArray(data.tasks)) {
        for (const t of data.tasks) {
          await createTaskRecord(user.uid, {
            title: t.title,
            description: t.description || '',
            priority: t.priority || 'medium',
            estimatedMinutes: Number(t.estimatedMinutes || 45),
            dueDate: selectedDate,
            category: goal.category,
            projectId: createdProjectId,
            goalId: goal.id,
          });
        }
      }

      // 3. Create supporting Habit if returned
      if (data.suggestedHabit?.title) {
        await createHabitRecord(user.uid, {
          title: data.suggestedHabit.title,
          description: data.suggestedHabit.description || '',
          category: goal.category,
          frequency: data.suggestedHabit.frequency || 'daily',
          linkedGoalId: goal.id,
        });
      }

      showToast(
        `AI broke down "${goal.title}" into 1 Project, ${
          data.tasks?.length || 0
        } Tasks, and 1 Habit!`
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'AI could not break down goal right now.'
      );
    } finally {
      setBreakingDownGoalId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-3xl text-white">Goals</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Define long-term objectives and use AI to break them into connected Projects, Tasks,
            and Habits.
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
          <span>New Goal</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSaveGoal}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-white">
            {editingGoal ? 'Edit Goal' : 'Create Goal'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Goal Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Learn JavaScript"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white resize-none"
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
              <label className="block text-xs text-slate-300 mb-1">Target Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Target Metric</label>
              <input
                type="text"
                value={targetMetric}
                onChange={(e) => setTargetMetric(e.target.value)}
                placeholder="e.g. Build 3 web apps"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Progress ({progress}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">
                Milestones (One per line)
              </label>
              <textarea
                rows={3}
                value={milestonesText}
                onChange={(e) => setMilestonesText(e.target.value)}
                placeholder={'Study variables & functions\nBuild first interactive project\nPractice REST APIs'}
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
              {editingGoal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      )}

      {goals.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-3">
          <p className="text-sm font-medium text-white">What do you want to accomplish?</p>
          <p className="text-xs text-slate-400">
            Create your first goal and let LIFE OS break it down into actionable projects and
            tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {goals.map((goal) => {
            const relatedProjects = projects.filter((p) => p.goalId === goal.id);
            const relatedTasks = tasks.filter((t) => t.goalId === goal.id);
            const isBreakingDown = breakingDownGoalId === goal.id;

            return (
              <div
                key={goal.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span className="text-emerald-400 font-sans font-medium">
                        {goal.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{goal.status}</span>
                      {goal.deadline && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Target {goal.deadline}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-white">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                        {goal.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAIBreakdown(goal)}
                      disabled={isBreakingDown}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 transition-colors cursor-pointer"
                    >
                      {isBreakingDown ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating Plan...</span>
                        </>
                      ) : (
                        <>
                          <span>AI Break Into Project & Tasks</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(goal)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === goal.id ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteGoalRecord(goal.id);
                          setConfirmDeleteId(null);
                          showToast('Goal deleted.');
                        }}
                        className="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-semibold"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(goal.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Target Metric: <strong className="text-slate-200">{goal.targetMetric}</strong>
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {goal.progress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>

                {/* Relational Hierarchy: Milestones, Linked Projects, Linked Tasks */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800">
                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-2">
                      Milestones ({goal.milestones.length})
                    </p>
                    {goal.milestones.length === 0 ? (
                      <p className="text-xs text-slate-500">No milestones listed.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {goal.milestones.map((m, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="font-mono text-emerald-400">0{i + 1}.</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-2">
                      Connected Projects ({relatedProjects.length})
                    </p>
                    {relatedProjects.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Click &ldquo;AI Break Into Project &amp; Tasks&rdquo; to generate.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 text-xs text-slate-200">
                        {relatedProjects.map((rp) => (
                          <li key={rp.id} className="flex items-center justify-between">
                            <span className="truncate">{rp.name}</span>
                            <span className="font-mono text-slate-400">{rp.progress}%</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-2">
                      Connected Tasks ({relatedTasks.length})
                    </p>
                    {relatedTasks.length === 0 ? (
                      <p className="text-xs text-slate-500">No tasks linked yet.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs text-slate-200">
                        {relatedTasks.slice(0, 5).map((rt) => (
                          <li key={rt.id} className="flex items-center justify-between gap-2">
                            <span
                              className={
                                rt.isCompleted ? 'line-through text-slate-500 truncate' : 'truncate'
                              }
                            >
                              {rt.title}
                            </span>
                            <span className="font-mono text-slate-400 shrink-0">
                              {rt.estimatedMinutes}m
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
