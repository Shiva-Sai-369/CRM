import type { Task } from '@/types/task';

const REMINDER_WINDOW_MS = 60 * 60 * 1000;

function getTimeValue(date: string): number {
  return new Date(date).getTime();
}

export function getTasksDueTodayOrOverdueCount(tasks: Task[], referenceDate = new Date()): number {
  const endOfToday = new Date(referenceDate);
  endOfToday.setHours(23, 59, 59, 999);

  return tasks.filter((task) => task.status !== 'completed' && getTimeValue(task.dueDate) <= endOfToday.getTime()).length;
}

export function getTaskReminderCandidates(tasks: Task[], referenceDate = new Date()): Task[] {
  const reminderWindowEnd = new Date(referenceDate.getTime() + REMINDER_WINDOW_MS);

  return tasks.filter((task) => {
    if (task.status === 'completed') {
      return false;
    }

    const dueTime = getTimeValue(task.dueDate);
    return dueTime <= reminderWindowEnd.getTime();
  });
}

export function getTaskReminderKey(task: Task): string {
  return `${task.id}:${task.dueDate}`;
}

export function formatTaskReminderSummary(tasks: Task[]): string {
  if (tasks.length === 0) {
    return '';
  }

  const preview = tasks.slice(0, 3).map((task) => task.title).join(', ');
  if (tasks.length <= 3) {
    return preview;
  }

  return `${preview} +${tasks.length - 3} more`;
}