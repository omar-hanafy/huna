import { createContext } from 'react';
import type { AppStorage } from './AppStorage';
import type { MigrationResult } from './migrations/fromSakinaV1';

export type StorageProblem = 'quota' | 'unavailable' | null;

export interface StorageContextValue {
  storage: AppStorage;
  /** Non-null when a write has failed, so the UI can stop claiming "saved". */
  problem: StorageProblem;
  reportProblem: (error: unknown) => void;
  clearProblem: () => void;
  migration: MigrationResult | null;
  ready: boolean;
}

/**
 * Lives apart from the provider component so that both the component file and
 * the hook file can import it without either exporting a mix of components and
 * plain functions.
 */
export const StorageContext = createContext<StorageContextValue | null>(null);
