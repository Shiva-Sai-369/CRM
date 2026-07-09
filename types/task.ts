export type TaskType = "call" | "meeting" | "follow-up" | "email" | "other";
export type TaskStatus = "pending" | "completed" | "overdue" | "snoozed";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  clientName: string;
  leadId?: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}