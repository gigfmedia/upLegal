import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/hooks/useMessages';

interface MessageInputProps {
  conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { sendMessage } = useMessages();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = message.trim();
    if (!msg || isSending) return;
    
    setIsSending(true);
    try {
      await sendMessage({
        conversationId,
        content: msg,
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // You could add a toast notification here
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder="Escribe un mensaje..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="pr-24 w-full"
          disabled={isSending}
        />
      </div>
      <Button 
        type="submit" 
        disabled={!message.trim() || isSending}
        className="px-6"
      >
        {isSending ? (
          <>
            <span className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Enviando...
          </>
        ) : 'Enviar'}
      </Button>
    </form>
  );
}
