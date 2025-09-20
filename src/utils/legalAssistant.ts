// Tipos para el asistente legal
type MessageRole = 'user' | 'assistant';

interface ConversationMessage {
  role: MessageRole;
  content: string;
}

interface UserPreferences {
  location?: string;
  legalTopic?: string;
  preferredLanguage?: string;
}

interface Document {
  name: string;
  type: string;
  content: string;
  analysis?: string;
}

export interface LegalContext {
  conversationHistory: ConversationMessage[];
  userPreferences: UserPreferences;
  documents: Document[];
}

// Base de conocimiento legal (ejemplo simplificado)
const legalKnowledgeBase = {
  penal: {
    description: "Derecho penal: Regula los delitos y las penas.",
    commonIssues: [
      "Robo", "Hurto", "Lesiones", "Homicidio", "Estafa",
      "Amenazas", "Violencia intrafamiliar", "Conducción en estado de ebriedad"
    ],
    procedures: [
      "Denuncia", "Querella", "Sobreseimiento", "Recursos", "Medidas cautelares"
    ]
  },
  civil: {
    description: "Derecho civil: Regula las relaciones entre particulares.",
    commonIssues: [
      "Contratos", "Responsabilidad civil", "Sucesiones", "Propiedad",
      "Arrendamiento", "Compraventa", "Daños y perjuicios"
    ]
  },
  laboral: {
    description: "Derecho laboral: Regula las relaciones laborales.",
    commonIssues: [
      "Despido", "Despido injustificado", "Horas extras", "Término de contrato",
      "Acoso laboral", "Accidentes de trabajo", "Liquidaciones"
    ]
  }
};

// Analizador de documentos legales (simulado)
export async function analyzeLegalDocument(text: string, context: LegalContext) {
  // En una implementación real, esto podría usar un servicio de NLP o LLM
  const keywords = {
    contract: ['contrato', 'cláusula', 'partes', 'obligaciones', 'plazo', 'rescisión'],
    lawsuit: ['demanda', 'demandado', 'demandante', 'juez', 'tribunal', 'sentencia'],
    notice: ['notificación', 'cédula', 'requerimiento', 'intimación']
  };

  const docType = Object.entries(keywords).find(([_, terms]) => 
    terms.some(term => text.toLowerCase().includes(term))
  )?.[0] || 'documento legal';

  return {
    type: docType,
    summary: `Se ha identificado un ${docType}. ` +
             `Contiene aproximadamente ${text.split(/\s+/).length} palabras.`,
    relevantLaws: ['Código Civil', 'Código de Procedimiento Civil'] // Ejemplo
  };
}

// Mejorar el reconocimiento de intenciones
export function detectLegalIntent(text: string, context: LegalContext) {
  const lowerText = text.toLowerCase();
  
  // Detección de saludos
  if (/(hola|buenos|buenas|saludos|holi|hey|hi|hello)/i.test(lowerText)) {
    return 'saludo';
  }
  
  // Detección de consultas legales
  if (/(necesito|quiero|busco|dónde|donde|como|cuánto|cuanto|cuando|quien|quién)/i.test(lowerText)) {
    if (/(abogad[oa]|asesor[oa]|especialista)/i.test(lowerText)) {
      return 'buscar_abogado';
    }
    if (/(contrato|demanda|demandar|demandarme|demandaron|demandaron a)/i.test(lowerText)) {
      return 'consulta_legal';
    }
    if (/(cuánto cuesta|precio|honorarios|tarifa|cuánto sale)/i.test(lowerText)) {
      return 'consulta_precios';
    }
    return 'consulta_general';
  }
  
  // Detección de agradecimientos
  if (/(gracias|muchas gracias|te agradezco|agradecido|agradecida)/i.test(lowerText)) {
    return 'agradecimiento';
  }
  
  return 'no_reconocido';
}

