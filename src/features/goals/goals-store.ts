/**
 * Weekly goal store (Zustand) — mirrors useRoutineStore. ONE goal per device
 * (v1.5, spec: weekly-goals); saving a new goal replaces the old one.
 */
import { create } from 'zustand';
import { WeeklyGoal, WeeklyGoalRepo } from '../../core/storage/repos';

interface GoalsState {
  goal: WeeklyGoal | null;
  loaded: boolean;
  load: () => Promise<void>;
  saveGoal: (goal: WeeklyGoal) => Promise<void>;
  clearGoal: () => Promise<void>;
}

const repo = new WeeklyGoalRepo();

export const useGoalsStore = create<GoalsState>((set) => ({
  goal: null,
  loaded: false,

  load: async () => {
    const goal = await repo.load();
    set({ goal, loaded: true });
  },

  saveGoal: async (goal) => {
    await repo.save(goal);
    const latest = await repo.load();
    set({ goal: latest, loaded: true });
  },

  clearGoal: async () => {
    await repo.clear();
    set({ goal: null, loaded: true });
  },
}));
