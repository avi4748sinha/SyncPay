import { create } from 'zustand';

type NetworkState = 'online' | 'offline';

interface NetworkStore {
  isOnline: boolean;
  setOnline: (v: boolean) => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setOnline: (v) => set({ isOnline: v }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useNetworkStore.getState().setOnline(true));
  window.addEventListener('offline', () => useNetworkStore.getState().setOnline(false));
}
