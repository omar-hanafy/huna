import { useContext } from 'react';
import type { AppStorage } from './AppStorage';
import { StorageContext, type StorageContextValue } from './context';

export function useStorageContext(): StorageContextValue {
  const value = useContext(StorageContext);
  if (!value) throw new Error('useStorageContext must be used inside a StorageProvider');
  return value;
}

export function useStorage(): AppStorage {
  return useStorageContext().storage;
}
