import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  StarIcon,
  CheckCircleIcon,
  MapPinIcon,
  MessageSquare,
  CalendarIcon,
  PlusIcon,
  Send as SendIcon,
  FileIcon,
  X as XIcon,
  Bot,
  Loader2,
  Lightbulb,
  BookOpenCheck,
  Scale,
  Gavel,
  Handshake,
  FileText,
  User,
  Clock
} from 'lucide-react';
import { askMistral } from '../utils/askLLM';
import { ContactModal } from './ContactModal';
import { ScheduleModal } from './ScheduleModal';
import { 
  analyzeLegalDocument, 
  detectLegalIntent, 
  generateResponse, 
  suggestNextActions 
} from '../utils/legalAssistant';
import type { LegalAssistantContext, DocumentAnalysis } from '../types/legalAssistant';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  fileName?: string;
  timestamp: string;
  matches?: Abogado[];
  showBadges?: boolean;
  suggestedActions?: string[];
  isTyping?: boolean;
  documentAnalysis?: DocumentAnalysis;
}

interface Abogado {
  id: string;
  nombre: string;
  especialidad: string;
  ciudad: string;
  contacto: string;
  tarifa: number;
  rating: number;
  reviews: number;
  descripcion: string;
  tags: string[];
}

// Estado inicial del contexto del asistente
const initialAssistantContext: LegalAssistantContext = {
  conversationHistory: [],
  userPreferences: {
    preferredLanguage: 'es'
  },
  documents: []
};

