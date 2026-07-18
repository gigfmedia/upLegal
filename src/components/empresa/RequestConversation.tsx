import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Send, FileText, Download, Circle, User, CheckCircle2, Clock, MessageSquare, Loader2 } from 'lucide-react'

interface ConversationEvent {
  id: string
  type: 'system' | 'message'
  label?: string
  content?: string
  file_url?: string | null
  file_name?: string | null
  sender?: { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null } | null
  sender_id?: string
  time: string
}

interface Props {
  requestId: string
  companyId: string
  lawyerId: string | null
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created: Circle,
  assigned: User,
  first_response: MessageSquare,
  closed: CheckCircle2,
}

export default function RequestConversation({ requestId, companyId, lawyerId }: Props) {
  const { user } = useAuth()
  const [events, setEvents] = useState<ConversationEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(`/api/empresas/requests/${requestId}/conversation`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      setEvents(data.conversation || [])
    } catch (error) {
      console.error('[Conversation] Error loading:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [requestId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  const handleSend = async () => {
    if (!input.trim() || sending || !user) return
    setSending(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(`/api/empresas/requests/${requestId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: input.trim() }),
      })
      if (!res.ok) throw new Error('Error al enviar')
      const data = await res.json()
      console.log('[Conversation] POST response:', data)
      const message = data.message
      setInput('')
      setEvents(prev => [...prev, {
        id: message.id,
        type: 'message',
        content: message.content,
        file_url: message.file_url || null,
        file_name: message.file_name || null,
        sender: message.sender,
        sender_id: message.sender_id,
        time: message.created_at,
      }].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()))
    } catch (error) {
      console.error('[Conversation] Error sending:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-gray-400">Cargando conversación...</div>
  }

  if (events.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MessageSquare className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-500 mb-4">No hay actividad en esta solicitud aún.</p>
        {user && (
          <div className="flex gap-2 max-w-md mx-auto">
            <Input
              placeholder="Escribe un mensaje..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button size="sm" onClick={handleSend} disabled={!input.trim() || sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-0">
      {events.map((ev, idx) => {
        const isLast = idx === events.length - 1
        const isOwn = ev.type === 'message' && ev.sender_id === user?.id

        if (ev.type === 'system') {
          const Icon = TYPE_ICONS[ev.id] || Clock
          return (
            <div key={ev.id} className="flex gap-3 pb-4 relative">
              {!isLast && <div className="absolute left-[5px] top-4 bottom-0 w-px bg-gray-200" />}
              <div className="mt-0.5 shrink-0">
                <Icon className="w-3 h-3 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{ev.label}</p>
                <p className="text-xs text-gray-400">
                  {new Date(ev.time).toLocaleString('es-CL')}
                </p>
              </div>
            </div>
          )
        }

        return (
          <div key={ev.id} className={`flex gap-3 pb-4 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <Avatar className="w-7 h-7 shrink-0 mt-0.5">
              <AvatarImage src={ev.sender?.avatar_url || undefined} />
              <AvatarFallback className="bg-green-900 text-green-600 text-xs font-medium">
                {ev.sender
                  ? (ev.sender.first_name?.[0] || ev.sender.last_name?.[0] || 'U').toUpperCase()
                  : '?'}
              </AvatarFallback>
            </Avatar>
            <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
              <div className={`rounded-lg px-3.5 py-2 ${
                isOwn ? 'bg-gray-900 text-white rounded-br-none' : 'bg-gray-100 text-gray-900 rounded-bl-none'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{ev.content}</p>
                {ev.file_url && (
                  <a href={ev.file_url} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center gap-1.5 mt-1.5 text-xs underline ${isOwn ? 'text-white/80' : 'text-gray-500'}`}>
                    <FileText className="w-3 h-3" />
                    {ev.file_name || 'Descargar archivo'}
                  </a>
                )}
              </div>
              <p className={`text-[10px] text-gray-400 mt-0.5 ${isOwn ? 'text-right' : ''}`}>
                {ev.sender?.first_name} · {new Date(ev.time).toLocaleString('es-CL')}
              </p>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <Input
          placeholder="Escribe un mensaje..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={!input.trim() || sending}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
