import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task } from "@/types/task";

interface TaskStoreState {
  tasks: Task[];

  addTask: (task: Omit<Task, "id" | "createdAt" | "status">) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  completeTask: (id: string) => void;
  snoozeTask: (id: string, newDueDate: string) => void;
  deleteTask: (id: string) => void;

  getUpcomingTasks: (withinDays?: number) => Task[];
  getOverdueTasks: () => Task[];
  getTasksForLead: (leadId: string) => Task[];
}

function getNow() {
  return new Date();
}

function getEndDateWithinDays(withinDays: number): Date {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + withinDays);
  return endDate;
}

function isPendingTask(task: Task): boolean {
  return task.status === "pending";
}

function isDueBefore(task: Task, comparisonDate: Date): boolean {
  return new Date(task.dueDate).getTime() <= comparisonDate.getTime();
}

export const useTaskStore = create<TaskStoreState>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (taskData) => {
        const newTask: Task = {
          id: crypto.randomUUID(),
          title: taskData.title,
          clientName: taskData.clientName,
          leadId: taskData.leadId,
          type: taskData.type,
          priority: taskData.priority,
          status: "pending",
          dueDate: taskData.dueDate,
          notes: taskData.notes,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));

        return newTask;
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, ...updates }
              : task
          ),
        }));
      },

      completeTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: "completed",
                  completedAt: new Date().toISOString(),
                }
              : task
          ),
        }));
      },

      snoozeTask: (id, newDueDate) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: "snoozed",
                  dueDate: newDueDate,
                }
              : task
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
      },

      getUpcomingTasks: (withinDays = 7) => {
        const state = get();
        const now = getNow();
        const endDate = getEndDateWithinDays(withinDays);

        return state.tasks
          .filter((task) => isPendingTask(task))
          .filter((task) => {
            const dueDate = new Date(task.dueDate);
            return dueDate >= now && dueDate <= endDate;
          })
          .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());
      },

      getOverdueTasks: () => {
        const state = get();
        const now = getNow();

        return state.tasks
          .filter((task) => isPendingTask(task))
          .filter((task) => isDueBefore(task, now))
          .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());
      },

      getTasksForLead: (leadId) => {
        const state = get();
        return state.tasks.filter((task) => task.leadId === leadId);
      },
    }),
    {
      name: "crm-tasks-storage",
      version: 1,
    }
  )
);

export function getUpcomingTasks(withinDays = 7): Task[] {
  return useTaskStore.getState().getUpcomingTasks(withinDays);
}

export function getOverdueTasks(): Task[] {
  return useTaskStore.getState().getOverdueTasks();
}

export function getTasksForLead(leadId: string): Task[] {
  return useTaskStore.getState().getTasksForLead(leadId);
}