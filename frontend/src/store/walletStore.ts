import { create } from 'zustand';
import type { Wallet } from '@/types';

interface WalletStore {
  wallet: Wallet | null;
  setWallet: (w: Wallet | null) => void;
}

export const useWalletStore = create<WalletStore>((set) => ({
  wallet: null,
  setWallet: (wallet) => set({ wallet }),
}));
