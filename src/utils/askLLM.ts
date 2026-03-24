// Enhanced legal domain understanding with context awareness

// Define document information interface
interface DocumentInfo {
  descripcion: string;
  requisitos: string[];
  consejos?: string[];
  marcoLegal: string;
  costoAproximado: string;
  validez: string;
}

// Define legal specialties information
interface EspecialidadLegal {
  descripcion: string;
  cuandoNecesitas: string[];
  consejos?: string[];
}

// Define legal specialties data
const ESPECIALIDADES_LEGALES: Record<string, EspecialidadLegal> = {
  'derecho de familia': {
    descripcion: 'Área del derecho que regula las relaciones familiares, como divorcios, tuición de hijos, alimentos, entre otros.',
    cuandoNecesitas: [
      'Necesitas tramitar un divorcio de mutuo acuerdo o contencioso',
      'Requieres regular la relación directa y regular con tus hijos',
      'Necesitas fijar o modificar una pensión de alimentos',
      'Buscas asesoría sobre cuidado personal de menores',
      'Necesitas regular un régimen de bienes en el matrimonio'
    ],
    consejos: [
      'Reúne toda la documentación relevante antes de la consulta',
      'Si hay menores involucrados, prioriza su bienestar en las decisiones',
      'Considera la mediación familiar antes de iniciar un juicio',
      'Mantén un registro de gastos si es un tema de alimentos'
    ]
  },
  'derecho laboral': {
    descripcion: 'Rama del derecho que regula las relaciones entre empleadores y trabajadores, incluyendo despidos, contratos y condiciones laborales.',
    cuandoNecesitas: [
      'Te han despedido injustificadamente',
      'No te han pagado tus beneficios laborales',
      'Necesitas asesoría sobre tu contrato de trabajo',
      'Tienes dudas sobre tus derechos como trabajador',
      'Quieres demandar por acoso laboral'
    ]
  }
  // Add more specialties as needed
};

// Define documents information
const DOCUMENTOS_LEGALES: Record<string, DocumentInfo> = {
  'contrato de arriendo': {
    descripcion: 'Documento legal que regula el arrendamiento de un inmueble entre arrendador y arrendatario',
    requisitos: [
      'Identificación legal vigente de ambas partes (cédula de identidad o pasaporte)',
      'Rol de avalúo fiscal del inmueble',
      'Certificado de dominio vigente del inmueble',
      'Monto del arriendo expresado en UF o pesos chilenos',
      'Forma de pago (transferencia, depósito, efectivo con boleta)',
      'Plazo mínimo de arriendo (generalmente 1 año en Chile)',
      'Monto y forma de pago del depósito de garantía',
      'Gastos comunes y contribuciones a cargo de cada parte'
    ],
    consejos: [
      'Exige la revisión del contrato con 5 días de anticipación',
      'Verifica que el propietario sea efectivamente el dueño del inmueble',
      'Documenta con fotos el estado del inmueble al inicio y término del arriendo',
      'Exige la devolución del depósito dentro de los 30 días posteriores a la entrega',
      'Verifica cláusulas de reajuste según IPC'
    ],
    marcoLegal: 'Ley N° 18.101 sobre Arrendamiento de Predios Urbanos',
    costoAproximado: 'Entre 0.5 y 1.5 UTM + IVA por página',
    validez: 'Generalmente 1 año, renovable de forma tácita'
  },
  // Add more documents as needed
};

interface LegalContext {
  conversationHistory: Array<{role: string, content: string}>;
  userPreferences: {
    location?: string;
    preferredLanguage: string;
    legalNeeds?: string[];
  };
  lastSearch?: {
    type: string;
    results: Array<{
      id: string;
      name: string;
      specialty: string;
      location: string;
      rating: number;
      price: number;
    }>;
    timestamp: number;
  };
}

// Legal knowledge base for better responses
const LEGAL_KNOWLEDGE: {
  areas: string[];
  commonDocs: string[];
  legalAid: string[];
} = {
  areas: [
    'penal', 'civil', 'laboral', 'familiar', 
    'mercantil', 'tributario', 'inmobiliario', 'propiedad intelectual'
  ],
  commonDocs: [
    'contrato de arriendo', 'contrato de trabajo', 'contrato de compraventa', 'contrato', 
    'demanda', 'recurso', 'poder', 'testamento', 'escritura', 'acta', 'certificado', 'notificacion'
  ],
  legalAid: [
    'asistencia legal', 'abogado de oficio', 'defensoría', 'consultoría gratuita'
  ]
};