// Generar respuestas más inteligentes
export async function generateResponse(
  message: string, 
  context: LegalContext,
  intent?: string
): Promise<{response: string; context: LegalContext}> {
  // Actualizar el historial de la conversación
  const updatedContext: LegalContext = {
    ...context,
    conversationHistory: [
      ...context.conversationHistory,
      { role: 'user' as const, content: message }
    ],
    userPreferences: { ...context.userPreferences }
  };

  // Determinar la intención si no se proporciona
  if (!intent) {
    intent = detectLegalIntent(message, updatedContext);
  }

  let response = '';
  
  // Extraer posibles áreas de especialidad mencionadas
  const mentionedSpecialties = Object.keys(legalKnowledgeBase).filter(area => 
    message.toLowerCase().includes(area)
  );
  
  // Actualizar contexto con especialidades mencionadas
  if (mentionedSpecialties.length > 0 && !updatedContext.userPreferences.legalTopic) {
    updatedContext.userPreferences.legalTopic = mentionedSpecialties[0];
  }
  
  switch (intent) {
    case 'saludo':
      response = "¡Hola! Soy tu asistente legal. ¿En qué puedo ayudarte hoy? " +
                "Puedo ayudarte con consultas legales, búsqueda de abogados o análisis de documentos.";
      break;
      
    case 'buscar_abogado': {
      response = "Entiendo que necesitas un abogado. Para ayudarte mejor, ¿podrías decirme " +
                "en qué área del derecho necesitas asesoría? Por ejemplo: penal, civil, laboral, etc.";
      
      if (updatedContext.userPreferences.legalTopic) {
        const specialty = updatedContext.userPreferences.legalTopic;
        response += `\n\nVeo que mencionas ${specialty}. ` +
                   `¿Te gustaría que te ayude a encontrar un abogado especializado en ${specialty}?`;
      }
      break;
    }
      
    case 'consulta_legal': {
      response = "Entiendo que tienes una consulta legal. Para darte la mejor asesoría, " +
                "¿podrías proporcionarme más detalles sobre tu situación? Por ejemplo:\n" +
                "- ¿Qué tipo de asunto legal es?\n" +
                "- ¿Cuándo ocurrió?\n" +
                "- ¿Hay alguna documentación relevante que puedas compartir?";
      break;
    }
      
    case 'consulta_precios': {
      response = "Los honorarios legales pueden variar según la complejidad del caso, " +
                "la experiencia del abogado y la ubicación. Como referencia general:\n\n" +
                "- Consulta inicial: $20.000 - $100.000 CLP\n" +
                "- Asesoría legal simple: $50.000 - $200.000 CLP\n" +
                "- Representación legal: desde $300.000 CLP\n\n" +
                "¿Te gustaría que te ayude a encontrar un abogado dentro de tu presupuesto?";
      break;
    }
      
    case 'agradecimiento': {
      response = "¡De nada! Estoy aquí para ayudarte. ¿Hay algo más en lo que pueda asistirte hoy?";
      break;
    }
      
    default: {
      response = "Entiendo que tienes una consulta. Para ayudarte mejor, ¿podrías proporcionar más detalles? " +
                "Por ejemplo, qué tipo de asunto legal necesitas resolver o qué tipo de asistencia estás buscando.";
    }
  }
  
  // Actualizar el historial con la respuesta
  updatedContext.conversationHistory.push({ role: 'assistant' as const, content: response });
  
  return { 
    response, 
    context: updatedContext 
  };
}

// Función para analizar el contexto de la conversación y sugerir acciones
export function suggestNextActions(context: LegalContext): string[] {
  const { conversationHistory, userPreferences } = context;
  const lastMessage = conversationHistory[conversationHistory.length - 1];
  
  // Si es el primer mensaje, sugerir opciones iniciales
  if (conversationHistory.length <= 1) {
    return [
      "Buscar abogado",
      "Hacer una consulta legal",
      "Conocer precios",
      "Subir documento"
    ];
  }
  
  // Si el usuario mencionó un área legal, sugerir búsqueda de abogados
  if (userPreferences.legalTopic) {
    return [
      `Buscar abogado en ${userPreferences.legalTopic}`,
      `Ver precios de servicios de ${userPreferences.legalTopic}`,
      "Hacer una consulta específica",
      "Ver más opciones"
    ];
  }
  
  // Si el usuario hizo una consulta, sugerir pasos siguientes
  if (lastMessage && lastMessage.role === 'user' && lastMessage.content.length > 20) {
    return [
      "¿Necesitas un abogado para este caso?",
      "Ver documentos legales relacionados",
      "Conocer los próximos pasos legales",
      "Volver al menú principal"
    ];
  }
  
  // Opciones por defecto
  return [
    "Hacer otra consulta",
    "Buscar abogado",
    "Ver mis documentos",
    "Cerrar chat"
  ];
}
