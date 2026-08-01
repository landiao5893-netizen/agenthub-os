import { create } from "zustand";
import { Workflow, EventLog } from "@/types";

const WORKFLOW_STORAGE_KEY = 'ah_workflow_state';

interface PersistedWorkflowState {
  workflow: Workflow | null;
  eventLogs: Array<Omit<EventLog, 'timestamp'> & { timestamp: string }>;
  isRunning: boolean;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function restoreWorkflowState(): Pick<WorkflowStore, 'workflow' | 'eventLogs' | 'isRunning'> {
  if (!canUseStorage()) return { workflow: null, eventLogs: [], isRunning: false };
  try {
    const raw = window.localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!raw) return { workflow: null, eventLogs: [], isRunning: false };
    const parsed = JSON.parse(raw) as PersistedWorkflowState;
    return {
      workflow: parsed.workflow ?? null,
      eventLogs: Array.isArray(parsed.eventLogs)
        ? parsed.eventLogs.map((log) => ({ ...log, timestamp: new Date(log.timestamp) }))
        : [],
      isRunning: false,
    };
  } catch {
    return { workflow: null, eventLogs: [], isRunning: false };
  }
}

function persistWorkflowState(state: Pick<WorkflowStore, 'workflow' | 'eventLogs' | 'isRunning'>) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify({
      workflow: state.workflow,
      eventLogs: state.eventLogs,
      isRunning: state.isRunning,
    }));
  } catch {
    // Keep runtime state even when localStorage is unavailable.
  }
}

interface WorkflowStore {
  workflow: Workflow | null;
  eventLogs: EventLog[];
  isRunning: boolean;
  hydrateFromStorage: () => void;

  setWorkflow: (wf: Workflow) => void;
  addEventLog: (log: EventLog) => void;
  updateNodeStatus: (
    nodeId: string,
    status: "pending" | "active" | "completed" | "error",
    progress: number
  ) => void;
  setIsRunning: (running: boolean) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflow: null,
  eventLogs: [],
  isRunning: false,

  hydrateFromStorage: () => set(restoreWorkflowState()),

  setWorkflow: (wf) => set((state) => {
    const next = { ...state, workflow: wf };
    persistWorkflowState(next);
    return { workflow: wf };
  }),

  addEventLog: (log) =>
    set((state) => {
      const eventLogs = [...state.eventLogs.slice(-99), log];
      persistWorkflowState({ ...state, eventLogs });
      return { eventLogs };
    }),

  updateNodeStatus: (nodeId, status, progress) =>
    set((state) => {
      if (!state.workflow) return state;
      const workflow = {
        ...state.workflow,
        nodes: state.workflow.nodes.map((n) =>
          n.id === nodeId ? { ...n, status, progress } : n
        ),
      };
      persistWorkflowState({ ...state, workflow });
      return { workflow };
    }),

  setIsRunning: (running) => set((state) => {
    persistWorkflowState({ ...state, isRunning: running });
    return { isRunning: running };
  }),
}));
