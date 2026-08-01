import { create } from "zustand";
import type { Project, ProjectStatus } from "@/controller/types";

const PROJECT_HISTORY_STORAGE_KEY = "ah_project_history_v1";
const WORKFLOW_STORAGE_KEY = "ah_workflow_state";
const MAX_PROJECTS = 30;

export interface ProjectRecord {
  id: string;
  name: string;
  userRequest: string;
  status: ProjectStatus;
  progress: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  failureReason?: string;
}

interface ProjectHistoryStore {
  projects: ProjectRecord[];
  selectedProjectId: string | null;
  addProject: (project: ProjectRecord) => void;
  syncProject: (project: Project, failureReason?: string) => void;
  selectProject: (projectId: string) => void;
  hydrate: () => void;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function migrateWorkflow(): ProjectRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      workflow?: { id: string; name: string; nodes?: Array<{ status: string; progress: number }> };
      isRunning?: boolean;
    };
    if (!parsed.workflow?.id) return [];
    const nodes = Array.isArray(parsed.workflow.nodes) ? parsed.workflow.nodes : [];
    const progress = nodes.length
      ? Math.round(nodes.reduce((sum, node) => sum + (node.progress ?? 0), 0) / nodes.length)
      : 0;
    const hasError = nodes.some((node) => node.status === "error");
    const allCompleted = nodes.length > 0 && nodes.every((node) => node.status === "completed");
    return [{
      id: parsed.workflow.id,
      name: parsed.workflow.name,
      userRequest: parsed.workflow.name,
      status: parsed.isRunning ? "executing" : hasError ? "failed" : allCompleted ? "success" : "partial_success",
      progress,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: parsed.isRunning ? null : Date.now(),
      failureReason: hasError ? "历史工作流包含失败节点" : undefined,
    }];
  } catch {
    return [];
  }
}

function restoreProjects(): ProjectRecord[] {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROJECT_HISTORY_STORAGE_KEY) ?? "[]") as ProjectRecord[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter((item) => item?.id && item.name);
  } catch {
    // Fall through to the previous workflow migration.
  }
  return migrateWorkflow();
}

function persistProjects(projects: ProjectRecord[]) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(PROJECT_HISTORY_STORAGE_KEY, JSON.stringify(projects.slice(0, MAX_PROJECTS)));
  } catch {
    // Keep project history available for the current session.
  }
}

function toRecord(project: Project, failureReason?: string): ProjectRecord {
  return {
    id: project.id,
    name: project.name,
    userRequest: project.userRequest,
    status: project.status,
    progress: project.progress,
    createdAt: project.createdAt,
    updatedAt: Date.now(),
    completedAt: project.completedAt,
    failureReason,
  };
}

const initialProjects = restoreProjects();

export const useProjectStore = create<ProjectHistoryStore>((set) => ({
  projects: initialProjects,
  selectedProjectId: initialProjects[0]?.id ?? null,

  addProject: (project) => set((state) => {
    const projects = [project, ...state.projects.filter((item) => item.id !== project.id)].slice(0, MAX_PROJECTS);
    persistProjects(projects);
    return { projects, selectedProjectId: project.id };
  }),

  syncProject: (project, failureReason) => set((state) => {
    const record = toRecord(project, failureReason);
    const projects = [record, ...state.projects.filter((item) => item.id !== project.id)].slice(0, MAX_PROJECTS);
    persistProjects(projects);
    return { projects };
  }),

  selectProject: (projectId) => set({ selectedProjectId: projectId }),

  hydrate: () => set((state) => {
    const projects = restoreProjects();
    if (projects.length === 0) return state;
    const selectedProjectId = state.selectedProjectId && projects.some((item) => item.id === state.selectedProjectId)
      ? state.selectedProjectId
      : projects[0].id;
    return { projects, selectedProjectId };
  }),
}));
