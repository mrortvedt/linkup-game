import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ValidationSuccess } from "./validator";

export interface ChainLink {
  word: string;
  relationLabel: string;
  creativityStars: number;
  heat: number;
  isHubWord: boolean;
  timestamp: number;
}

export type GameMode = "daily" | "endless";
export type GameStatus = "loading" | "playing" | "won" | "lost";

export interface FailedAttempt {
  word: string;
  reason: string;
  timestamp: number;
}

export interface GameState {
  mode: GameMode;
  startWord: string;
  endWord: string;
  dailySeed: number;
  chain: ChainLink[];
  status: GameStatus;
  penaltySteps: number;
  lastFailedAttempt: FailedAttempt | null;
  endlessGamesPlayed: number;
  setMode: (mode: GameMode) => void;
  initGame: (startWord: string, endWord: string, seed: number) => void;
  initEndlessGame: (startWord: string, endWord: string) => void;
  addLink: (validation: ValidationSuccess) => void;
  recordFailure: (word: string, reason: string) => void;
  clearFailure: () => void;
  completeGame: () => void;
  resetGame: () => void;
  playAgain: () => void;
  getCurrentWord: () => string;
  getChainLength: () => number;
  getTotalStars: () => number;
  getMostCreativeLink: () => ChainLink | null;
}

export function getDailySeed(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return year * 10000 + (month + 1) * 100 + day;
}

function getTodayKey(): string {
  const now = new Date();
  return now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      mode: "daily" as GameMode,
      startWord: "",
      endWord: "",
      dailySeed: 0,
      chain: [],
      status: "loading" as GameStatus,
      penaltySteps: 0,
      lastFailedAttempt: null,
      endlessGamesPlayed: 0,

      setMode: (mode) => set({ mode, status: "loading" }),

      initGame: (startWord, endWord, seed) => {
        const todayKey = getTodayKey();
        const storedKey = localStorage.getItem("linkup_day");
        const currentMode = get().mode;
        if (currentMode === "daily" && storedKey === todayKey && get().chain.length > 0 && get().startWord === startWord) {
          set({ status: "playing" });
          return;
        }
        localStorage.setItem("linkup_day", todayKey);
        set({ startWord, endWord, dailySeed: seed, chain: [], status: "playing", penaltySteps: 0, lastFailedAttempt: null });
      },

      initEndlessGame: (startWord, endWord) => {
        set({ mode: "endless", startWord, endWord, dailySeed: Date.now(), chain: [], status: "playing", penaltySteps: 0, lastFailedAttempt: null });
      },

      addLink: (validation) => {
        const { chain, penaltySteps, endWord } = get();
        const newLink: ChainLink = { word: validation.word, relationLabel: validation.relationLabel, creativityStars: validation.creativityStars, heat: validation.heat, isHubWord: validation.isHubWord, timestamp: Date.now() };
        const newPenalty = validation.isHubWord ? penaltySteps + 1 : penaltySteps;
        const isComplete = validation.word.toLowerCase() === endWord.toLowerCase();
        set({ chain: [...chain, newLink], penaltySteps: newPenalty, status: isComplete ? "won" : "playing", lastFailedAttempt: null });
      },

      recordFailure: (word, reason) => set({ lastFailedAttempt: { word, reason, timestamp: Date.now() } }),
      clearFailure: () => set({ lastFailedAttempt: null }),
      completeGame: () => {
        const { mode, endlessGamesPlayed } = get();
        set({ status: "won", endlessGamesPlayed: mode === "endless" ? endlessGamesPlayed + 1 : endlessGamesPlayed });
      },
      resetGame: () => {
        localStorage.removeItem("linkup_day");
        set({ startWord: "", endWord: "", dailySeed: 0, chain: [], status: "loading", penaltySteps: 0, lastFailedAttempt: null });
      },
      playAgain: () => set({ chain: [], status: "loading", penaltySteps: 0, lastFailedAttempt: null }),
      getCurrentWord: () => { const { chain, startWord } = get(); return chain.length === 0 ? startWord : chain[chain.length - 1].word; },
      getChainLength: () => get().chain.length,
      getTotalStars: () => get().chain.reduce((sum, link) => sum + link.creativityStars, 0),
      getMostCreativeLink: () => {
        const { chain } = get();
        if (chain.length === 0) return null;
        return chain.reduce((best, link) => {
          if (!best) return link;
          if (link.creativityStars > best.creativityStars) return link;
          if (link.creativityStars === best.creativityStars && link.heat < best.heat) return link;
          return best;
        }, null as ChainLink | null);
      },
    }),
    { name: "linkup-game", partialize: (state) => ({ mode: state.mode, startWord: state.startWord, endWord: state.endWord, dailySeed: state.dailySeed, chain: state.chain, status: state.status, penaltySteps: state.penaltySteps, endlessGamesPlayed: state.endlessGamesPlayed }) }
  )
);

export function calculateScore(chainLength: number, penaltySteps: number, totalStars: number) {
  const steps = chainLength;
  const effectiveSteps = steps + penaltySteps;
  const starBonus = totalStars * 0.5;
  const finalScore = Math.max(0, effectiveSteps - starBonus);
  return { steps, effectiveSteps, starBonus, finalScore: Math.round(finalScore * 10) / 10 };
}