// Helper functions for generating responses
function generateLawyerResponse(specialty: string, location: string, isFollowUp: boolean): string {
  if (!specialty && !location) {
    return isFollowUp 
      ? 'Aquí tienes más abogados que podrían ser de tu interés:'
      : '¿Podrías indicarme qué tipo de abogado necesitas y en qué ciudad?';
  }
  const specialtyPhrase = specialty ? ` en ${specialty}` : '';
  const locationPhrase = location ? ` en ${location}` : '';
  
  if (isFollowUp) {
    return `Aquí tienes más abogados${specialtyPhrase}${locationPhrase} que podrían ser de tu interés:`;
  }
  
  const responses = [
    `Perfecto, he encontrado profesionales especializados${specialtyPhrase}${locationPhrase} que podrían ayudarte.`,
    `Aquí tienes una selección de abogados${specialtyPhrase} disponibles${locationPhrase}.`,
    `He localizado expertos${specialtyPhrase}${locationPhrase} que se ajustan a lo que buscas.`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateDocumentResponse(docType: string, prompt: string): string {
  const docInfo = DOCUMENTOS_LEGALES[docType as keyof typeof DOCUMENTOS_LEGALES];
  
  if (docInfo) {
    return `*${docType.charAt(0).toUpperCase() + docType.slice(1)}*\n` +
      `_${docInfo.descripcion}_\n\n` +
      `📋 *Requisitos principales:*\n` +
      docInfo.requisitos.map(r => `• ${r}`).join('\n') + '\n\n' +
      (docInfo.consejos ? `💡 *Consejos importantes:*\n${docInfo.consejos.map(c => `• ${c}`).join('\n')}\n\n` : '') +
      `⚖️ *Marco legal:* ${docInfo.marcoLegal}\n` +
      `💰 *Costo aproximado:* ${docInfo.costoAproximado}\n` +
      `⏱️ *Validez:* ${docInfo.validez}`;
  }
  
  return `No tengo información detallada sobre "${docType}". ¿Te gustaría que busque a un especialista que pueda ayudarte con este documento?`;
}

// Enhanced legal specialty detection with context awareness
export function detectEspecialidad(text: string): string {
  const lowerText = text.toLowerCase();
  
  const specialties = [
    { terms: ['penal', 'crimen', 'delito', 'robo', 'hurto', 'homicidio', 'asalto', 'estafa', 'violencia', 'amenazas', 'detenido', 'carcel', 'preso', 'denuncia', 'querella', 'abuso', 'violacion', 'drogas', 'microtrafico', 'pdi', 'fiscalia', 'formalizado', 'medida cautelar', 'prision preventiva', 'estafaron', 'me estafaron', 'me robaron', 'me asaltaron', 'me detuvieron'], value: 'Derecho Penal' },
    { terms: ['civil', 'contrato', 'daños', 'responsabilidad', 'herencia', 'testamento', 'sucesion', 'posesion efectiva', 'pagare', 'cheque', 'cobranza', 'demanda civil', 'arriendo', 'desalojo', 'meses de garantia', 'subir el arriendo', 'me quieren subir el arriendo', 'casa', 'departamento', 'promesa', 'corredor', 'precario', 'deuda', 'embargo', 'bienes', 'dicom', 'indemnizacion', 'choque', 'accidente', 'tuve un accidente', 'me chocaron', 'me chocaron el auto', 'no me pagan', 'debo plata', 'quieren echar', 'me quieren echar de la casa', 'me van a echar de la casa', 'me van a echar del depto', 'me van a echar del departamento', 'me quieren echar del departamento'], value: 'Derecho Civil' },
    { terms: ['laboral', 'trabajo', 'despido', 'finiquito', 'sueldo', 'empleador', 'jefe', 'licencia', 'accidente', 'mutal', 'inspeccion', 'sindicato', 'huelga', 'fuerza mayor', 'necesidades de la empresa', 'fuero', 'maternal', 'acoso laboral', 'tutela', 'despidieron', 'me echaron', 'no me pagaron', 'no me pagaron mi sueldo', 'no me pagaron el sueldo', 'renuncia', 'despido injustificado', 'autodespido', 'honorarios', 'subcontratacion', 'gratificacion', 'vacaciones', 'feriado', 'horas extras'], value: 'Derecho Laboral' },
    { terms: ['familiar', 'divorcio', 'hijo', 'pensión', 'alimentos', 'visitas', 'tuicion', 'cuidado personal', 'pension', 'separacion', 'matrimonio', 'pareja', 'conyuge', 'esposo', 'esposa', 'marido', 'mujer', 'pololo', 'conviviente', 'violencia intrafamiliar', 'vif', 'adopcion', 'paternidad', 'adn', 'mediacion', 'cese de convivencia', 'regulacion de visitas', 'no me deja ver', 'no me deja ver a mi hijo', 'tuve un problema con mi pareja', 'problemas con mi pareja', 'papa de mi hijo', 'mama de mi hijo'], value: 'Derecho de Familia' },
    { terms: ['mercantil', 'empresa', 'sociedad', 'comercio', 'quiebra', 'socios', 'acciones', 'pyme', 'emprendimiento', 'sii', 'rut', 'constitucion', 'estatutos', 'fusion', 'adquisicion', 'franquicia', 'marca', 'comercial', 'factura', 'letra de cambio'], value: 'Derecho Comercial' },
    { terms: ['administrativo', 'gobierno', 'público', 'municipal', 'estado', 'licitacion', 'sumario', 'contraloria', 'empleado publico', 'estatuto administrativo', 'mercado publico', 'recurso de proteccion', 'expropiacion'], value: 'Derecho Administrativo' },
    { terms: ['tributario', 'impuesto', 'sii', 'tributo', 'iva', 'renta', 'declaracion', 'factura', 'evasion', 'elusion', 'tesoreria', 'tgr', 'tesoreria general', 'reclamacion tributaria', 'beneficio tributario'], value: 'Derecho Tributario' },
    { terms: ['inmobiliario', 'bienes raíces', 'propiedad', 'hipoteca', 'subdivision', 'loteo', 'copropiedad', 'gastos comunes', 'comite de administracion', 'conservador de bienes raices', 'cbr', 'estudio de titulos', 'promesa de compraventa', 'dominio vigente', 'gravamenes', 'prohibiciones'], value: 'Derecho Inmobiliario' },
    { terms: ['propiedad intelectual', 'marca', 'patente', 'derechos de autor', 'inapi', 'invento', 'cancion', 'logo', 'plagio', 'software', 'derechos conexos', 'registro de marca', 'derecho de autor'], value: 'Propiedad Intelectual' },
    { terms: ['salud', 'isapre', 'fonasa', 'negligencia', 'medica', 'hospital', 'clinica', 'auge', 'ges', 'licencia rechazada', 'compin', 'suseso', 'alza plan', 'mala praxis', 'error medico', 'prestaciones'], value: 'Derecho de Salud' },
    { terms: ['extranjeria', 'migracion', 'visa', 'visa temporaria', 'tengo problemas con mi visa', 'residencia', 'rut', 'pdi', 'refugio', 'nacionalidad', 'deportacion', 'me van a deportar', 'tengo problemas con deportacion', 'expulsion', 'tengo problemas con expulsion', 'permanencia definitiva', 'turismo', 'frontera', 'sernmig'], value: 'Derecho Migratorio' }
  ];
  
  const matchedSpecialty = specialties.find(({ terms }) => 
    terms.some(term => lowerText.includes(term))
  );
  
  return matchedSpecialty?.value || '';
}

// Enhanced city detection with common variations
function detectCiudad(text: string): string {
  const lowerText = text.toLowerCase();
  
  const cities = [
    { names: ['santiago', 'stgo', 'santiago centro'], value: 'Santiago' },
    { names: ['valparaíso', 'valparaiso', 'viña', 'viña del mar'], value: 'Valparaíso' },
    { names: ['concepción', 'concepcion', 'conce'], value: 'Concepción' },
    { names: ['la serena', 'coquimbo'], value: 'La Serena' },
    { names: ['antofagasta', 'antofa'], value: 'Antofagasta' },
    { names: ['temuco', 'araucanía'], value: 'Temuco' },
    { names: ['puerto montt', 'puertomontt'], value: 'Puerto Montt' },
    { names: ['punta arenas', 'magallanes'], value: 'Punta Arenas' }
  ];
  
  const matchedCity = cities.find(({ names }) => 
    names.some(name => lowerText.includes(name))
  );
  
  return matchedCity?.value || '';
}

// Interfaz para el resultado del análisis de consulta
interface AnalisisConsulta {
  documento?: string;
  esRequisitos: boolean;
  esCosto: boolean;
  esValidez: boolean;
  esEjemplo: boolean;
  aspectoEspecifico?: string;
  esBusquedaAbogado: boolean;
  esInstruccionSistema: boolean;
  esBusquedaPorCiudad: boolean;
}

// Función para analizar la consulta y extraer información relevante
function analizarConsulta(prompt: string, context: LegalContext): AnalisisConsulta {
  const texto = prompt.toLowerCase().trim();
  
  // Detectar si es una instrucción del sistema o prompt
  const esInstruccionSistema = /(eres un|tu tarea|debes|responder como|mensaje del usuario)/i.test(texto);
  if (esInstruccionSistema) {
    return {
      esInstruccionSistema: true,
      documento: undefined,
      esRequisitos: false,
      esCosto: false,
      esValidez: false,
      esEjemplo: false,
      aspectoEspecifico: undefined,
      esBusquedaAbogado: false,
      esBusquedaPorCiudad: false
    };
  }
  
  // Detectar si es una búsqueda de abogado por ciudad (ej: "stgo", "santiago")
  const ciudad = detectCiudad(texto);
  const esBusquedaPorCiudad = ciudad && texto.length <= 20; // Búsqueda corta que parece ser solo una ciudad
  
  // Detectar tipo de documento solicitado
  const documentos = [
    'contrato de arriendo', 'contrato de trabajo', 'compraventa de vehículo',
    'testamento', 'poder notarial', 'contrato de prestación de servicios',
    'contrato de arrendamiento', 'contrato de compraventa', 'contrato de sociedad'
  ];
  
  const documento = documentos.find(doc => texto.includes(doc));
  
  // Detectar intenciones específicas
  const esRequisitos = /(qué necesito|requisitos|documentos? necesario|qué debo llevar)/i.test(texto);
  const esCosto = /(cuánto cuesta|precio|valor|cuánto sale|cuánto vale)/i.test(texto);
  const esValidez = /(cuánto dura|válido hasta|vigencia|tiempo de validez)/i.test(texto);
  const esEjemplo = /(ejemplo|modelo|formato|como se hace)/i.test(texto);
  
  // Detectar si es una pregunta sobre un aspecto específico del documento
  const aspectoEspecifico = [
    { term: /(depósito|garantía)/i, tipo: 'deposito' },
    { term: /(plazo|duración|tiempo)/i, tipo: 'plazo' },
    { term: /(terminar|finalizar|dar por terminado)/i, tipo: 'termino' },
    { term: /(renovar|prórroga|extender)/i, tipo: 'renovacion' },
    { term: /(multa|sanción|penalidad)/i, tipo: 'sanciones' }
  ].find(item => item.term.test(texto))?.tipo;
  
  // Detectar si es una búsqueda de abogado
  const contienePalabrasClaveAbogado = /(buscar|necesito|recomienda|contratar|encontrar|abogad[oa]|especialista|abogacía)/i.test(texto);
  const esBusquedaAbogado = contienePalabrasClaveAbogado || esBusquedaPorCiudad;
  
  return {
    documento,
    esRequisitos,
    esCosto,
    esValidez,
    esEjemplo,
    aspectoEspecifico,
    esBusquedaAbogado,
    esInstruccionSistema: false,
    esBusquedaPorCiudad
  };
}

export async function askMistral(
  prompt: string, 
  context: LegalContext = { 
    conversationHistory: [],
    userPreferences: { preferredLanguage: 'es' }
  }
): Promise<string> {
  try {
    // Simular demora de API con variación
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));
    
    const normalizedPrompt = prompt.toLowerCase();
    const lastMessage = context.conversationHistory[context.conversationHistory.length - 1]?.content || '';
    
    // Analizar la consulta del usuario
    const analisis = analizarConsulta(prompt, context);
    
    // Si es una instrucción del sistema, devolver respuesta genérica
    if (analisis.esInstruccionSistema) {
      return JSON.stringify({
        tipo: "general",
        especialidad: "",
        ciudad: "",
        respuesta: "Soy un asistente legal diseñado para ayudar con consultas legales específicas. Por favor, indícame en qué necesitas ayuda (por ejemplo, 'Necesito un abogado laboral' o '¿Qué necesito para un contrato de arriendo?')."
      });
    }
    
    // Si es una búsqueda solo por ciudad
    if (analisis.esBusquedaPorCiudad) {
      const ciudad = detectCiudad(prompt);
      return JSON.stringify({
        tipo: "abogado",
        especialidad: "",
        ciudad: ciudad,
        respuesta: `He detectado que buscas abogados en ${ciudad}. ¿Podrías indicarme el área de especialización que necesitas? Por ejemplo: 'laboral', 'familia', 'penal', etc.`
      });
    }
    
    // Verificar si es una búsqueda de abogado
    if (analisis.esBusquedaAbogado || context.lastSearch) {
      const especialidad = detectEspecialidad(prompt) || context.lastSearch?.type || '';
      const ciudad = detectCiudad(prompt) || context.userPreferences.location || '';
      const esSeguimiento = /(más|otr[ao]s?|siguiente|anterior|ver más)/i.test(prompt);
      
      // Si es una especialidad específica, dar información detallada
      if (especialidad) {
        const infoEspecialidad = ESPECIALIDADES_LEGALES[especialidad as keyof typeof ESPECIALIDADES_LEGALES];
        if (infoEspecialidad) {
          let respuesta = `*Información sobre ${especialidad}*\n\n`;
          respuesta += `${infoEspecialidad.descripcion}\n\n`;
          
          if (analisis.esRequisitos) {
            respuesta += `*¿Cuándo necesitas un ${especialidad}?*\n`;
            respuesta += infoEspecialidad.cuandoNecesitas.map(item => `• ${item}`).join('\n') + '\n\n';
          }
          
          if (infoEspecialidad.consejos) {
            respuesta += `*Consejos importantes:*\n`;
            respuesta += infoEspecialidad.consejos.map(c => `• ${c}`).join('\n') + '\n\n';
          }
          
          respuesta += `¿Te gustaría que te ayude a encontrar un abogado ${especialidad}${ciudad ? ` en ${ciudad}` : ''}?`;
          
          return JSON.stringify({
            tipo: "abogado",
            especialidad,
            ciudad,
            respuesta
          });
        }
      }
      
      // Respuesta estándar para búsqueda de abogados
      return JSON.stringify({
        tipo: "abogado",
        especialidad,
        ciudad,
        respuesta: generateLawyerResponse(especialidad, ciudad, esSeguimiento)
      });
    }
    
    // Si es una consulta sobre un documento específico
    if (analisis.documento) {
      const docType = analisis.documento;
      const documentInfo = DOCUMENTOS_LEGALES[docType as keyof typeof DOCUMENTOS_LEGALES];
      
      if (documentInfo) {
        let respuesta = `*${docType.charAt(0).toUpperCase() + docType.slice(1)}*\n`;
        respuesta += `_${documentInfo.descripcion}_\n\n`;
        
        // Responder según el tipo de consulta
        if (analisis.esRequisitos || !(analisis.esCosto || analisis.esValidez || analisis.aspectoEspecifico)) {
          respuesta += `📋 *Requisitos principales:*\n`;
          respuesta += documentInfo.requisitos.map(r => `• ${r}`).join('\n') + '\n\n';
          
          if (documentInfo.consejos) {
            respuesta += `💡 *Consejos importantes:*\n`;
            respuesta += documentInfo.consejos.map(c => `• ${c}`).join('\n') + '\n\n';
          }
        }
        
        // Información específica según el aspecto consultado
        if (analisis.aspectoEspecifico === 'deposito' && docType === 'contrato de arriendo') {
          respuesta += `💰 *Sobre el depósito de garantía en arriendos:*\n`;
          respuesta += `• El depósito no puede superar el equivalente a una mensualidad de arriendo\n`;
          respuesta += `• Debe ser devuelto dentro de los 30 días posteriores a la entrega del inmueble\n`;
          respuesta += `• El arrendador puede retener el depósito por daños al inmueble no causados por el uso normal\n`;
          respuesta += `• Se recomienda documentar el estado del inmueble al inicio y término del arriendo con fotos\n\n`;
        }
        
        if (analisis.esCosto || analisis.aspectoEspecifico === 'costo') {
          respuesta += `💰 *Costo aproximado:* ${documentInfo.costoAproximado}\n`;
          if (docType === 'contrato de arriendo') {
            respuesta += `  _Nota: El costo puede variar según la complejidad y el profesional que lo realice._\n`;
          }
          respuesta += '\n';
        }
        
        if (analisis.esValidez || analisis.aspectoEspecifico === 'plazo') {
          respuesta += `⏱️ *Validez:* ${documentInfo.validez}\n`;
          if (docType === 'contrato de arriendo') {
            respuesta += `  _Nota: El plazo mínimo legal es de 1 año, pero puedes acordar un plazo mayor._\n`;
          }
          respuesta += '\n';
        }
        
        // Información legal y cierre
        respuesta += `⚖️ *Marco legal:* ${documentInfo.marcoLegal}\n\n`;
        
        // Sugerir siguientes pasos
        const sugerencias = [];
        if (!analisis.esCosto) sugerencias.push('conocer los costos asociados');
        if (!analisis.esValidez) sugerencias.push('saber sobre su validez');
        if (!analisis.aspectoEspecifico) sugerencias.push('información más específica');
        
        if (sugerencias.length > 0) {
          respuesta += `¿Te gustaría ${sugerencias.join(', ')} o necesitas ayuda con algo más?`;
        } else {
          respuesta += `¿En qué más puedo ayudarte sobre este documento?`;
        }
        
        return JSON.stringify({
          tipo: "documento",
          especialidad: detectEspecialidad(prompt) || "",
          ciudad: "",
          respuesta
        });
      }
      
      // Si no se encontró información detallada del documento
      return JSON.stringify({
        tipo: "documento",
        especialidad: "",
        ciudad: "",
        respuesta: `Entiendo que necesitas información sobre ${docType}. ` +
          `Para ayudarte mejor, ¿podrías especificar si necesitas saber sobre requisitos, costos, validez o algún aspecto en particular?`
      });
    }
    
    // Si es una solicitud de asistencia legal
    if (LEGAL_KNOWLEDGE.legalAid.some(term => normalizedPrompt.includes(term))) {
      const ciudad = detectCiudad(prompt);
      let respuesta = "*Asistencia Legal Gratuita*\n\n";
      
      respuesta += "Existen varias opciones para obtener asesoría legal gratuita en Chile:\n\n";
      respuesta += "1. *Corporación de Asistencia Judicial (CAJ)*: Ofrece defensa penal y asesoría en materias de familia.\n";
      respuesta += "2. *Defensoría Penal Pública*: Para casos penales cuando no puedes pagar un abogado.\n";
      respuesta += "3. *Clínicas Jurídicas Universitarias*: Muchas universidades ofrecen asesoría gratuita a la comunidad.\n";
      respuesta += "4. *Oficinas de Protección de Derechos (OPD)*: Para casos de familia y menores de edad.\n\n";
      
      if (ciudad) {
        respuesta += `Puedo ayudarte a encontrar opciones específicas en ${ciudad}. `;
      } else {
        respuesta += "¿En qué ciudad o comuna te encuentras? Así puedo darte información más precisa.\n\n";
      }
      
      respuesta += "¿Te gustaría que te ayude a encontrar asistencia legal gratuita cerca de tu ubicación?";
      
      return JSON.stringify({
        tipo: "asistencia",
        especialidad: "",
        ciudad: ciudad || "",
        respuesta
      });
    }
    
    // Si no se pudo determinar la intención, pedir aclaración
    const sugerencias = [
      "¿Necesitas ayuda con algún documento legal en particular?",
      "¿Estás buscando un abogado especializado en algún área específica?",
      "¿Tienes alguna consulta sobre trámites legales?",
      "¿Necesitas información sobre asistencia legal gratuita?"
    ];
    
    const sugerenciaAleatoria = sugerencias[Math.floor(Math.random() * sugerencias.length)];
    
    return JSON.stringify({
      tipo: "general",
      especialidad: "",
      ciudad: "",
      respuesta: `Disculpa, no estoy seguro de cómo ayudarte con "${prompt}". ${sugerenciaAleatoria}`
    });
    
  } catch (error) {
    console.error('Error in askMistral:', error);
    return JSON.stringify({
      tipo: "error",
      especialidad: "",
      ciudad: "",
      respuesta: "Lo siento, he tenido un problema al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde."
    });
  }
}