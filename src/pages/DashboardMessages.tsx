import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MessageSquarePlus, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChatWindow } from '@/components/messages/ChatWindow';
import type { Conversation, User } from '@/types/message';

interface Participant extends User {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

interface ConversationWithParticipants extends Omit<Conversation, 'participants'> {
  participants: Participant[];
}

// This component is used by DashboardLayout
export default function DashboardMessages() {
  const { user } = useAuth();
  const { 
    conversations, 
    currentConversation, 
    selectConversation, 
    markAsRead,
    sendMessage,
    createConversation,
    fetchMessages,
    fetchConversations,
    isLoading
  } = useMessages();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  const [newConversationEmail, setNewConversationEmail] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const navigate = useNavigate();
  
  // Set document title and fetch conversations on mount
  useEffect(() => {
    document.title = 'Mensajes | upLegal';
    fetchConversations();
  }, [fetchConversations]);
  
  // Log conversations for debugging
  useEffect(() => {
    console.log('Conversations updated:', conversations);
  }, [conversations]);
  
  // Select first conversation by default
  useEffect(() => {
    if (conversations.length > 0 && !currentConversation) {
      console.log('Selecting first conversation:', conversations[0].id);
      selectConversation(conversations[0].id);
    }
  }, [conversations, currentConversation, selectConversation]);
  
  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando conversaciones...</span>
      </div>
    );
  }

  // Get display name for a conversation
  const getConversationName = (conv: ConversationWithParticipants) => {
    if (conv.groupName) return conv.groupName;
    if (conv.participants.length === 2) {
      const otherUser = conv.participants.find((p: Participant) => p.id !== user?.id);
      return otherUser?.name || otherUser?.email || 'Conversación';
    }
    return conv.participants.map((p: Participant) => p.name || p.email).join(', ');
  };
  
  // Get last message preview
  const getLastMessagePreview = (conv: ConversationWithParticipants): string => {
    if (!conv.lastMessage) return 'Nuevo chat';
    const sender = conv.participants.find((p: Participant) => p.id === conv.lastMessage?.senderId);
    const prefix = sender?.id === user?.id ? 'Tú: ' : '';
    return prefix + (conv.lastMessage.content || 'Nuevo mensaje');
  };

  const handleNewConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConversationEmail.trim()) return;
    
    try {
      setIsCreatingConversation(true);
      // In a real app, we would make an API call here
      // For now, we'll just log it
      console.log('Creating conversation with:', newConversationEmail);
      
      // Reset form
      setNewConversationEmail('');
      setIsNewConversationModalOpen(false);
      
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv: ConversationWithParticipants) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      getConversationName(conv).toLowerCase().includes(searchLower) ||
      (conv.lastMessage?.content || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Mensajes</h1>
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="flex flex-col md:flex-row h-[calc(100vh-200px)]">
            {/* Conversation List */}
            <div className="w-full md:w-80 border-r flex flex-col">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar conversaciones..."
                    className="w-full pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full mt-3"
                  onClick={() => setIsNewConversationModalOpen(true)}
                  variant="outline"
                >
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Nueva conversación
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.map((conversation: any) => {
                  const isActive = currentConversation?.id === conversation.id;
                  const unreadCount = conversation.unreadCount || 0;
                  const otherUser = conversation.participants.find((p: any) => p.id !== user?.id);
                  
                  return (
                    <div
                      key={conversation.id}
                      className={`flex items-center p-3 border-b hover:bg-muted/50 cursor-pointer ${
                        isActive ? 'bg-muted' : ''
                      }`}
                      onClick={() => {
                        selectConversation(conversation.id);
                        if (unreadCount > 0) {
                          markAsRead(conversation.id);
                        }
                      }}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={otherUser?.avatarUrl} alt={otherUser?.name} />
                        <AvatarFallback>
                          {otherUser?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-medium truncate">
                            {getConversationName(conversation)}
                          </h3>
                          {conversation.lastMessage && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), {
                                addSuffix: true,
                                locale: es,
                              })}
                            </span>
                          )}
                        </div>
                        <p 
                          className={`text-sm truncate ${
                            unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {getLastMessagePreview(conversation)}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <span className="ml-2 flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                  );
                })}
                
                {filteredConversations.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">
                    {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white">
              {currentConversation ? (
                <>
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold">
                      {getConversationName(currentConversation)}
                    </h2>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ChatWindow conversationId={currentConversation.id} />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="text-center max-w-md">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Selecciona una conversación</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Elige una conversación existente o inicia una nueva para comenzar a chatear.
                    </p>
                    <Button 
                      onClick={() => setIsNewConversationModalOpen(true)}
                      variant="outline"
                    >
                      <MessageSquarePlus className="mr-2 h-4 w-4" />
                      Nueva conversación
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* New Conversation Modal */}
      {isNewConversationModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Nueva conversación</h3>
            <form onSubmit={handleNewConversation}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Correo electrónico del destinatario
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ejemplo@email.com"
                    value={newConversationEmail}
                    onChange={(e) => setNewConversationEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsNewConversationModalOpen(false)}
                    disabled={isCreatingConversation}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreatingConversation}>
                    {isCreatingConversation ? 'Creando...' : 'Iniciar conversación'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
