'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useTaskStore } from '@/store/taskStore';
import type { Task, TaskPriority, TaskType } from '@/types/task';
import { getSupabaseClient } from '@/lib/supabase';

type TaskFormState = {
  title: string;
  leadId: number | null;
  type: TaskType;
  priority: TaskPriority;
  dueDate: string;
  dueTime: string;
  notes: string;
};

const TASK_TYPE_META: Record<
  TaskType,
  {
    label: string;
    icon: JSX.Element;
    accent: string;
  }
> = {
  call: {
    label: 'Call',
    accent: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.518 4.552a1 1 0 01-.447 1.158l-2.1 1.05a11.042 11.042 0 005.516 5.516l1.05-2.1a1 1 0 011.158-.447l4.552 1.518a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.163 21 3 14.837 3 7V5z" />
      </svg>
    ),
  },
  meeting: {
    label: 'Meeting',
    accent: 'text-violet-700 bg-violet-50 border-violet-200',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M4 11h16M5 21h14a1 1 0 001-1V7a1 1 0 00-1-1H5a1 1 0 00-1 1v13a1 1 0 001 1z" />
      </svg>
    ),
  },
  'follow-up': {
    label: 'Follow-up',
    accent: 'text-amber-700 bg-amber-50 border-amber-200',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-6 8l-4-4V6a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H7z" />
      </svg>
    ),
  },
  email: {
    label: 'Email',
    accent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 8l6.75-4.5m0 0L21 16m-18 0V6a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  other: {
    label: 'Other',
    accent: 'text-slate-700 bg-slate-50 border-slate-200',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v.01M12 12v.01M12 18v.01" />
      </svg>
    ),
  },
};

const TASK_PRIORITY_META: Record<
  TaskPriority,
  {
    label: string;
    className: string;
  }
