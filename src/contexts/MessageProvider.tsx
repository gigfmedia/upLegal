import { useState, useCallback, ReactNode, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { MessageContext } from './MessageContext';
import type { 
  Conversation, 
  Message, 
  SendMessagePayload, 
  CreateConversationPayload,
  User
} from '@/types/message';
import type { MessageContextType } from './MessageContext.types';

// Extend the User interface to include avatarUrl
type UserWithAvatar = User & {
  avatarUrl?: string;
  role?: 'client' | 'lawyer' | 'admin';
};

export function MessageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Helper to create a message with proper typing
  const createMessage = useCallback((
    id: string, 
    content: string, 
    senderId: string, 
    conversationId: string, 
    status: Message['status'] = 'delivered',
    timestamp: Date = new Date()
  ): Message => ({
    id,
    content,
    senderId,
    conversationId,
    status,
    timestamp
  }), []);
  
  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string): Promise<void> => {
    console.log('fetchMessages called with conversationId:', conversationId);
    if (!user) {
      console.log('No user found, returning early');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Loading mock messages for conversation:', conversationId);
      let mockMessages: Message[] = [];
      
      if (conversationId === '1') {
        // Conversation with María González
        mockMessages = [
          createMessage(
            'msg1',
            'Hola María, ¿cómo estás?',
            user.id,
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
        // Group conversation with Equipo Legal
        mockMessages = [
          createMessage(
            'msg4',
            'Hola equipo, ¿cómo va todo con mi caso?',
            user.id,
            conversationId,
            'read',
            new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
          ),
          createMessage(
            'msg5',
            'Hola, soy Ana del equipo legal. Estamos revisando la documentación que enviaste.',
            'user3b',
            conversationId,
            'read',
            new Date(Date.now() - 1000 * 60 * 60 * 23) // 23 hours ago
          ),
          createMessage(
            'msg6',
            '¿Podría proporcionarnos su número de RUT nuevamente para verificar la información?',
            'user3c',
            conversationId,
            'read',
            new Date(Date.now() - 1000 * 60 * 60 * 22) // 22 hours ago
          ),
          createMessage(
            'msg7',
            'Hemos revisado su caso y necesitamos algunos documentos adicionales para proceder con la demanda.',
            'user3b',
            conversationId,
            'delivered',
            new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
          )
        ];
      } else {
        // Default conversation
        mockMessages = [
          createMessage(
            'msg8',
            'Hola, ¿cómo estás?',
            user.id,
            conversationId,
            'delivered',
            new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
          ),
          createMessage(
            'msg9',
            '¡Hola! Estoy bien, gracias por preguntar. ¿Y tú?',
            'user2',
            conversationId,
            'read',
            new Date(Date.now() - 1000 * 55 * 60) // 55 minutes ago
          )
        ];
      }
      
      console.log('Setting messages:', mockMessages);
      setMessages(mockMessages);
    } catch (err) {
      const errorMsg = 'Error al cargar los mensajes';
      setError(errorMsg);
      console.error('Error fetching messages:', err);
      throw new Error(errorMsg);
    } finally {
      console.log('Finished loading messages');
      setIsLoading(false);
    }
  }, [user, createMessage]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Mock data for development
      const mockConversations: Conversation[] = [
        {
          id: '1',
          participants: [
            { 
              ...user,
              name: user.name || 'Tú',
              role: 'client' as const
            } as UserWithAvatar,
            { 
              id: 'user2', 
              name: 'Dra. María González', 
              email: 'maria.gonzalez@example.com',
              role: 'lawyer' as const,
              avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg'
            } as UserWithAvatar
          ],
          lastMessage: createMessage(
            'msg3',
            'Perfecto, nos vemos a las 16:00 en mi oficina. Traiga los documentos que mencionamos.',
            'user2',
            '1',
            'delivered',
            new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
          ),
          unreadCount: 1,
          isGroup: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          updatedAt: new Date(),
        },
        {
          id: '2',
          participants: [
            { 
              ...user,
              name: user.name || 'Tú',
              role: 'client' as const
            } as UserWithAvatar,
            { 
              id: 'user3', 
              name: 'Estudio Jurídico Pérez & Asociados',
              email: 'contacto@perezasociados.cl',
              role: 'lawyer' as const,
              avatarUrl: 'https://ui-avatars.com/api/?name=Pérez+Asociados&background=0D8ABC&color=fff'
            } as UserWithAvatar
          ],
          lastMessage: createMessage(
            'msg7',
            'Hemos revisado su caso y necesitamos algunos documentos adicionales para proceder con la demanda.',
            'user3b',
            '2',
            'delivered',
            new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
          ),
          unreadCount: 0,
          isGroup: true,
          groupName: 'Estudio Jurídico Pérez & Asociados',
          groupAvatar: 'https://ui-avatars.com/api/?name=Pérez+Asociados&background=0D8ABC&color=fff',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
          updatedAt: new Date(),
        }
      ];
      
      setConversations(mockConversations);
    } catch (err) {
      setError('Error al cargar las conversaciones');
      console.error('Error fetching conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, createMessage]);

  // Select a conversation
  const selectConversation = useCallback(async (conversationId: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
        await fetchMessages(conversationId);
      }
    } catch (err) {
      setError('Error al seleccionar la conversación');
      console.error('Error selecting conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conversations, fetchMessages, user]);

  // Send a message
  const sendMessage = useCallback(async (payload: Omit<SendMessagePayload, 'senderId'>): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content: payload.content,
      senderId: user.id,
      conversationId: payload.conversationId,
      status: 'sending',
      timestamp: new Date(),
    };
    
    // Optimistically update the UI
    setMessages(prev => [...prev, newMessage]);
    
    try {
      // In a real app, this would be an API call
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, status: 'delivered' as const } 
              : msg
          )
        );
      }, 1000);
      
      // Update the conversation's last message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === payload.conversationId 
            ? { 
                ...conv, 
                lastMessage: newMessage,
                updatedAt: new Date()
              } 
            : conv
        )
      );
    } catch (err) {
      setError('Error al enviar el mensaje');
      console.error('Error sending message:', err);
      
      // Update message status to failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'failed' as const } 
            : msg
        )
      );
      
      throw err;
    }
  }, [user]);
  
  // Mark messages as read in a conversation
  const markAsRead = useCallback((conversationId: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
  }, []);

  // Create a new conversation
  const createConversation = useCallback(async (payload: CreateConversationPayload) => {
    if (!user) throw new Error('User not authenticated');
    
    // In a real app, we would fetch the participant details from the server
    const participantDetails = await Promise.all(
      payload.participantIds.map(async (id) => {
        // This is a mock implementation - in a real app, you would fetch user details
        return { id, name: `User ${id}`, email: `user${id}@example.com` };
      })
    );
    
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      participants: [
        { ...user, name: user.name || 'Tú' },
        ...participantDetails
      ],
      lastMessage: null,
      unreadCount: 0,
      isGroup: payload.isGroup || false,
      ...(payload.isGroup && { 
        groupName: payload.groupName || 'New Group',
        groupAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.groupName || 'Group')}`
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setConversations(prev => [newConversation, ...prev]);
    return newConversation;
  }, [user]);
  
  // Load initial data
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const value: MessageContextType = {
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    sendMessage,
    createConversation,
    selectConversation,
    markAsRead,
    fetchMessages,
    fetchConversations,
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
}

export default MessageProvider;
