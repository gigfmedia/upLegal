import { useContext } from 'react';
import { MessageContext } from './MessageContext';
import type { MessageContextType } from './MessageContext.types';

export function useMessages(): MessageContextType {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
}
