export type TaskType = "call" | "meeting" | "follow-up" | "email" | "other";
export type TaskStatus = "pending" | "completed" | "snoozed";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: number;
  title: string;
  leadId: number | null;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string; // ISO String
  notes?: string | null;
  createdAt: string; // ISO String
  completedAt?: string | null; // ISO String
  leadName?: string | null; // Display helper for joined lead name
}