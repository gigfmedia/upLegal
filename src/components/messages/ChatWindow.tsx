import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageInput } from '@/components/messages/MessageInput';
import { useEffect } from 'react';

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { messages, isLoading, currentConversation, fetchMessages } = useMessages();
  const { user } = useAuth();
  
  // Fetch messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    }
  }, [conversationId, fetchMessages]);
  
  // Filter messages for the current conversation
  const conversationMessages = messages.filter(
    message => message.conversationId === conversationId
  );
  
  console.log('Current conversation messages:', conversationMessages);
  
  if (isLoading || !currentConversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No hay mensajes en esta conversación. ¡Envía el primero!
          </div>
        ) : (
          <div className="space-y-4">
            {conversationMessages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.senderId === user?.id
                      ? 'bg-primary text-primary-foreground rounded-br-none' 
                      : 'bg-muted rounded-bl-none'
                  }`}
                >
                  <p className="break-words">{message.content}</p>
                  <p 
                    className={`text-xs mt-1 text-right ${
                      message.senderId === user?.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}
                  >
                    {formatDistanceToNow(new Date(message.timestamp), { 
                      addSuffix: true, 
                      locale: es 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Message Input */}
      <div className="border-t p-4 bg-background">
        <MessageInput conversationId={conversationId} />
      </div>
    </div>
  );
}
