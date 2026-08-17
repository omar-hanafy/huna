import { useContext } from 'react';
import { AlertContext, type AlertContextValue } from './AlertContext';

export function useAlertFlow(): AlertContextValue {
  const value = useContext(AlertContext);
  if (!value) throw new Error('useAlertFlow must be used inside an AlertProvider');
  return value;
}
