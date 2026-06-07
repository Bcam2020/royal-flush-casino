import { create } from 'zustand';

interface PlayerState {
  balance: number;
  setBalance: (balance: number) => void;
  addBalance: (amount: number) => void;
  subtractBalance: (amount: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  balance: 1000,
  setBalance: (balance) => set({ balance }),
  addBalance: (amount) => set((state) => ({ balance: state.balance + amount })),
  subtractBalance: (amount) => set((state) => ({ balance: Math.max(0, state.balance - amount) })),
}));
