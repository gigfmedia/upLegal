import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  StarIcon,
  CheckCircleIcon,
  MapPinIcon,
  MessageCircleIcon,
  CalendarIcon,
  PlusIcon,
  SendIcon,
  FileIcon,
  XIcon,
} from 'lucide-react';
import { askMistral } from '../utils/askLLM';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  fileName?: string;
  timestamp: string;
  matches?: Abogado[];
  showBadges?: boolean;
}

interface Abogado {
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

export default function LegalAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEspecialidad, setSelectedEspecialidad] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Ciudades y especialidades reconocibles
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
      nombre: "María González",
      especialidad: "penal",
      ciudad: "Santiago",
      contacto: "maria@legal.cl",
      tarifa: 150000,
      rating: 4.8,
      reviews: 45,
      descripcion: "Especialista en derecho penal con 10 años de experiencia",
      tags: ["delitos", "defensa", "tribunal"]
    },
    {
      nombre: "Carlos Rodríguez",
      especialidad: "civil",
      ciudad: "Valparaíso",
      contacto: "carlos@abogados.cl",
      tarifa: 120000,
      rating: 4.6,
      reviews: 32,
      descripcion: "Experto en contratos y disputas civiles",
      tags: ["contratos", "demandas", "mediación"]
    },
    {
      nombre: "Ana Martínez",
      especialidad: "laboral",
      ciudad: "Concepción",
      contacto: "ana@trabajo.cl",
      tarifa: 100000,
      rating: 4.9,
      reviews: 67,
      descripcion: "Defensora de derechos laborales y sindicales",
      tags: ["despidos", "sindicatos", "negociación"]
    },
    {
      nombre: "Luis Fernández",
      especialidad: "familiar",
      ciudad: "Santiago",
      contacto: "luis@familia.cl",
      tarifa: 110000,
      rating: 4.7,
      reviews: 28,
      descripcion: "Mediador familiar certificado",
      tags: ["divorcio", "custodia", "mediación"]
    }
  ];

  // Inicialización del chat
  useEffect(() => {
    const savedMessages = localStorage.getItem('legalAgentMessages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      setMessages([
        {
          id: generateId(),
          sender: 'agent',
          text: 'Hola 👋, ¿qué tipo de abogado necesitas?',
          timestamp: formatTime(new Date()),
        },
        {
          id: generateId(),
          sender: 'agent',
          text: 'Puedes seleccionar una especialidad:',
          timestamp: formatTime(new Date()),
          showBadges: true,
        }
      ]);
    }

    const savedOpen = localStorage.getItem('legalAgentOpen');
    if (savedOpen === 'true') {
      setOpen(true);
      setTimeout(() => setIsVisible(true), 10);
    }
  }, []);

  // Persistencia y auto-scroll
  useEffect(() => {
    localStorage.setItem('legalAgentMessages', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('legalAgentOpen', open.toString());
  }, [open]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Animación de cierre
  useEffect(() => {
    if (!isVisible) {
      const timeout = setTimeout(() => setOpen(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isVisible]);

  // Funciones auxiliares
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const normalize = (str: string) =>
    str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

  // Reconocimiento de ciudad mejorado
  const reconocerCiudad = (texto: string): string | null => {
    const textoNormalizado = normalize(texto);
    for (const ciudad of ciudadesReconocibles) {
      if (textoNormalizado.includes(normalize(ciudad))) {
        return ciudad;
      }
    }
    return null;
  };

  // Procesamiento de mensajes
  const processInput = useCallback(
    async (text: string) => {
      const prompt = `
Eres un asistente legal chileno. El usuario necesita ayuda legal.

Tu tarea:
- Detecta si está buscando un abogado, documento o interpretación de texto legal.
- Si busca un abogado, detecta la especialidad (ej: laboral, penal, civil...) y la ciudad.
- Devuélvelo como JSON con:
{
  "tipo": "abogado" | "documento" | "analisis",
  "especialidad": "...",
  "ciudad": "...",
  "respuesta": "texto de respuesta que le das al usuario"
}

Mensaje del usuario:
"${text}"
      `.trim();

      try {
        const llmResponse = await askMistral(prompt);

        // Tratar de extraer JSON desde la respuesta
        const match = llmResponse.match(/\{[\s\S]+\}/);
        if (!match) {
          setMessages(prev => [...prev, {
            id: generateId(),
            sender: 'agent',
            text: 'Lo siento, no pude entender tu solicitud. ¿Puedes reformularla?',
            timestamp: formatTime(new Date()),
          }]);
          return;
        }

        const parsed = JSON.parse(match[0]);
        const { tipo, especialidad, ciudad, respuesta } = parsed;

        // Filtrar abogados si aplica
        let matches: Abogado[] = [];
        if (tipo === 'abogado') {
          matches = mockAbogados.filter((a) => {
            const ciudadMatch = ciudad ? normalize(a.ciudad).includes(normalize(ciudad)) : true;
            const especialidadMatch = especialidad ? normalize(a.especialidad).includes(normalize(especialidad)) : true;
            return ciudadMatch && especialidadMatch;
          });
        }

        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            sender: 'agent',
            text: respuesta,
            timestamp: formatTime(new Date()),
            matches: matches.length > 0 ? matches : undefined,
          },
        ]);
      } catch (err) {
        console.error(err);
        setMessages(prev => [...prev, {
          id: generateId(),
          sender: 'agent',
          text: 'Ocurrió un error al procesar tu mensaje.',
          timestamp: formatTime(new Date()),
        }]);
      }
    },
    []
  );

  const handleSend = () => {
    if (!input.trim() && !file) return;
    
    const newMessage: Message = {
      id: generateId(),
      sender: 'user',
      text: input,
      ...(file && { fileName: file.name }),
      timestamp: formatTime(new Date()),
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setFile(null);
    setLoading(true);

    setTimeout(() => {
      processInput(input + (file ? ` (archivo adjunto: ${file.name})` : ''));
      setLoading(false);
    }, 500);
  };

  const handleBadgeClick = (esp: string) => {
    setSelectedEspecialidad(esp);
    setMessages(prev => [...prev, {
      id: generateId(),
      sender: 'agent',
      text: `Has seleccionado ${esp}. ¿En qué ciudad necesitas al abogado? (O dime "buscar en todas las ciudades")`,
      timestamp: formatTime(new Date()),
    }]);
  };

  const handleToggleChat = () => {
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

  return (
    <>
      {/* Chat Container */}
      {open && (
        <div className="fixed bottom-6 right-6 w-full max-w-md z-50">
          <div
            className={`bg-card p-4 rounded-2xl shadow-2xl w-full transition-all duration-300 transform border ${
              isVisible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-10 opacity-0'
            }`}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-xl font-semibold text-foreground">👩‍⚖️ Asistente Legal</h1>
              <button
                onClick={handleToggleChat}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-accent"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Mensajes */}
            <div className="h-[50vh] overflow-y-auto flex flex-col gap-2 p-2 rounded bg-background">
              {messages.map((msg) => (
                <React.Fragment key={msg.id}>
                  <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`p-2 rounded-xl max-w-[80%] text-sm inline-block ${
                        msg.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <div>{msg.text}</div>
                      {msg.fileName && (
                        <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
                          <FileIcon className="w-4 h-4" />
                          {msg.fileName}
                        </div>
                      )}
                      <div className="text-[10px] mt-1 text-right opacity-70">
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>

                  {/* Badges de especialidades cuando el mensaje lo requiere */}
                  {msg.showBadges && (
                    <div className="flex flex-wrap gap-2 mt-2 max-w-[80%]">
                      {especialidadesValidas.map((esp) => (
                        <button
                          key={esp}
                          onClick={() => handleBadgeClick(esp)}
                          className={`text-xs px-3 py-1 rounded-full transition ${
                            selectedEspecialidad === esp
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground'
                          }`}
                        >
                          {esp}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.matches && msg.matches.length > 0 && (
                    <Card className="mt-2 bg-card border max-w-[80%] shadow-sm self-start animate-in fade-in">
                      <CardContent className="p-3">
                        <h4 className="font-semibold text-sm mb-2 text-foreground">Abogados encontrados:</h4>
                        {msg.matches.slice(0, 2).map((abogado, idx) => (
                          <div key={idx} className="border-b border-border pb-2 mb-2 last:border-b-0 last:mb-0">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <h5 className="font-medium text-sm text-foreground">{abogado.nombre}</h5>
                                <p className="text-xs text-muted-foreground capitalize">{abogado.especialidad}</p>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1">
                                  <StarIcon className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs font-medium">{abogado.rating}</span>
                                  <span className="text-xs text-muted-foreground">({abogado.reviews})</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mb-1">
                              <MapPinIcon className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{abogado.ciudad}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{abogado.descripcion}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-foreground">
                                ${abogado.tarifa.toLocaleString()}/hora
                              </span>
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                                  <MessageCircleIcon className="w-3 h-3 mr-1" />
                                  Contactar
                                </Button>
                                <Button size="sm" variant="default" className="text-xs h-6 px-2">
                                  <CalendarIcon className="w-3 h-3 mr-1" />
                                  Agendar
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </React.Fragment>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="p-2 rounded-xl bg-muted text-muted-foreground text-sm">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-100"></div>
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-muted rounded-full">
              <button
                className="hover:bg-accent text-primary-foreground bg-primary p-1.5 rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <PlusIcon className="w-5 h-5" />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </button>
              <input
                className="flex-grow bg-transparent focus:outline-none text-sm text-foreground placeholder:text-muted-foreground"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu mensaje..."
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={handleSend}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-4 py-1.5 rounded-full font-medium"
                disabled={loading}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      {!open && (
        <button
          onClick={handleToggleChat}
          className="fixed bottom-6 right-6 bg-primary hover:bg-primary/90 text-primary-foreground p-4 rounded-full shadow-lg z-50 transition-transform hover:scale-110"
        >
          <MessageCircleIcon className="w-6 h-6" />
        </button>
      )}
    </>
  );
}