export default function LegalAgent() {
  // Estados
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEspecialidad, setSelectedEspecialidad] = useState<string | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<Abogado | null>(null);
  const [assistantContext, setAssistantContext] = useState<LegalAssistantContext>(initialAssistantContext);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Datos
  const ciudadesReconocibles = [
    'Santiago', 'Valparaíso', 'Concepción', 'Pucón', 
    'Pichilemu', 'Viña del Mar', 'Rancagua', 'Talca'
  ];

  const especialidadesValidas = [
    'penal', 'civil', 'laboral', 'administrativo',
    'familiar', 'mercantil', 'constitucional'
  ];

  // Base de datos de abogados
  const mockAbogados: Abogado[] = [
    {
      id: '1',
      nombre: 'Juan Pérez',
      especialidad: 'penal',
      ciudad: 'Santiago',
      contacto: 'juan@abogados.cl',
      tarifa: 50000,
      rating: 4.8,
      reviews: 124,
      descripcion: 'Abogado especializado en derecho penal con más de 10 años de experiencia.',
      tags: ['penal', 'defensa', 'juicios']
    },
    // ... otros abogados
  ];

  // Efectos
  useEffect(() => {
    // Inicializar el chat con un mensaje de bienvenida
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'agent',
          text: '¡Hola! Soy tu asistente legal. ¿En qué puedo ayudarte hoy?',
          timestamp: formatTime(new Date()),
          suggestedActions: [
            'Buscar abogado',
            'Hacer una consulta legal',
            'Agendar una cita'
          ]
        }
      ]);
    }
  }, []);

  // Funciones de utilidad
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9);
  };

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const showTypingIndicator = (): string => {
    const typingMsgId = `typing-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: typingMsgId,
        sender: 'agent',
        text: 'Escribiendo...',
        timestamp: formatTime(new Date()),
        isTyping: true
      }
    ]);
    return typingMsgId;
  };

  const removeTypingIndicator = (typingId: string): void => {
    setMessages(prev => prev.filter(msg => msg.id !== typingId));
  };

  // Manejadores de eventos
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setInput(prev => `${prev} [Archivo: ${selectedFile.name}]`);
    }
  };

  const handleRemoveFile = (): void => {
    setFile(null);
  };

  const handleBadgeClick = (esp: string): void => {
    setSelectedEspecialidad(esp);
    setMessages(prev => [...prev, {
      id: generateId(),
      sender: 'agent',
      text: `Has seleccionado ${esp}. ¿En qué ciudad necesitas al abogado? (O dime "buscar en todas las ciudades")`,
      timestamp: formatTime(new Date())
    }]);
  };

  const handleToggleChat = (): void => {
    if (open) {
      setIsVisible(false);
    } else {
      setOpen(true);
      setTimeout(() => {
        setIsVisible(true);
        scrollToBottom();
      }, 10);
    }
  };

  const handleContact = useCallback((abogado: Abogado): void => {
    setSelectedLawyer(abogado);
    setContactModalOpen(true);
  }, []);

  const handleSchedule = useCallback((abogado: Abogado): void => {
    setSelectedLawyer(abogado);
    setScheduleModalOpen(true);
  }, []);

  const handleSuggestedAction = useCallback((action: string): string => {
    if (action.includes('Buscar abogado') && selectedEspecialidad) {
      const ciudad = assistantContext.userPreferences.location || 'tu ciudad';
      return `Buscar abogado de ${selectedEspecialidad} en ${ciudad}`;
    }
    return action;
  }, [selectedEspecialidad, assistantContext.userPreferences.location]);

  const processMessage = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;
    
    const typingId = showTypingIndicator();
    setIsLoading(true);
    
    try {
      // Aquí iría la lógica para procesar el mensaje
      // ...
    } finally {
      setIsLoading(false);
      removeTypingIndicator(typingId);
    }
  }, [assistantContext]);

  const handleSubmit = useCallback(async (e?: React.FormEvent): Promise<void> => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: generateId(),
      sender: 'user',
      text: input,
      timestamp: formatTime(new Date())
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    await processMessage(input);
    scrollToBottom();
    inputRef.current?.focus();
  }, [input, isLoading, processMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Renderizado
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Botón flotante */}
      <button
        onClick={handleToggleChat}
        className={`w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label="Abrir chat de asistente legal"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Container */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-full max-w-md overflow-hidden bg-white rounded-lg shadow-xl transition-all duration-300 transform ${
          open ? (isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95') : 'opacity-0 scale-95 pointer-events-none'
        }`}
        style={{ height: open ? 'calc(100vh - 100px)' : '0' }}
        role="dialog"
        aria-label="Chat de asistente legal"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/90 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">Asistente Legal</h3>
              <p className="text-xs opacity-80">En línea</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Cerrar chat"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Mensajes */}
        <div 
          className="h-[calc(100%-120px)] overflow-y-auto p-4 space-y-4"
          aria-live="polite"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.sender === 'agent' && !message.isTyping && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 self-end mb-1">
                  <Scale className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.sender === 'user'
                    ? 'bg-primary text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                {message.text}
                
                {message.suggestedActions && message.suggestedActions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/20">
                    <p className="text-xs text-white/80 mb-1">¿Te gustaría:</p>
                    <div className="flex flex-wrap gap-1">
                      {message.suggestedActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const processedAction = handleSuggestedAction(action);
                            setInput(processedAction);
                            inputRef.current?.focus();
                          }}
                          className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 text-white transition-colors"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp}
                </div>
              </div>
              
              {message.sender === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center ml-2 self-end mb-1">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-3 bg-white">
          {file && (
            <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg mb-2">
              <div className="flex items-center space-x-2">
                <FileIcon className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-700 truncate max-w-xs">
                  {file.name}
                </span>
              </div>
              <button
                onClick={handleRemoveFile}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Eliminar archivo"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex items-end space-x-2">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Adjuntar archivo"
            >
              <PlusIcon className="w-5 h-5" />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt"
              />
            </button>
            
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje..."
                className="w-full min-h-[40px] max-h-32 py-2 px-3 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={1}
                disabled={isLoading}
                aria-label="Escribe tu mensaje"
              />
            </div>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              className="p-2 text-white bg-primary rounded-full hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Enviar mensaje"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <SendIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      {selectedLawyer && (
        <>
          <ContactModal
            isOpen={contactModalOpen}
            onClose={() => setContactModalOpen(false)}
            lawyerName={selectedLawyer.nombre}
          />
          
          <ScheduleModal
            isOpen={scheduleModalOpen}
            onClose={() => setScheduleModalOpen(false)}
            lawyerName={selectedLawyer.nombre}
            hourlyRate={selectedLawyer.tarifa}
            lawyerId={selectedLawyer.id}
          />
        </>
      )}
    </div>
  );
}
