import { createContext } from 'react';
import type { MessageContextType, Conversation } from '@/types/message';

const defaultContextValue: MessageContextType = {
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  error: null,
  sendMessage: async () => {},
  createConversation: async () => ({
    id: '',
    participants: [],
    unreadCount: 0,
    isGroup: false,
    createdAt: new Date(),
    updatedAt: new Date()
  } as Conversation),
  selectConversation: () => {},
  markAsRead: () => {},
  fetchMessages: async () => {}
};

export const MessageContext = createContext<MessageContextType>(defaultContextValue);
