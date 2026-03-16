import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// 工作空间状态
interface WorkspaceState {
  currentWorkspaceId: string | null;
  setCurrentWorkspace: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    persist(
      (set) => ({
        currentWorkspaceId: null,
        setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),
      }),
      {
        name: 'workspace-storage',
      }
    ),
    { name: 'WorkspaceStore' }
  )
);

// UI状态
interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        theme: 'system',
        setTheme: (theme) => set({ theme }),
      }),
      {
        name: 'ui-storage',
      }
    ),
    { name: 'UIStore' }
  )
);

// 测试执行状态
interface TestExecutionState {
  isRunning: boolean;
  progress: number;
  currentTest: string | null;
  setRunning: (running: boolean) => void;
  setProgress: (progress: number) => void;
  setCurrentTest: (test: string | null) => void;
  reset: () => void;
}

export const useTestExecutionStore = create<TestExecutionState>()(
  devtools(
    (set) => ({
      isRunning: false,
      progress: 0,
      currentTest: null,
      setRunning: (running) => set({ isRunning: running }),
      setProgress: (progress) => set({ progress }),
      setCurrentTest: (test) => set({ currentTest: test }),
      reset: () => set({ isRunning: false, progress: 0, currentTest: null }),
    }),
    { name: 'TestExecutionStore' }
  )
);
