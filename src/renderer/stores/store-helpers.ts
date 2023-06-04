import { StateCreator, create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Create a store with common middlewares
 */
export function createStore<T>(store: StateCreator<T, [], []>) {
  return create<T>()(devtools(store));
}