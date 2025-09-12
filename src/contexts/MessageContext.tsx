import { createContext } from 'react';
import type { MessageContextType } from './MessageContext.types';

export const MessageContext = createContext<MessageContextType | undefined>(undefined);
