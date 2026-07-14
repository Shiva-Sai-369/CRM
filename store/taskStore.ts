import { create } from "zustand";
import type { Task, TaskType, TaskPriority, TaskStatus } from "@/types/task";
import { getSupabaseClient } from "@/lib/supabase";

interface TaskStoreState {
  tasks: Task[];
  loading: boolean;
  error: string | null;

  fetchTasks: () => Promise<Task[]>;
  createTask: (taskData: Omit<Task, "id" | "createdAt" | "status" | "completedAt" | "leadName">) => Promise<Task>;
  updateTask: (id: number, updates: Partial<Task>) => Promise<void>;
  completeTask: (id: number) => Promise<void>;
  snoozeTask: (id: number, newDueDate: string) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
}

interface DbTaskRow {
  id: number;
  title: string;
  lead_id: number | null;
  task_type: string;
  priority: string;
  status: string;
  due_date: string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  sheet_leads?: { name: string | null } | { name: string | null }[] | null;
}

function mapRowToTask(row: DbTaskRow): Task {
  let leadName: string | null = null;
  if (row.sheet_leads) {
    if (Array.isArray(row.sheet_leads)) {
      leadName = row.sheet_leads[0]?.name ?? null;
    } else {
      leadName = row.sheet_leads.name ?? null;
    }
  }

  return {
    id: Number(row.id),
    title: row.title,
    leadId: row.lead_id ? Number(row.lead_id) : null,
    type: (row.task_type || "follow-up") as TaskType,
    priority: (row.priority || "medium") as TaskPriority,
    status: (row.status || "pending") as TaskStatus,
    dueDate: row.due_date,
    notes: row.notes,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    leadName,
  };
}

export const useTaskStore = create<TaskStoreState>()((set) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*, sheet_leads(name)")
        .order("due_date", { ascending: true });

      if (error) throw error;

      const tasks = (data || []).map((row: any) => mapRowToTask(row));
      set({ tasks, loading: false });
      return tasks;
    } catch (err: any) {
      const errMsg = err.message || "Failed to fetch tasks";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  createTask: async (taskData) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      const dbPayload = {
        title: taskData.title,
        lead_id: taskData.leadId,
        task_type: taskData.type,
        priority: taskData.priority,
        status: "pending",
        due_date: taskData.dueDate,
        notes: taskData.notes,
      };

      const { data, error } = await supabase
        .from("tasks")
        .insert(dbPayload)
        .select("*, sheet_leads(name)")
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned from task creation");

      const newTask = mapRowToTask(data as any);
      set((state) => ({
        tasks: [...state.tasks, newTask],
        loading: false,
      }));
      return newTask;
    } catch (err: any) {
      const errMsg = err.message || "Failed to create task";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  updateTask: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      
      const dbUpdates: Record<string, any> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.leadId !== undefined) dbUpdates.lead_id = updates.leadId;
      if (updates.type !== undefined) dbUpdates.task_type = updates.type;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;

      const { data, error } = await supabase
        .from("tasks")
        .update(dbUpdates)
        .eq("id", id)
        .select("*, sheet_leads(name)")
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned from task update");

      const updatedTask = mapRowToTask(data as any);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
        loading: false,
      }));
    } catch (err: any) {
      const errMsg = err.message || "Failed to update task";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  completeTask: async (id) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed", completed_at: now })
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, status: "completed", completedAt: now } : t
        ),
        loading: false,
      }));
    } catch (err: any) {
      const errMsg = err.message || "Failed to complete task";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  snoozeTask: async (id, newDueDate) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("tasks")
        .update({ status: "snoozed", due_date: newDueDate })
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, status: "snoozed", dueDate: newDueDate } : t
        ),
        loading: false,
      }));
    } catch (err: any) {
      const errMsg = err.message || "Failed to snooze task";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  deleteTask: async (id) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        loading: false,
      }));
    } catch (err: any) {
      const errMsg = err.message || "Failed to delete task";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },
}));