export const PROSPECTING_DEFAULTS = Object.freeze({
  enabled: false,
  dry_run: true,
  daily_target: 100,
  max_sends_per_run: 50,
  max_sends_per_day: 100,
  schedule_time: '10:00',
  timezone: 'America/Santiago',
  sender_name: 'Juan de Legalup',
  sender_email: 'juan@legalup.cl',
  reply_to: 'juan@legalup.cl',
  app_url: 'https://legalup.cl/pro',
  allow_multiple_contacts_per_firm: false,
});

export const GENERIC_EMAIL_LOCAL_PARTS = Object.freeze(new Set([
  'admin', 'administracion', 'administración', 'atencion', 'atención', 'ayuda',
  'abogado', 'abogados', 'contacto', 'contact', 'consultas', 'comercial',
  'comunicaciones', 'comunicacion', 'comunicación', 'copropiedad', 'copropiedades',
  'correo', 'clientes', 'equipo', 'estudio', 'firma', 'hello', 'hola', 'info',
  'informaciones', 'legal', 'mail', 'marketing', 'no-reply', 'noreply',
  'oficina', 'postmaster', 'prensa', 'recepcion', 'recepción', 'rrhh',
  'secretaria', 'soporte', 'support', 'ventas', 'web', 'webmaster',
]));

export const ROLE_EMAIL_LOCAL_PARTS = Object.freeze(new Set([
  ...GENERIC_EMAIL_LOCAL_PARTS,
  'abogada', 'abogadas', 'arquitectura', 'cartera', 'cobranza', 'contabilidad',
  'contratacion', 'contratación', 'direccion', 'dirección', 'documentos',
  'facturacion', 'facturación', 'gerencia', 'juridico', 'jurídico', 'laboral',
  'notificaciones', 'operaciones', 'practica', 'práctica', 'proveedores',
  'reclamos', 'socios', 'talento', 'tesoreria', 'tesorería',
]));

export const DISPOSABLE_EMAIL_DOMAINS = Object.freeze(new Set([
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.com',
  'throwawaymail.com', 'yopmail.com', 'sharklasers.com', 'getnada.com',
]));

export const BLOCKED_PAGE_HOSTS = Object.freeze(new Set([
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'linkedin.com',
  'youtube.com', 'pinterest.com', 'mercadolibre.cl', 'mercadolibre.com',
  'google.com', 'bing.com', 'duckduckgo.com', 'wikipedia.org',
]));

export const CHILE_CITIES = Object.freeze([
  'Santiago', 'Providencia', 'Las Condes', 'Vitacura', 'Ñuñoa', 'Maipú',
  'La Florida', 'Puente Alto', 'Valparaíso', 'Viña del Mar', 'Quilpué',
  'Villa Alemana', 'San Antonio', 'Concepción', 'Talcahuano', 'Chillán',
  'Temuco', 'Valdivia', 'Osorno', 'Puerto Montt', 'Castro', 'Coyhaique',
  'Punta Arenas', 'La Serena', 'Coquimbo', 'Iquique', 'Arica', 'Antofagasta',
  'Calama', 'Copiapó', 'Vallenar', 'Curicó', 'Talca', 'Linares', 'Rancagua',
  'San Fernando', 'Los Ángeles', 'Angol', 'Villarrica',
]);

export const SPECIALTY_KEYWORDS = Object.freeze({
  'Derecho laboral': ['laboral', 'trabajo', 'despido', 'finiquito', 'negotación colectiva', 'negociación colectiva'],
  'Derecho de familia': ['familia', 'divorcio', 'pensión de alimentos', 'cuidado personal', 'tuición'],
  'Derecho civil': ['civil', 'arriendo', 'contrato', 'obligaciones', 'inmueble'],
  'Derecho penal': ['penal', 'defensa penal', 'delito', 'imputado'],
  'Derecho tributario': ['tributario', 'impuesto', 'sii', 'tribunal tributario'],
  'Derecho comercial': ['comercial', 'sociedad', 'empresa', 'mercantil', 'startup'],
  'Derecho administrativo': ['administrativo', 'municipal', 'servicio público', 'bases administrativas'],
  'Derecho de la construcción': ['construcción', 'inmobiliario', 'urbanismo', 'permiso de edificación'],
  'Derecho migratorio': ['migratorio', 'extranjería', 'visa', 'residencia'],
  'Derecho de la propiedad intelectual': ['propiedad intelectual', 'marca', 'patente', 'derecho de autor'],
  'Derecho de la competencia': ['competencia', 'libre competencia', 'antimonopolio'],
  'Derecho ambiental': ['ambiental', 'medio ambiente', 'sernageomin', 'evaluación ambiental'],
});

export const MAX_EMAIL_LENGTH = 320;
export const MAX_FIELD_LENGTH = 500;
export const MAX_DESCRIPTION_LENGTH = 1200;
export const MAX_SPECIALTIES = 6;
export const MAX_PAGES_PER_RUN = 250;
export const PAGE_FETCH_TIMEOUT_MS = 12000;
export const PAGE_FETCH_CONCURRENCY = 4;
export const PAGE_FETCH_DELAY_MS = 250;
export const MAX_SEND_ATTEMPTS = 3;
export const TRANSIENT_HTTP_STATUSES = Object.freeze(new Set([408, 425, 429, 500, 502, 503, 504]));