> = {
  low: {
    label: 'Low',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-50 text-amber-850 border-amber-200',
  },
  high: {
    label: 'High',
    className: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

function getStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getEndOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseLocalDateTime(dateValue: string, timeValue: string): string {
  const dateTime = new Date(`${dateValue}T${timeValue}:00`);
  return dateTime.toISOString();
}

function formatTaskDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getDefaultTaskFormState(): TaskFormState {
  const now = new Date();
  const defaultDateTime = addDays(now, 0);
  defaultDateTime.setHours(defaultDateTime.getHours() + 1);

  return {
    title: '',
    leadId: null,
    type: 'follow-up',
    priority: 'medium',
    dueDate: toDateInputValue(defaultDateTime),
    dueTime: toTimeInputValue(defaultDateTime),
    notes: '',
  };
}

function getTaskFormState(task: Task): TaskFormState {
  const dueDate = new Date(task.dueDate);

  return {
    title: task.title,
    leadId: task.leadId,
    type: task.type,
    priority: task.priority,
    dueDate: toDateInputValue(dueDate),
    dueTime: toTimeInputValue(dueDate),
    notes: task.notes ?? '',
  };
}

function getSectionAccent(section: 'overdue' | 'today' | 'upcoming' | 'completed'): string {
  switch (section) {
    case 'overdue':
      return 'border-red-200 bg-red-50/50';
    case 'today':
      return 'border-amber-200 bg-amber-50/50';
    case 'upcoming':
      return 'border-blue-200 bg-blue-50/50';
    case 'completed':
      return 'border-emerald-200 bg-emerald-50/50';
  }
}

function getTaskDueState(task: Task, now: Date): 'overdue' | 'today' | 'upcoming' | 'completed' | 'snoozed' {
  if (task.status === 'completed') {
    return 'completed';
  }

  if (task.status === 'snoozed') {
    return 'snoozed';
  }

  const dueDate = new Date(task.dueDate);

  if (dueDate.getTime() < now.getTime()) {
    return 'overdue';
  }

  if (isSameLocalDay(dueDate, now)) {
    return 'today';
  }

  return 'upcoming';
}

function getSnoozedDueDate(days: number): string {
  return addDays(new Date(), days).toISOString();
}

interface TaskFormModalProps {
  open: boolean;
  title: string;
  submitLabel: string;
  initialTask: Task | null;
  onClose: () => void;
  onSubmit: (state: TaskFormState) => void;
}

function TaskFormModal({ open, title, submitLabel, initialTask, onClose, onSubmit }: TaskFormModalProps) {
  const [formState, setFormState] = useState<TaskFormState>(getDefaultTaskFormState());
  const [leads, setLeads] = useState<{ id: number; name: string }[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load leads for linking options
  useEffect(() => {
    async function fetchLeads() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('sheet_leads')
          .select('id, name')
          .order('name', { ascending: true });
        if (error) throw error;
        setLeads((data || []).map(l => ({ id: Number(l.id), name: l.name ?? 'Unknown' })));
      } catch (err) {
        console.error('Failed to load leads for link selection:', err);
      }
    }
    if (open) {
      fetchLeads();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialTask) {
      setFormState(getTaskFormState(initialTask));
      setSelectedLeadId(initialTask.leadId);
      setLeadSearch(initialTask.leadName ?? '');
    } else {
      setFormState(getDefaultTaskFormState());
      setSelectedLeadId(null);
      setLeadSearch('');
    }
    setIsDropdownOpen(false);
  }, [initialTask, open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const fieldClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-950';

  const filteredLeads = leadSearch.trim()
    ? leads.filter(l => l.name.toLowerCase().includes(leadSearch.toLowerCase()))
    : leads;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      ...formState,
      leadId: selectedLeadId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50"
        aria-label="Close modal"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">Track client follow-ups, meetings, and reminders.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close form"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-750 mb-1">Title</label>
              <input
                type="text"
                value={formState.title}
                onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                placeholder="Follow up on pricing"
                className={fieldClass}
                required
              />
            </div>

            <div className="relative md:col-span-2">
              <label className="block text-sm font-medium text-gray-750 mb-1">Link to Lead (Optional)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search lead by name..."
                    value={leadSearch}
                    onChange={(e) => {
                      setLeadSearch(e.target.value);
                      setIsDropdownOpen(true);
                      // Clear selection if typing
                      if (selectedLeadId) setSelectedLeadId(null);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className={fieldClass}
                  />
                  {isDropdownOpen && filteredLeads.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 max-h-40 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg text-sm">
                      {filteredLeads.map((l) => (
                        <li
                          key={l.id}
                          onClick={() => {
                            setSelectedLeadId(l.id);
                            setLeadSearch(l.name);
                            setIsDropdownOpen(false);
                          }}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-gray-900 font-medium"
                        >
                          {l.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {selectedLeadId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLeadId(null);
                      setLeadSearch('');
                    }}
                    className="px-3 py-2 border border-gray-305 rounded-lg text-sm text-red-650 hover:bg-red-50 font-semibold transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-755 mb-1">Type</label>
              <select
                value={formState.type}
                onChange={(event) => setFormState((current) => ({ ...current, type: event.target.value as TaskType }))}
                className={fieldClass}
              >
                {Object.entries(TASK_TYPE_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-755 mb-1">Priority</label>
              <select
                value={formState.priority}
                onChange={(event) => setFormState((current) => ({ ...current, priority: event.target.value as TaskPriority }))}
                className={fieldClass}
              >
                {Object.entries(TASK_PRIORITY_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-755 mb-1">Due Date</label>
              <input
                type="date"
                value={formState.dueDate}
                onChange={(event) => setFormState((current) => ({ ...current, dueDate: event.target.value }))}
                className={fieldClass}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-755 mb-1">Due Time</label>
              <input
                type="time"
                value={formState.dueTime}
                onChange={(event) => setFormState((current) => ({ ...current, dueTime: event.target.value }))}
                className={fieldClass}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-755 mb-1">Notes</label>
              <textarea
                value={formState.notes}
                onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                placeholder="Call notes, reminders, next steps..."
                className={fieldClass}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  now: Date;
  onComplete: (taskId: number) => void;
  onSnooze: (taskId: number, days: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}

function TaskRow({ task, now, onComplete, onSnooze, onEdit, onDelete }: TaskRowProps) {
  const typeMeta = TASK_TYPE_META[task.type];
  const priorityMeta = TASK_PRIORITY_META[task.priority];
  const dueState = getTaskDueState(task, now);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className={`mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${typeMeta.accent}`}>
            {typeMeta.icon}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{task.title}</h3>
              {dueState === 'overdue' && (
                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-700">
                  Overdue
                </span>
              )}
              {dueState === 'snoozed' && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  Snoozed
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              {task.leadId ? (
                <Link
                  href={`/enquiries?leadId=${task.leadId}`}
                  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {task.leadName || 'View Lead'}
                </Link>
              ) : (
                <span className="text-gray-400 italic text-sm">No lead linked</span>
              )}
              <span className="text-gray-305">•</span>
              <span className="capitalize">{typeMeta.label}</span>
              <span className="text-gray-305">•</span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${priorityMeta.className}`}>
                {priorityMeta.label} priority
              </span>
            </div>

            {task.notes && <p className="text-sm text-gray-500 whitespace-pre-line">{task.notes}</p>}
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Due</p>
            <p className={`text-sm font-semibold ${dueState === 'overdue' ? 'text-red-700' : 'text-gray-900'}`}>
              {formatTaskDateTime(task.dueDate)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {task.status !== 'completed' && (
              <>
                <button
                  type="button"
                  onClick={() => onComplete(task.id)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  Complete
                </button>

                <details className="group relative">
                  <summary className="list-none cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100">
                    Snooze
                  </summary>
                  <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => onSnooze(task.id, 1)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-705 hover:bg-gray-50"
                    >
                      +1 day
                    </button>
                    <button
                      type="button"
                      onClick={() => onSnooze(task.id, 3)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-705 hover:bg-gray-50"
                    >
                      +3 days
                    </button>
                    <button
                      type="button"
                      onClick={() => onSnooze(task.id, 7)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-705 hover:bg-gray-50"
                    >
                      Next week
                    </button>
                  </div>
                </details>
              </>
            )}

            <button
              type="button"
              onClick={() => onEdit(task)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TaskSectionProps {
  title: string;
  accentClassName: string;
  count: number;
  emptyMessage: string;
  tasks: Task[];
  now: Date;
  onComplete: (taskId: number) => void;
  onSnooze: (taskId: number, days: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
}

function TaskSection({
  title,
  accentClassName,
  count,
  emptyMessage,
  tasks,
  now,
  onComplete,
  onSnooze,
  onEdit,
  onDelete,
}: TaskSectionProps) {
  return (
    <section className={`rounded-2xl border bg-white shadow-sm ${accentClassName}`}>
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{count} task{count === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="space-y-3 p-5">
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              now={now}
              onComplete={onComplete}
              onSnooze={onSnooze}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default function TasksPage() {
  const {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    completeTask,
    snoozeTask,
    deleteTask,
  } = useTaskStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    fetchTasks()
      .catch((err) => {
        console.error('Error loading tasks:', err);
        toast.error('Failed to load tasks from database');
      })
      .finally(() => setIsFirstLoad(false));
  }, [fetchTasks]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const now = currentTime;
  const todayStart = getStartOfDay(currentTime);
  const todayEnd = getEndOfDay(currentTime);
  const upcomingEnd = getEndOfDay(addDays(currentTime, 7));

  const overdueTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status === 'pending' && new Date(task.dueDate).getTime() < now.getTime())
        .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()),
    [now, tasks]
  );

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status === 'pending')
        .filter((task) => {
          const dueDate = new Date(task.dueDate);
          return dueDate.getTime() >= now.getTime() && dueDate >= todayStart && dueDate <= todayEnd;
        })
        .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()),
    [now, tasks, todayEnd, todayStart]
  );

  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status === 'pending')
        .filter((task) => {
          const dueDate = new Date(task.dueDate);
          return dueDate > todayEnd && dueDate <= upcomingEnd;
        })
        .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()),
    [tasks, todayEnd, upcomingEnd]
  );

  const completedTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status === 'completed')
        .sort((left, right) => {
          const leftTime = new Date(left.completedAt ?? left.createdAt).getTime();
          const rightTime = new Date(right.completedAt ?? right.createdAt).getTime();
          return rightTime - leftTime;
        }),
    [tasks]
  );

  const totalBadgeCount = overdueTasks.length + todayTasks.length;

  const openCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = async (formState: TaskFormState) => {
    if (!formState.title.trim()) {
      toast.error('Enter a task title');
      return;
    }

    const dueDate = parseLocalDateTime(formState.dueDate, formState.dueTime);

    const payload = {
      title: formState.title.trim(),
      leadId: formState.leadId,
      type: formState.type,
      priority: formState.priority,
      dueDate,
      notes: formState.notes.trim() ? formState.notes.trim() : null,
    };

    try {
      if (editingTask) {
        await updateTask(editingTask.id, payload);
        toast.success('Task updated');
      } else {
        await createTask(payload);
        toast.success('Task created');
      }
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save task');
    }
  };

  const handleComplete = async (taskId: number) => {
    try {
      await completeTask(taskId);
      toast.success('Task completed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete task');
    }
  };

  const handleSnooze = async (taskId: number, days: number) => {
    try {
      const newDueDate = getSnoozedDueDate(days);
      await snoozeTask(taskId, newDueDate);
      toast.success(`Task snoozed ${days === 7 ? 'until next week' : `by ${days} day${days === 1 ? '' : 's'}`}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to snooze task');
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = async (taskId: number) => {
    const shouldDelete = window.confirm('Delete this task?');
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteTask(taskId);
      toast.success('Task deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete task');
    }
  };

  if (isFirstLoad && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">CRM</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Tasks & Reminders</h1>
              <p className="mt-2 text-sm text-slate-500">
                Keep follow-ups, meetings, and reminders moving without leaving the CRM.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + New Task
            </button>
          </div>

          <div className="grid gap-3 px-6 py-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Overdue</p>
              <p className="mt-1 text-2xl font-bold text-red-900">{overdueTasks.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Today</p>
              <p className="mt-1 text-2xl font-bold text-amber-900">{todayTasks.length}</p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Upcoming</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{upcomingTasks.length}</p>
            </div>
          </div>
        </header>

        {totalBadgeCount > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm font-medium">
            You have {totalBadgeCount} task{totalBadgeCount === 1 ? '' : 's'} due today or already overdue.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-55 px-4 py-3 text-sm text-red-900 shadow-sm font-semibold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6">
          <TaskSection
            title="Overdue"
            accentClassName={getSectionAccent('overdue')}
            count={overdueTasks.length}
            emptyMessage="No overdue tasks."
            tasks={overdueTasks}
            now={now}
            onComplete={handleComplete}
            onSnooze={handleSnooze}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <TaskSection
            title="Today"
            accentClassName={getSectionAccent('today')}
            count={todayTasks.length}
            emptyMessage="No tasks scheduled for today."
            tasks={todayTasks}
            now={now}
            onComplete={handleComplete}
            onSnooze={handleSnooze}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <TaskSection
            title="Upcoming"
            accentClassName={getSectionAccent('upcoming')}
            count={upcomingTasks.length}
            emptyMessage="Nothing coming up in the next 7 days."
            tasks={upcomingTasks}
            now={now}
            onComplete={handleComplete}
            onSnooze={handleSnooze}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <details
            open={completedOpen}
            onToggle={(event) => setCompletedOpen(event.currentTarget.open)}
            className={`rounded-2xl border bg-white shadow-sm ${getSectionAccent('completed')}`}
          >
            <summary className="cursor-pointer list-none px-5 py-4 select-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Completed</h2>
                  <p className="text-xs text-gray-500">{completedTasks.length} completed task{completedTasks.length === 1 ? '' : 's'}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-700">{completedOpen ? 'Collapse' : 'Expand'}</span>
              </div>
            </summary>

            <div className="border-t border-gray-100 p-5">
              {completedTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                  No completed tasks yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {completedTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      now={now}
                      onComplete={handleComplete}
                      onSnooze={handleSnooze}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </details>
        </div>
      </div>

      <TaskFormModal
        open={isModalOpen}
        title={editingTask ? 'Edit Task' : 'New Task'}
        submitLabel={editingTask ? 'Save Changes' : 'Create Task'}
        initialTask={editingTask}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}