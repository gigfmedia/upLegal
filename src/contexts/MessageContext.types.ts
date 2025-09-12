import type { 
  Conversation, 
  Message, 
  SendMessagePayload, 
  CreateConversationPayload 
} from '@/types/message';

export interface MessageContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (payload: Omit<SendMessagePayload, 'senderId'>) => Promise<void>;
  createConversation: (payload: CreateConversationPayload) => Promise<Conversation>;
  selectConversation: (conversationId: string) => void;
  markAsRead: (conversationId: string) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
}
