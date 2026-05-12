export interface CategorySEO {
  title: string;
  description: string;
  h1: string;
  introText: string;
  faqs: { question: string; answer: string }[];
}

export const categoryContent: Record<string, CategorySEO> = {
  laboral: {
    title: "Abogados Laborales en Chile | Asesoría Legal 24/7 | LegalUp",
    description: "Encuentra a los mejores abogados laborales en Chile. Especialistas en despido injustificado, autodespido, accidentes del trabajo y cobranza laboral. Consulta online ahora.",
    h1: "Abogados Laborales Especialistas en Chile",
    introText: "Si estás enfrentando un conflicto en tu trabajo, no estás solo. Nuestros abogados laborales están listos para defender tus derechos en casos de despido, acoso, accidentes o deudas previsionales. Encuentra orientación clara y rápida con los profesionales más destacados del país.",
    faqs: [
      {
        question: "¿Qué es un despido injustificado?",
        answer: "Es aquel despido que se realiza sin que el empleador pueda probar la causal invocada o cuando la causal no se ajusta a lo establecido en el Código del Trabajo."
      },
      {
        question: "¿Cuánto tiempo tengo para demandar por despido?",
        answer: "El plazo general es de 60 días hábiles contados desde la separación del trabajador, el cual puede ampliarse hasta 90 días si se interpone un reclamo ante la Inspección del Trabajo."
      },
      {
        question: "¿Qué es el autodespido o despido indirecto?",
        answer: "Es la facultad del trabajador para poner término a la relación laboral cuando el empleador ha incurrido en incumplimientos graves de sus obligaciones, manteniendo el derecho a las indemnizaciones legales."
      }
    ]
  },
  divorcio: {
    title: "Abogados de Divorcio y Familia en Chile | Consulta Online | LegalUp",
    description: "Asesoría legal experta en divorcio de mutuo acuerdo, unilateral y culposo. Abogados especialistas en pensión de alimentos, tuición y relación directa y regular.",
    h1: "Abogados Especialistas en Divorcios y Familia",
    introText: "Sabemos que los temas de familia son sensibles. Nuestros abogados te guiarán con empatía y profesionalismo en procesos de divorcio, mediación, pensiones de alimentos y cuidado personal, buscando siempre la mejor solución para ti y tus hijos.",
    faqs: [
      {
        question: "¿Cuáles son los tipos de divorcio en Chile?",
        answer: "Existen tres tipos: divorcio de mutuo acuerdo (requiere 1 año de cese de convivencia), divorcio unilateral (3 años de cese) y divorcio por culpa (por faltas graves a los deberes del matrimonio)."
      },
      {
        question: "¿Qué es la compensación económica?",
        answer: "Es el derecho que tiene el cónyuge que, por dedicarse al cuidado de los hijos o del hogar, no pudo trabajar o lo hizo en menor medida de lo que podía y quería durante el matrimonio."
      },
      {
        question: "¿Cómo se calcula la pensión de alimentos?",
        answer: "Se calcula considerando las necesidades del hijo y la capacidad económica de ambos padres, con topes legales mínimos y máximos según la cantidad de hijos."
      }
    ]
  },
  arriendo: {
    title: "Abogados de Arriendo y Juicios de Desalojo en Chile | LegalUp",
    description: "Expertos en juicios de arrendamiento, ley 'Devuélveme mi Casa', desalojos y cobranza de rentas impagas. Protege tu propiedad con la mejor asesoría legal online.",
    h1: "Abogados Especialistas en Arriendos y Desalojos",
    introText: "Recuperar tu propiedad no debería ser un calvario. Especialistas en juicios de arrendamiento bajo la nueva ley 'Devuélveme mi Casa', te ayudamos a cobrar rentas impagas y gestionar desalojos de forma legal y efectiva.",
    faqs: [
      {
        question: "¿Qué es la Ley 'Devuélveme mi Casa'?",
        answer: "Es una normativa que agiliza los juicios de arrendamiento, permitiendo solicitar la restitución anticipada del inmueble en casos de rentas impagas o daños graves, reduciendo drásticamente los tiempos de desalojo."
      },
      {
        question: "¿Qué hacer si el arrendatario no paga la renta?",
        answer: "Lo ideal es iniciar un juicio de terminación de contrato por falta de pago lo antes posible para evitar que la deuda siga creciendo y poder solicitar la restitución del inmueble."
      },
      {
        question: "¿Se puede desalojar a un arrendatario sin juicio?",
        answer: "No. En Chile está prohibido el autotutela (cambiar chapas, cortar servicios). El desalojo siempre debe ser ordenado por un juez y ejecutado por un receptor judicial con auxilio de la fuerza pública si es necesario."
      }
    ]
  },
  penal: {
    title: "Abogados Penales en Chile | Defensa y Querellas 24/7 | LegalUp",
    description: "Defensa penal experta y querellas criminales. Abogados especialistas en delitos económicos, violencia intrafamiliar, estafas y Ley de Drogas. Asesoría 24/7.",
    h1: "Abogados Penales: Defensa y Querellas Criminales",
    introText: "En materia penal, cada minuto cuenta. Ya sea que necesites una defensa técnica ante una acusación o quieras interponer una querella por un delito cometido en tu contra, nuestros abogados penales te entregarán una estrategia sólida y acompañamiento constante.",
    faqs: [
      {
        question: "¿Qué hacer ante una detención?",
        answer: "Tienes derecho a guardar silencio y a ser asistido por un abogado desde el primer momento. No declares ante la policía sin la presencia de tu defensa técnica."
      },
      {
        question: "¿Qué es la formalización de la investigación?",
        answer: "Es el acto mediante el cual el Fiscal comunica al imputado, en presencia del Juez, que se está desarrollando una investigación en su contra por uno o más delitos determinados."
      },
      {
        question: "¿Cómo interponer una querella criminal?",
        answer: "La querella debe ser redactada por un abogado y presentada ante el Juzgado de Garantía competente, permitiéndote participar activamente en el proceso penal como víctima."
      }
    ]
  }
};
