import { create } from "zustand";

/**
 * Filter state structure
 */
interface FilterState {
  search: string;
  leadSources: string[];
  leadStatuses: string[];
  tags: string[];
  fromDate: Date | null;
  toDate: Date | null;
  setSearch: (search: string) => void;
  setLeadSources: (sources: string[]) => void;
  setLeadStatuses: (statuses: string[]) => void;
  setTags: (tags: string[]) => void;
  setFromDate: (date: Date | null) => void;
  setToDate: (date: Date | null) => void;
  clearFilters: () => void;
}

const initialState = {
  search: "",
  leadSources: [],
  leadStatuses: [],
  tags: [],
  fromDate: null,
  toDate: null,
};

/**
 * Zustand store for filter state management
 */
export const useFilterStore = create<FilterState>((set) => ({
  ...initialState,
  
  setSearch: (search: string) => set({ search }),
  
  setLeadSources: (leadSources: string[]) => set({ leadSources }),
  
  setLeadStatuses: (leadStatuses: string[]) => set({ leadStatuses }),
  
  setTags: (tags: string[]) => set({ tags }),
  
  setFromDate: (fromDate: Date | null) => set({ fromDate }),
  
  setToDate: (toDate: Date | null) => set({ toDate }),
  
  clearFilters: () => set(initialState),
}));
