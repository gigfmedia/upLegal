export interface CategorySEO {
  title: string;
  description: string;
  h1: string;
  introText: string;
  longSeoTitle?: string;
  longSeoText?: string;
  faqs: { question: string; answer: string }[];
}

export const categoryContent: Record<string, CategorySEO> = {
  laboral: {
    title: "Abogados Laborales en Chile | Asesoría Legal 24/7 | LegalUp",
    description: "Encuentra a los mejores abogados laborales en Chile. Especialistas en despido injustificado, autodespido, accidentes del trabajo y cobranza laboral. Consulta online ahora.",
    h1: "Abogados Laborales Especialistas en Chile",
    introText: "Si estás enfrentando un conflicto en tu trabajo, no estás solo. Nuestros abogados laborales están listos para defender tus derechos en casos de despido, acoso, accidentes o deudas previsionales. Encuentra orientación clara y rápida con los profesionales más destacados del país.",
    longSeoTitle: "Asesoría Legal Laboral: Protegiendo los Derechos de los Trabajadores en Chile",
    longSeoText: `
      <p>El Derecho Laboral en Chile es una rama del derecho en constante evolución, diseñada fundamentalmente para equilibrar la relación entre empleadores y trabajadores. En LegalUp, entendemos que enfrentar un problema en el ámbito laboral —ya sea un despido, acoso o el no pago de cotizaciones— genera una gran incertidumbre y estrés. Por ello, conectamos a trabajadores con abogados laborales especialistas que conocen a fondo el Código del Trabajo y la jurisprudencia de los Tribunales de Justicia.</p>

      <h3>¿Por qué es fundamental contar con un abogado laboralista?</h3>
      <p>A diferencia de otras áreas del derecho, en materia laboral existen plazos fatales muy cortos para ejercer acciones legales. Por ejemplo, en casos de <strong>despido injustificado</strong>, el trabajador cuenta generalmente con un plazo de 60 días hábiles para demandar. Si este plazo transcurre sin acción, el derecho a reclamar indemnizaciones adicionales o recargos legales se pierde definitivamente. Un abogado experto no solo asegura el cumplimiento de estos plazos, sino que también maximiza el monto de las indemnizaciones mediante una correcta liquidación de años de servicio, aviso previo y vacaciones.</p>

      <h3>Casos frecuentes que atendemos</h3>
      <ul>
        <li><strong>Despido Injustificado:</strong> Cuando el empleador no logra probar la causal invocada (como necesidades de la empresa) o el procedimiento fue incorrecto.</li>
        <li><strong>Autodespido o Despido Indirecto:</strong> Cuando es el trabajador quien pone término al contrato debido a incumplimientos graves del empleador (no pago de sueldos, cotizaciones, etc.), manteniendo el derecho a sus indemnizaciones.</li>
        <li><strong>Tutela Laboral:</strong> Acciones destinadas a proteger los derechos fundamentales del trabajador cuando estos son vulnerados durante la relación laboral o con ocasión del despido (discriminación, acoso laboral, vulneración de la integridad física o psíquica).</li>
        <li><strong>Accidentes del Trabajo y Enfermedades Profesionales:</strong> Gestión de demandas por indemnización de perjuicios contra el empleador que no cumplió con su deber de seguridad.</li>
      </ul>

      <h3>La importancia de la Inspección del Trabajo</h3>
      <p>Muchos conflictos laborales inician con un reclamo administrativo ante la Inspección del Trabajo. Si bien esta instancia busca una conciliación rápida, contar con asesoría legal desde este primer paso es crucial para no cometer errores que puedan perjudicar una futura demanda judicial. Nuestros abogados te acompañan en los comparendos y te asesoran sobre la conveniencia de aceptar un acuerdo o proseguir a la instancia judicial en los Juzgados de Letras del Trabajo.</p>

      <p>En LegalUp, nuestra plataforma te permite filtrar abogados por su experiencia específica, leer reseñas de otros trabajadores y agendar una consulta online de forma inmediata. No permitas que tus derechos sean vulnerados por falta de asesoría técnica; la ley laboral chilena protege al trabajador, pero esa protección debe ser activada mediante una defensa profesional y oportuna.</p>
    `,
    faqs: [
      {
        question: "¿Qué es un despido injustificado?",
        answer: "Es aquel despido que se realiza sin que el empleador pueda probar la causal invocada o cuando la causal no se ajusta a lo establecido en el Código del Trabajo. Si se gana la demanda, el trabajador puede recibir un recargo legal sobre su indemnización por años de servicio que varía entre un 30% y un 100%."
      },
      {
        question: "¿Cuánto tiempo tengo para demandar por despido?",
        answer: "El plazo general es de 60 días hábiles contados desde la separación del trabajador. Este plazo se suspende si se interpone un reclamo ante la Inspección del Trabajo, pero en ningún caso la demanda puede presentarse después de 90 días hábiles desde el despido."
      },
      {
        question: "¿Qué es el autodespido o despido indirecto?",
        answer: "Es la facultad del trabajador para poner término a la relación laboral cuando el empleador ha incurrido en incumplimientos graves de sus obligaciones (como no pagar cotizaciones o sueldos). El trabajador demanda para que el juez declare que el despido es indirecto y ordene el pago de las indemnizaciones correspondientes."
      },
      {
        question: "¿Qué pasa si mi empleador no ha pagado mis cotizaciones?",
        answer: "Si al momento del despido el empleador no tiene al día el pago de las cotizaciones previsionales, el despido es nulo (Ley Bustos). Esto significa que el empleador debe seguir pagando las remuneraciones desde la fecha del despido hasta que convalide el mismo pagando la deuda previsional."
      },
      {
        question: "¿Puedo demandar si ya firmé el finiquito?",
        answer: "Depende de si hiciste una 'reserva de derechos'. Si al firmar el finiquito escribiste de puño y letra que te reservabas el derecho a demandar por conceptos específicos (como despido injustificado o diferencias en el cálculo), puedes demandar. Si firmaste sin reserva, es mucho más complejo y generalmente se entiende que aceptaste el término en esos términos."
      }
    ]
  },
  divorcio: {
    title: "Abogados de Divorcio y Familia en Chile | Consulta Online | LegalUp",
    description: "Asesoría legal experta en divorcio de mutuo acuerdo, unilateral y culposo. Abogados especialistas en pensión de alimentos, tuición y relación directa y regular.",
    h1: "Abogados Especialistas en Divorcios y Familia",
    introText: "Sabemos que los temas de familia son sensibles. Nuestros abogados te guiarán con empatía y profesionalismo en procesos de divorcio, mediación, pensiones de alimentos y cuidado personal, buscando siempre la mejor solución para ti y tus hijos.",
    longSeoTitle: "Derecho de Familia: Acompañamiento Legal en Procesos de Divorcio y Cuidado Personal",
    longSeoText: `
      <p>El Derecho de Familia en Chile regula las relaciones personales y patrimoniales de los miembros de una familia. Enfrentar un proceso de divorcio o una disputa por la pensión de alimentos no es solo un desafío legal, sino también una carga emocional significativa. En LegalUp, conectamos a personas con abogados de familia que priorizan el bienestar de los hijos y la resolución justa de los conflictos.</p>

      <h3>El Proceso de Divorcio en Chile</h3>
      <p>Desde la implementación de la nueva Ley de Matrimonio Civil, el divorcio se ha simplificado, pero requiere el cumplimiento de plazos estrictos de cese de convivencia. Los tipos de divorcio incluyen:</p>
      <ul>
        <li><strong>Divorcio de Mutuo Acuerdo:</strong> Requiere que ambos cónyuges estén conformes y acrediten un cese de convivencia de al menos 1 año. Es el camino más rápido y económico.</li>
        <li><strong>Divorcio Unilateral:</strong> Se solicita cuando uno de los cónyuges no desea el divorcio o no hay acuerdo en los términos. Requiere acreditar 3 años de cese de convivencia.</li>
        <li><strong>Divorcio Culposo:</strong> Se solicita por falta grave de uno de los cónyuges (infidelidad, violencia, abandono), y no requiere plazos de cese de convivencia.</li>
      </ul>

      <h3>Pensión de Alimentos y Cuidado Personal</h3>
      <p>Uno de los pilares de nuestra asesoría es la protección de los derechos de los niños y adolescentes. La <strong>pensión de alimentos</strong> se calcula en base a las necesidades del alimentario y la capacidad económica de ambos padres. Nuestros abogados ayudan a formalizar acuerdos o a demandar judicialmente cuando no hay voluntad de pago, activando medidas como la retención judicial de sueldos o de devoluciones de impuestos.</p>
      <p>Asimismo, el <strong>Cuidado Personal</strong> (anteriormente llamado tuición) y la <strong>Relación Directa y Regular</strong> (visitas) son aspectos fundamentales que deben quedar regulados de forma clara para evitar conflictos futuros y garantizar el interés superior del niño.</p>

      <h3>Compensación Económica</h3>
      <p>Es el derecho que tiene el cónyuge que, producto del matrimonio, no pudo desarrollar una actividad remunerada o lo hizo en menor medida de lo que podía y quería, por haberse dedicado al cuidado de los hijos o del hogar común. Este es un aspecto técnico complejo donde la asesoría de un abogado especialista es vital para cuantificar y probar el menoscabo económico sufrido.</p>

      <p>En LegalUp, entendemos que cada familia es única. Nuestra plataforma te permite encontrar abogados con experiencia en mediación familiar, litigación en Tribunales de Familia y redacción de escrituras de mutuo acuerdo, asegurando que recibas una asesoría integral y humana.</p>
    `,
    faqs: [
      {
        question: "¿Cuáles son los tipos de divorcio en Chile?",
        answer: "Existen tres tipos: divorcio de mutuo acuerdo (requiere 1 año de cese de convivencia), divorcio unilateral (3 años de cese) y divorcio por culpa (por faltas graves como violencia intrafamiliar o abandono, no requiere plazo de cese)."
      },
      {
        question: "¿Qué es la compensación económica?",
        answer: "Es el derecho de un cónyuge a recibir un monto reparatorio si, por dedicarse al cuidado de los hijos o del hogar, no pudo trabajar o lo hizo menos de lo que quería y podía. Se solicita al momento de demandar el divorcio o nulidad."
      },
      {
        question: "¿Cómo se calcula la pensión de alimentos?",
        answer: "Se considera la necesidad del menor y la capacidad del padre/madre. La ley establece mínimos (40% de un sueldo mínimo si es un hijo) y un máximo (50% de los ingresos totales del alimentante)."
      },
      {
        question: "¿Es obligatoria la mediación familiar?",
        answer: "Sí, para materias como pensión de alimentos, cuidado personal y relación directa y regular, la ley exige pasar por un proceso de mediación previa antes de poder presentar una demanda en el tribunal."
      },
      {
        question: "¿Qué pasa si el padre/madre no paga la pensión?",
        answer: "Se pueden solicitar medidas de apremio como retención de sueldo, arraigo nacional, suspensión de licencia de conducir, retención de devolución de impuestos y, en casos graves, arresto nocturno o efectivo."
      }
    ]
  },
  arriendo: {
    title: "Abogados de Arriendo y Juicios de Desalojo en Chile | LegalUp",
    description: "Expertos en juicios de arrendamiento, ley 'Devuélveme mi Casa', desalojos y cobranza de rentas impagas. Protege tu propiedad con la mejor asesoría legal online.",
    h1: "Abogados Especialistas en Arriendos y Desalojos",
    introText: "Recuperar tu propiedad no debería ser un calvario. Especialistas en juicios de arrendamiento bajo la nueva ley 'Devuélveme mi Casa', te ayudamos a cobrar rentas impagas y gestionar desalojos de forma legal y efectiva.",
    longSeoTitle: "Juicios de Arrendamiento: Recuperación de Propiedades y Ley Devuélveme mi Casa",
    longSeoText: `
      <p>La inversión inmobiliaria en Chile requiere de una protección legal sólida. Los conflictos entre arrendadores y arrendatarios son frecuentes y, si no se manejan correctamente, pueden significar pérdidas económicas considerables. En LegalUp, conectamos a propietarios con abogados especialistas en la Ley de Arriendo y la reciente <strong>Ley 21.461 (Ley Devuélveme mi Casa)</strong>.</p>

      <h3>¿En qué consiste la Ley Devuélveme mi Casa?</h3>
      <p>Esta normativa ha marcado un antes y un después en los juicios de arrendamiento en Chile. Anteriormente, recuperar una propiedad por no pago de rentas podía tardar más de un año. Hoy, gracias al <strong>procedimiento monitorio</strong> introducido por esta ley, es posible obtener una orden de restitución anticipada en tiempos mucho más breves. Si el arrendatario no paga la deuda o no se opone con fundamentos válidos en un plazo de 10 días desde la notificación, el juez puede ordenar el desalojo inmediato con auxilio de la fuerza pública.</p>

      <h3>Servicios específicos para Propietarios</h3>
      <ul>
        <li><strong>Terminación de Contrato por Falta de Pago:</strong> Iniciamos acciones legales rápidas para cobrar rentas impagas, gastos comunes y cuentas de servicios básicos.</li>
        <li><strong>Desahucio del Contrato:</strong> Gestión legal para poner término a contratos de duración indefinida o mes a mes.</li>
        <li><strong>Recuperación de Propiedades Ocupadas:</strong> Acciones legales contra precarios o personas que ocupan un inmueble sin contrato y por mera tolerancia del dueño.</li>
        <li><strong>Indemnización por Daños:</strong> Demandas para cubrir los costos de reparaciones por daños estructurales o mal uso de la propiedad al término del arriendo.</li>
      </ul>

      <h3>La importancia de un buen Contrato de Arriendo</h3>
      <p>La prevención es la mejor estrategia. Un contrato de arriendo bien redactado, idealmente otorgado ante notario, es la base para una defensa exitosa. Nuestros abogados asesoran en la redacción de cláusulas críticas, como las de reajustabilidad (IPC), multas por atraso, prohibición de subarrendar y la designación de un codeudor solidario que garantice el pago.</p>

      <p>En LegalUp, nuestra red de abogados tiene vasta experiencia litigando en tribunales civiles y gestionando notificaciones mediante receptores judiciales. Si tu arrendatario dejó de pagar o se niega a abandonar la propiedad, el tiempo es tu peor enemigo. Actúa hoy mismo para proteger tu patrimonio con la ayuda de profesionales expertos.</p>
    `,
    faqs: [
      {
        question: "¿Qué es la Ley 'Devuélveme mi Casa'?",
        answer: "Es la Ley 21.461 que agiliza los juicios de arriendo. Permite solicitar al juez que ordene la restitución de la propiedad de forma anticipada si hay rentas impagas o si el inmueble ha sido dañado, acortando los plazos de desalojo."
      },
      {
        question: "¿Qué hacer si el arrendatario no paga la renta?",
        answer: "Se debe presentar una demanda de terminación de contrato por no pago de rentas. Con la nueva ley, el arrendatario tiene 10 días para pagar o defenderse; de lo contrario, se ordena el lanzamiento (desalojo)."
      },
      {
        question: "¿Se puede desalojar a un arrendatario sin juicio?",
        answer: "No. En Chile está prohibido el autotutela. No puedes cambiar chapas ni cortar servicios por tu cuenta. El desalojo debe ser ordenado por un tribunal y ejecutado por un receptor judicial."
      },
      {
        question: "¿Qué pasa si no tengo contrato escrito?",
        answer: "El contrato verbal es válido, pero más difícil de probar. La ley presume que la renta es la que declara el arrendatario si no hay recibos. Siempre es recomendable escriturar y notarizar los contratos."
      },
      {
        question: "¿Puedo cobrar los gastos comunes y cuentas de servicios impagas?",
        answer: "Sí, en la misma demanda de terminación de contrato se puede solicitar el cobro de rentas, gastos comunes, cuentas de agua, luz, gas y cualquier otro perjuicio documentado."
      }
    ]
  },
  penal: {
    title: "Abogados Penales en Chile | Defensa y Querellas 24/7 | LegalUp",
    description: "Defensa penal experta y querellas criminales. Abogados especialistas en delitos económicos, violencia intrafamiliar, estafas y Ley de Drogas. Asesoría 24/7.",
    h1: "Abogados Penales: Defensa y Querellas Criminales",
    introText: "En materia penal, cada minuto cuenta. Ya sea que necesites una defensa técnica ante una acusación o quieras interponer una querella por un delito cometido en tu contra, nuestros abogados penales te entregarán una estrategia sólida y acompañamiento constante.",
    longSeoTitle: "Derecho Penal en Chile: Defensa Técnica y Representación de Víctimas",
    longSeoText: `
      <p>El sistema procesal penal chileno es garantista y descansa sobre el principio de que toda persona es inocente hasta que se demuestre lo contrario en un juicio oral y público. En materia penal, la libertad y la reputación están en juego, por lo que contar con un abogado penalista desde el primer minuto no es una opción, sino una necesidad crítica.</p>

      <h3>Defensa Penal: Protegiendo tu Libertad</h3>
      <p>Si eres imputado por un delito, tienes derechos fundamentales que deben ser resgrowardados. Nuestros abogados especialistas intervienen en todas las etapas del proceso:</p>
      <ul>
        <li><strong>Control de Detención:</strong> Aseguramos que la detención haya sido legal y nos oponemos a medidas cautelares desproporcionadas como la prisión preventiva.</li>
        <li><strong>Investigación y Formalización:</strong> Analizamos la carpeta fiscal, solicitamos diligencias de investigación y preparamos una defensa técnica sólida para desvirtuar las acusaciones.</li>
        <li><strong>Salidas Alternativas:</strong> Cuando es conveniente, gestionamos suspensiones condicionales del procedimiento o acuerdos reparatorios que eviten una condena y antecedentes penales.</li>
        <li><strong>Juicio Oral:</strong> Representación experta ante los Tribunales de Juicio Oral en lo Penal, presentando pruebas y contrainterrogando testigos para obtener la absolución.</li>
      </ul>

      <h3>Representación de Víctimas: Querellas Criminales</h3>
      <p>Si has sido víctima de un delito, el Estado a través de la Fiscalía tiene el deber de investigar, pero como víctima tienes el derecho de participar activamente mediante una <strong>querella criminal</strong>. Un abogado querellante puede solicitar diligencias específicas, aportar pruebas y asegurar que los intereses de la víctima sean considerados durante todo el proceso, incluyendo la búsqueda de una reparación económica por los daños sufridos.</p>

      <h3>Especialidades Penales</h3>
      <p>Nuestra red incluye expertos en diversas áreas de alta complejidad, como Delitos Económicos (estafas, lavado de activos), Ley de Drogas (20.000), Violencia Intrafamiliar, Accidentes de Tránsito bajo influencia del alcohol (Ley Emilia) y Delitos Sexuales. Cada uno de estos delitos requiere un enfoque técnico distinto y un conocimiento profundo de leyes especiales.</p>

      <p>En LegalUp, sabemos que enfrentar el sistema penal es abrumador. Por eso, te ofrecemos acceso inmediato a abogados penales con disponibilidad 24/7 para urgencias, controles de detención y asesoría preventiva. Tu defensa comienza con una asesoría experta y oportuna.</p>
    `,
    faqs: [
      {
        question: "¿Qué hacer ante una detención?",
        answer: "Tienes derecho a guardar silencio y a ser asistido por un abogado desde el primer momento. No prestes declaración ante la policía ni firmes documentos sin la presencia y consejo de tu defensa técnica."
      },
      {
        question: "¿Qué es la formalización de la investigación?",
        answer: "Es el acto donde el Fiscal comunica al imputado, ante un Juez de Garantía, que existe una investigación en su contra por hechos delictivos específicos. Aquí se suelen discutir las medidas cautelares (como firma, arraigo o prisión preventiva)."
      },
      {
        question: "¿Cómo interponer una querella criminal?",
        answer: "La querella debe ser presentada por un abogado ante el Juzgado de Garantía. A diferencia de una denuncia, la querella te permite ser parte activa del proceso, pedir diligencias y apelar resoluciones."
      },
      {
        question: "¿Qué es una salida alternativa?",
        answer: "Son mecanismos (suspensión condicional o acuerdo reparatorio) que permiten terminar el proceso sin llegar a juicio oral y, lo más importante, sin que quede registro en el certificado de antecedentes, cumpliendo ciertas condiciones."
      },
      {
        question: "¿Cuál es la diferencia entre un Fiscal y un Abogado Defensor?",
        answer: "El Fiscal (Ministerio Público) es quien dirige la investigación y busca probar el delito. El Abogado Defensor protege los derechos del imputado y busca su absolución o la pena mínima posible."
      }
    ]
  }
};

