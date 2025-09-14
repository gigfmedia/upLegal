import { useState, useCallback, ReactNode, useEffect, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext/clean/useAuth';
import { MessageContext } from './MessageContext';
import type { 
  Conversation, 
  Message, 
  SendMessagePayload, 
  CreateConversationPayload,
  MessageContextType,
  User as MessageUser,
  User
} from '@/types/message';

// Helper function to create a message
const createMessage = (
  id: string,
  content: string,
  senderId: string,
  conversationId: string,
  status: Message['status'] = 'sent',
  timestamp: Date = new Date()
): Message => ({
  id,
  content,
  senderId,
  conversationId,
  status,
  timestamp
});

// Helper function to create a conversation
const createConversation = (
  id: string,
  participants: MessageUser[],
  isGroup: boolean = false,
  groupName?: string
): Conversation => ({
  id,
  participants,
  unreadCount: 0,
  isGroup,
  groupName,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastMessage: undefined
});

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    name?: string;
    email?: string;
  };
  role?: 'client' | 'lawyer' | 'admin';
};

export function MessageProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to track the current conversation ID without causing re-renders
  const currentConversationIdRef = useRef<string | null>(null);
  
  // Keep the ref in sync with the current conversation
  useEffect(() => {
    currentConversationIdRef.current = currentConversation?.id || null;
  }, [currentConversation]);
  
  // Get current user info
  const currentUser = useMemo<MessageUser | null>(() => {
    if (!user) return null;
    return {
      id: user.id,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      email: user.email || undefined,
      avatarUrl: user.user_metadata?.avatar_url,
      role: (user as unknown as { role?: 'client' | 'lawyer' | 'admin' }).role || 'client',
      isOnline: true
    };
  }, [user]);

  // Fetch conversations for the current user
  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Mock data - replace with actual API call
      const mockConversations: Conversation[] = [
        createConversation(
          '1',
          [
            currentUser,
            {
              id: 'user2',
              name: 'María González',
              email: 'maria@example.com',
              role: 'lawyer',
              isOnline: true
            }
          ],
          false
        ),
        createConversation(
          '2',
          [
            currentUser,
            {
              id: 'user3a',
              name: 'Ana López',
              email: 'ana@example.com',
              role: 'lawyer',
              isOnline: false
            },
            {
              id: 'user3b',
              name: 'Carlos Mendez',
              email: 'carlos@example.com',
              role: 'lawyer',
              isOnline: true
            }
          ],
          true,
          'Equipo Legal'
        )
      ];
      
      setConversations(mockConversations);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Mock data - replace with actual API call
      let mockMessages: Message[] = [];
      
      if (conversationId === '1') {
        mockMessages = [
          createMessage(
            'msg1',
            'Hola María, ¿cómo estás?',
            currentUser.id,
            conversationId,
            'read',
            new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
          ),
          createMessage(
            'msg2',
            '¡Hola! Estoy bien, gracias por preguntar. ¿Y tú?',
            'user2',
            conversationId,
            'read',
            new Date(Date.now() - 1000 * 60 * 90) // 1.5 hours ago
          ),
          createMessage(
            'msg3',
            'Todo bien por acá también. ¿Quedamos a las 16:00?',
            'user2',
            conversationId,
            'delivered',
            new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
          )
        ];
      } else if (conversationId === '2') {
        mockMessages = [
          createMessage(
            'msg4',
            'Hola equipo, ¿cómo va todo con mi caso?',
            currentUser.id,
            conversationId,
            'read',
            new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
          ),
          createMessage(
            'msg5',
            'Hola, soy Ana del equipo legal. Estamos revisando la documentación que enviaste.',
            'user3a',
            conversationId,
            'read',
            new Date(Date.now() - 1000 * 60 * 60 * 23) // 23 hours ago
          )
        ];
      }
      
      setMessages(mockMessages);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Select a conversation
  const selectConversation = useCallback(async (conversationId: string) => {
    if (!currentUser) return;
    
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) {
      setError('Conversation not found');
      return;
    }
    
    setCurrentConversation(conversation);
    await fetchMessages(conversationId);
  }, [conversations, fetchMessages, currentUser]);

  // Send a message
  const sendMessage = useCallback(async (payload: Omit<SendMessagePayload, 'senderId'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content: payload.content,
      senderId: currentUser.id,
      conversationId: payload.conversationId,
      status: 'sending',
      timestamp: new Date(),
      attachments: payload.attachments
    };
    
    // Optimistic update for messages
    setMessages(prev => [...prev, newMessage]);
    
    // Update conversation's last message and timestamp
    setConversations(prev => 
      prev.map(conv => 
        conv.id === payload.conversationId
          ? { 
              ...conv, 
              lastMessage: newMessage,
              updatedAt: new Date(),
              // Increment unread count for other participants
              unreadCount: currentConversationIdRef.current === payload.conversationId 
                ? 0 
                : conv.unreadCount + 1
            }
          : conv
      )
    );
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update message status to delivered
      const deliveredMessage: Message = {
        ...newMessage,
        status: 'delivered'
      };
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id ? deliveredMessage : msg
        )
      );
      
      // Update the last message in the conversation
      setConversations(prev => 
        prev.map(conv => 
          conv.id === payload.conversationId
            ? { 
                ...conv, 
                lastMessage: deliveredMessage,
                updatedAt: new Date()
              }
            : conv
        )
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
      
      // Revert on error
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
      
      // Revert conversation update
      setConversations(prev => 
        prev.map(conv => 
          conv.id === payload.conversationId && conv.lastMessage?.id === newMessage.id
            ? { 
                ...conv, 
                lastMessage: undefined,
                updatedAt: new Date(conv.updatedAt.getTime() - 1) // Revert timestamp
              }
            : conv
        )
      );
    }
  }, [currentUser]);

  // Create a new conversation
  const createConversation = useCallback(async (payload: CreateConversationPayload) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    // Ensure participantIds is an array, defaulting to an empty array if undefined
    const participantIds = Array.isArray(payload.participantIds) ? payload.participantIds : [];
    
    // Get current user's display info
    const currentUserName = currentUser.user_metadata?.name || 
                           currentUser.name || 
                           currentUser.email?.split('@')[0] || 
                           `User ${currentUser.id.substring(0, 6)}`;
    
    // Create participant objects from the IDs
    const otherParticipants: User[] = participantIds
      .filter(Boolean) // Remove any null/undefined IDs
      .filter(id => id !== currentUser.id) // Don't add current user again if they're in the list
      .map(id => ({
        id,
        name: `User ${id.substring(0, 6)}`, // Show first 6 chars of ID for display
        isOnline: false,
        // Add required fields with default values
        email: undefined,
        avatarUrl: undefined,
        role: undefined,
        lastSeen: undefined
      }));
    
    // Create current user participant object with proper typing
    const currentUserParticipant: User = {
      id: currentUser.id,
      name: currentUserName,
      email: currentUser.email || undefined,
      isOnline: true,
      avatarUrl: currentUser.user_metadata?.avatar_url || currentUser.avatar_url,
      role: currentUser.role as 'client' | 'lawyer' | 'admin' | undefined
    };
    
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      participants: [
        currentUserParticipant,
        ...otherParticipants
      ],
      unreadCount: 0,
      isGroup: payload.isGroup || false,
      groupName: payload.groupName,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setConversations(prev => [...prev, newConversation]);
    
    if (payload.initialMessage) {
      await sendMessage({
        conversationId: newConversation.id,
        content: payload.initialMessage
      });
    }
    
    return newConversation;
  }, [currentUser, sendMessage]);

  // Mark messages as read
  const markAsRead = useCallback((conversationId: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unreadCount: 0 } 
          : conv
      )
    );
  }, []);

  // Load conversations when user is authenticated
  useEffect(() => {
    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser, fetchConversations]);

  // Context value
  const contextValue: MessageContextType = {
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    sendMessage,
    createConversation,
    selectConversation,
    markAsRead,
    fetchMessages
  };

  return (
    <MessageContext.Provider value={contextValue}>
      {children}
    </MessageContext.Provider>
  );
}

export default MessageProvider;
