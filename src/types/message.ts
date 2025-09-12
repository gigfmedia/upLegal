export interface User {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  role?: 'client' | 'lawyer' | 'admin';
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  senderId: string;
  conversationId: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: {
    type: 'image' | 'document' | 'link';
    url: string;
    name?: string;
  }[];
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name?: string;
  avatarUrl?: string;
  email?: string;
  role?: 'client' | 'lawyer' | 'admin';
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  senderId: string;
  attachments?: {
    type: 'image' | 'document' | 'link';
    url: string;
    name?: string;
  }[];
}

export interface CreateConversationPayload {
  participantIds: string[];
  isGroup?: boolean;
  groupName?: string;
  initialMessage?: string;
}

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
}
