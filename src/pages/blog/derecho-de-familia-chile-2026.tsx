import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import InArticleCTA from "@/components/blog/InArticleCTA";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Cuál es el mínimo de pensión de alimentos en Chile?",
      answer: "No existe un mínimo fijo legal. El monto depende de los ingresos del alimentante y las necesidades del niño o adolecente, pero el juez debe asegurar que cubra gastos básicos."
    },
    {
      question: "¿Pueden quitarme el sueldo por pensión?",
      answer: "Sí. El tribunal puede ordenar retención directa del sueldo por parte del empleador para asegurar el pago de la pensión de alimentos."
    },
    {
      question: "¿Puedo ir a la cárcel por no pagar pensión?",
      answer: "Sí. En caso de incumplimiento reiterado, el tribunal puede decretar arresto nocturno o incluso arresto completo como medida de presión."
    },
    {
      question: "¿Puedo pedir aumento de pensión de alimentos?",
      answer: "Sí. Si cambian las necesidades del niño o adolecente, o la situación económica de los padres, es posible solicitar una modificación del monto de la pensión."
    },
    {
      question: "¿Puedo impedir visitas si no pagan pensión?",
      answer: "No. El régimen de visitas y la pensión de alimentos son procesos independientes. Sin embargo, puedes solicitar medidas para exigir el pago de la pensión."
    },
    {
      question: "¿Se puede cambiar el cuidado personal?",
      answer: "Sí. Si cambian las circunstancias familiares y el bienestar del niño lo requiere, se puede solicitar una modificación del cuidado personal."
    },
    {
      question: "¿Los mensajes de WhatsApp sirven como prueba?",
      answer: "Sí. Las conversaciones digitales pueden presentarse como prueba en tribunales, siempre que se acrediten correctamente."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Derecho de Familia en Chile 2026: guía completa de pensiones, divorcio y cuidado de hijos"
        description="El Derecho de Familia en Chile regula las relaciones jurídicas entre padres, hijos, parejas y otros vínculos familiares. En esta Guía completa 2026 de Derecho de Familia, revisamos qué abarca esta área del derecho, cuáles son los trámites más comunes en los tribunales de familia y qué puedes hacer si enfrentas un conflicto familiar."
        image="/assets/derecho-de-familia-chile-2026.png"
        url="https://legalup.cl/blog/derecho-de-familia-chile-2026"
        datePublished="2026-02-25"
        dateModified="2026-03-16"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />
      
      {/* Hero Section */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-green-600 font-serif mb-6">
            Derecho de Familia en Chile 2026: guía completa de pensiones, divorcio y cuidado de hijos
          </h1>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2">
              {[
                "El Derecho de Familia regula pensiones, divorcios y cuidado personal de hijos",
                "Muchos trámites familiares requieren intervención del tribunal",
                "La pensión de alimentos puede cobrarse judicialmente si no se paga",
                "Los acuerdos familiares pueden formalizarse legalmente",
                "Actuar a tiempo ayuda a proteger derechos y evitar conflictos mayores"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl">
            El Derecho de Familia en Chile regula las relaciones jurídicas entre padres, hijos, parejas y otros vínculos familiares. En esta Guía completa 2026 de Derecho de Familia, revisamos qué abarca esta área del derecho, cuáles son los trámites más comunes en los tribunales de familia y qué puedes hacer si enfrentas un conflicto familiar.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>16 de Marzo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 12 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          
          <BlogShare 
            title="¿Qué es el Derecho de Familia y cómo funciona en Chile? Guía 2026 completa" 
            url="https://legalup.cl/blog/derecho-de-familia-chile-2026" 
            showBorder={false}
          />

          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-lg text-gray-600 leading-relaxed">
              Los problemas familiares suelen ser situaciones emocionalmente complejas: pensiones de alimentos, separación de pareja, cuidado de los hijos o conflictos por visitas. En estos casos, conocer cómo funciona la ley puede ayudarte a tomar mejores decisiones y proteger tus derechos y los de tus hijos.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              En Chile, los Tribunales de Familia tienen como objetivo resolver estos conflictos priorizando siempre el interés superior del niño, niña o adolescente, un principio central en la legislación actual.
            </p>
          </div>

          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 my-8">
            <h3 className="text-blue-900 font-bold mb-4">En esta guía aprenderás:</h3>
            <ul className="grid gap-3 list-none p-0">
              {[
                "Qué es el derecho de familia",
                "Cuáles son los juicios más comunes en Chile",
                "Cómo funcionan los tribunales de familia",
                "Qué documentos se necesitan para iniciar una causa",
                "Preguntas frecuentes sobre divorcio, pensión de alimentos y cuidado de los hijos",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-blue-800 text-base">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What is Family Law */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">¿Qué es el Derecho de Familia?</h2>
            <p className="text-gray-600 mb-4">
              El Derecho de Familia es la rama del derecho que regula las relaciones legales entre los miembros de una familia.
            </p>
            <p className="text-gray-600 mb-4">
              En Chile, estas normas buscan proteger los vínculos familiares, especialmente cuando existen hijos o personas en situación de vulnerabilidad.
            </p>
            <p className="text-gray-600 mb-4">
              El derecho de familia regula aspectos como:
            </p>
            <ul className="space-y-2 items-center gap-3 bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm text-gray-600">
              <li className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span className="text-base">Relaciones de pareja</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span className="text-base">Relaciones entre padres e hijos</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span className="text-base">Obligaciones económicas dentro de la familia</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span className="text-base">Protección de niños, niñas y adolescentes</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span className="text-base">Resolución de conflictos familiares</span>
              </li>
            </ul>
            <p className="text-gray-600 mt-6 mb-4">
              Dentro de esta área se incluyen diversos temas legales:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {["💰 Pensión de alimentos", "👶 Cuidado personal de hijos", "📅 Régimen de visitas", "💔 Divorcio", "🛡️ Violencia intrafamiliar", "👨‍👩‍👧 Adopción", "🏠 Bienes familiares"].map((t, i) => (
                <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-gray-700 font-medium">{t}</span>
                </div>
              ))}
            </div>
            <p className="text-base text-gray-500">
              Debido a la naturaleza sensible de estos conflictos, los tribunales de familia aplican criterios especiales orientados a proteger el bienestar de los niños y promover acuerdos entre las partes.
            </p>
          </div>

          {/* Important Topics */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">¿Cuáles son los temas más importantes del Derecho de Familia en Chile?</h2>
            <p className="text-gray-600 mb-6">
              En los tribunales de familia existen ciertos conflictos que aparecen con mayor frecuencia. A continuación revisamos los más comunes.
            </p>
            
            <div className="space-y-10">
              {/* 1. Pensión de alimentos */}
              <div>
                <h3 className="text-xl font-bold mb-4">1. Pensión de alimentos</h3>
                <p className="text-gray-600 mb-4">
                  La pensión de alimentos en Chile corresponde al aporte económico que debe realizar un padre o madre para cubrir las necesidades básicas de sus hijos.
                </p>
                <p className="text-gray-600 mb-6">
                  Este dinero busca asegurar el bienestar del niño o adolescente y cubrir gastos esenciales:
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  {["Alimentación", "Educación", "Salud", "Vivienda", "Vestuario", "Transporte"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      <span className="text-gray-700 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
                  La obligación de pagar alimentos existe independientemente de si los padres están casados, separados o nunca convivieron.
                </p>
                
                {/* ¿Cuánto se paga? */}
                <div className="bg-gray-50 border-l-4 border-gray-500 p-6 rounded-r-xl mb-6">
                  <h4 className="font-bold text-gray-900 mb-2">¿Cuánto se paga de pensión de alimentos?</h4>
                  <p className="text-gray-800">No existe una cifra fija. El monto depende de las necesidades del niño y la capacidad económica del padre o madre que paga.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  {[
                    { label: "Necesidades del niño", desc: "Gastos actuales del niño o adolescente" },
                    { label: "Capacidad económica", desc: "Ingresos del alimentante" },
                    { label: "Nivel de vida previo", desc: "Estándar anterior" },
                    { label: "Número de hijos", desc: "Cantidad de beneficiarios" },
                  ].map((item, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <p className="font-bold text-gray-900">{item.label}</p>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Tabla referencial */}
                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl mb-6">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Tabla Referencial 2026</p>
                  <h4 className="font-bold text-amber-900 mb-3">¿Cuánto corresponde de pensión de alimentos?</h4>
                  <p className="text-amber-800 mb-4">No existe tabla oficial obligatoria, pero los tribunales suelen considerar estos rangos:</p>
                  <div className="space-y-3">
                    {[
                      { hijos: "1 hijo", rango: "30% - 40%", color: "blue" },
                      { hijos: "2 hijos", rango: "40% - 50%", color: "amber" },
                      { hijos: "3+ hijos", rango: "> 50%", color: "red" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-white p-3 rounded-lg">
                        <span className="font-semibold text-gray-900">{item.hijos}</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold bg-${item.color}-100 text-${item.color}-700`}>
                          {item.rango}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-amber-700 mt-4">El juez analiza cada caso individualmente considerando ingresos, gastos y necesidades del niño.</p>
                </div>

                {/* ¿Qué pasa si no se paga? */}
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 mb-3">¿Qué pasa si no se paga la pensión?</h4>
                  <p className="text-gray-800 mb-4">Medidas de presión que puede ordenar el tribunal:</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  {[
                    { item: "Retención del sueldo", icon: "💼" },
                    { item: "Retención de impuestos", icon: "📄" },
                    { item: "Retención del seguro de cesantía", icon: "🛡️" },
                    { item: "Suspensión de licencia", icon: "🚗" },
                    { item: "Prohibición de salir del país", icon: "✈️" },
                    { item: "Arresto nocturno o completo", icon: "⚠️" },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-gray-700 font-medium">{m.item}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-red-950 p-6 rounded-2xl text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 blur-2xl rounded-full -mr-16 -mt-16"></div>
                  <p className="font-bold text-red-200 uppercase tracking-widest text-xs mb-2">Actualización 2026</p>
                  <p className="text-lg font-serif">"La ley ha incorporado herramientas adicionales para mejorar el cumplimiento de las pensiones alimenticias."</p>
                </div>
                <InArticleCTA
                    message="¿No te están pagando la pensión? Si existe deuda de pensión de alimentos, puedes iniciar acciones legales para exigir el pago y aplicar medidas como retención de sueldo, embargo de bienes o incluso arresto."
                    buttonText="Habla con un abogado ahora"
                    category="Derecho de Familia"
                  />
              </div>

              {/* 2. Cuidado personal */}
              <div>
                <h3 className="text-xl font-bold mb-4">2. Cuidado personal de los hijos (tuición)</h3>
                <p className="text-gray-600 mb-6">
                  El cuidado personal determina con quién vive el niño o adolescente la mayor parte del tiempo. Este concepto reemplazó al antiguo término "tuición".
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {[
                    { title: "Cuidado personal exclusivo", desc: "El niño vive principalmente con uno de los padres. El otro padre mantiene un régimen de visitas.", color: "blue" },
                    { title: "Cuidado personal compartido", desc: "Ambos padres comparten responsabilidades y tiempos de cuidado. Este modelo busca que ambos participen activamente.", color: "green" },
                  ].map((item, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-3 bg-${item.color}-50 text-${item.color}-700 border border-${item.color}-100`}>
                        Modalidad {i + 1}
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-xl">
                  <p className="font-bold text-green-900 mb-2">Interés superior del niño</p>
                  <p className="text-green-800">El criterio principal que utilizan los tribunales es siempre el  o adolescente o adolescente. El juez evaluará cuál alternativa garantiza mayor estabilidad emocional, seguridad y desarrollo.</p>
                </div>
              </div>

              {/* 3. Régimen de visitas */}
              <div>
                <h3 className="text-xl font-bold mb-4">3. Régimen de relación directa y regular (visitas)</h3>
                <p className="text-gray-600 mb-6">
                  El régimen de relación directa y regular, conocido comúnmente como régimen de visitas, es el derecho del padre o madre que no tiene el cuidado personal a mantener contacto con sus hijos.
                </p>

                <div className="grid sm:grid-cols-2 md:grid-cols-2 gap-3 mb-6">
                  {[
                    { item: "Visitas presenciales", icon: "👋" },
                    { item: "Fines de semana alternados", icon: "📅" },
                    { item: "Vacaciones compartidas", icon: "🏖️" },
                    { item: "Feriados especiales", icon: "🎉" },
                    { item: "Videollamadas", icon: "📹" },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-gray-700 font-medium">{m.item}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl">
                  <h4 className="font-bold text-amber-900 mb-2">¿Qué pasa si no se cumplen las visitas?</h4>
                  <p className="text-amber-800">Si uno de los padres impide el contacto, la otra parte puede solicitar cumplimiento forzado ante el tribunal. El juez puede ordenar medidas para asegurar que el régimen de visitas se cumpla.</p>
                </div>
              </div>

              {/* 4. Divorcio */}
              <div>
                <h3 className="text-xl font-bold mb-4">4. Divorcio en Chile</h3>
                <p className="text-gray-600 mb-6">El divorcio es el proceso legal que pone término al vínculo matrimonial. En Chile existen diferentes tipos de divorcio según la situación de la pareja.</p>

                <div className="space-y-4">
                  {[
                    { title: "Divorcio de mutuo acuerdo", desc: "El más rápido y sencillo. Requiere acuerdo completo sobre pensión, cuidado, visitas y compensación. Se requiere al menos 1 año de cese de convivencia.", tag: "Más común", color: "green" },
                    { title: "Divorcio unilateral", desc: "Se presenta cuando uno desea divorciarse y el otro no. Se requiere demostrar 3 años de cese de convivencia.", tag: "Complejo", color: "amber" },
                    { title: "Divorcio por culpa", desc: "Menos frecuente. Se solicita por maltrato, abandono o infidelidad con daño grave. Es más complejo de probar.", tag: "Excepcional", color: "red" },
                  ].map((item, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-${item.color}-50 text-${item.color}-700 border border-${item.color}-100`}>
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Violencia intrafamiliar */}
              <div>
                <h3 className="text-xl font-bold mb-4">5. Violencia intrafamiliar (VIF)</h3>
                <p className="text-gray-700 mb-6">La violencia intrafamiliar incluye cualquier tipo de maltrato:</p>

                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  {["✋ Violencia física", "🧠 Violencia psicológica", "💰 Violencia económica", "⚠️ Violencia sexual"].map((v, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <span className="text-gray-700 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-r-xl">
                  <p className="font-bold text-red-900 mb-4">Medidas de protección inmediatas:</p>
                  <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    {["Prohibición de acercamiento", "Salida del agresor", "Protección policial", "Tratamientos obligatorios"].map((m, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-800">{m}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-red-800 font-medium">El objetivo es proteger a la víctima y prevenir nuevas situaciones de violencia.</p>
                </div>
              </div>

              {/* 6. Adopción */}
              <div>
                <h3 className="text-xl font-bold mb-4">6. Adopción</h3>
                <p className="text-gray-600 mb-6">
                  La adopción en Chile es el proceso legal mediante el cual un niño o niña pasa a formar parte de una nueva familia. Este procedimiento está altamente regulado y supervisado por tribunales y organismos especializados.
                </p>

                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {[
                    { label: "Proceso regulado", desc: "Supervisado por tribunales" },
                    { label: "Análisis exhaustivo", desc: "Condiciones familiares" },
                  ].map((item, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <h4 className="font-bold text-gray-900 mb-1">{item.label}</h4>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-xl">
                  <p className="font-bold text-blue-900 mb-2">Objetivo principal</p>
                  <p className="text-blue-800">Garantizar que el niño sea integrado a un entorno seguro y estable, priorizando siempre su bienestar y desarrollo.</p>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">¿Cómo funcionan los juicios de familia en Chile? (2026)</h2>
            <p className="text-gray-600 mb-6">Los conflictos familiares suelen resolverse a través de los Tribunales de Familia. Estos tribunales siguen un procedimiento específico diseñado para promover acuerdos y proteger a los niños.</p>

            <div className="space-y-4 mb-6">
              {[
                { title: "Presentación de la demanda", desc: "El proceso comienza cuando una persona presenta una demanda ante el tribunal de familia competente.", color: "blue" },
                { title: "Mediación obligatoria", desc: "La ley exige mediación familiar en temas como pensión de alimentos, cuidado personal y régimen de visitas.", color: "amber" },
                { title: "Audiencia preparatoria", desc: "Se organizan las pruebas a presentar: informes sociales, psicológicos, testigos y documentos.", color: "green" },
                { title: "Audiencia de juicio", desc: "Se presentan todas las pruebas ante el juez. El tribunal analiza los antecedentes.", color: "purple" },
                { title: "Sentencia", desc: "El juez dicta una sentencia resolviendo el conflicto, priorizando siempre el interés superior del niño o adolecente.", color: "red" },
              ].map((step, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                  <div className={`bg-gray-900 p-2 rounded-lg text-white text-sm w-7 h-7 flex items-center justify-center flex-shrink-0`}>
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                    <p className="text-gray-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-gray-600 mb-4 leading-relaxed">Explora nuestras guías legales completas en Chile para más información sobre procesos judiciales:</p>
            <div className="text-center py-4 border-t border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/derecho-arrendamiento-chile-guia-completa-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 Derecho de arriendo en Chile
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12 bg-gray-50 p-8 rounded-2xl border border-gray-100">
            <h2 className="text-2xl font-bold mb-6">Documentos frecuentes en causas de familia</h2>
            <p className="text-gray-600 mb-6">Para iniciar un proceso en tribunales de familia generalmente se requieren ciertos documentos. Entre los más comunes se encuentran:</p>
            <div className="grid md:grid-cols-1 gap-4 text-gray-700">
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Certificado de nacimiento del niño o adolescente</div>
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Certificado de matrimonio (si corresponde)</div>
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Certificados de ingresos</div>
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Acta de mediación frustrada</div>
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Documentos que acrediten convivencia o separación</div>
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Antecedentes de gastos del niño o adolecente</div>
            </div>
            <p className="mt-6 text-base text-gray-500 italic">Contar con estos documentos facilita el desarrollo del proceso judicial.</p>
          </div>

          {/* Conclusion */}
          <div className="prose prose-lg max-w-none mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">Conclusión</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              El Derecho de Familia en Chile regula algunos de los aspectos más importantes de la vida personal y familiar, desde la crianza de los hijos hasta la resolución de conflictos entre parejas.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Los tribunales de familia tienen como objetivo proteger especialmente a los niños, niñas y adolescentes, garantizando que cualquier decisión judicial priorice su bienestar y desarrollo.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Si enfrentas un conflicto relacionado con pensión de alimentos, divorcio, cuidado personal o régimen de visitas, conocer cómo funciona el sistema legal puede ayudarte a tomar mejores decisiones y defender tus derechos.
            </p>
            <p className="text-gray-600 font-semibold leading-relaxed">
              En situaciones complejas, buscar asesoría legal especializada en derecho de familia puede marcar una gran diferencia en el resultado del proceso.
            </p>
          </div>

          {/* Preguntas frecuentes */}
          <div className="mb-12" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes sobre Derecho de Familia en Chile</h2>
            
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* CTA Section */}
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Necesitas ayuda en un caso de familia?</h2>
          <p className="text-lg text-gray-700 mb-6">
            Un abogado especialista puede ayudarte a:
          </p>

          <div className="grid gap-3 md:grid-cols-2 mb-8 max-w-2xl mx-auto text-left">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Presentar demandas</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Revisar acuerdos</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Representarte ante el tribunal</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Asegurar el interés superior del niño</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Proteger tus derechos y los de tus hijos</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search?category=Derecho+de+Familia">
              <Button 
                size="lg" 
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_derecho_familia_primary',
                  });
                }}
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto"
              >
                Hablar con abogado ahora
              </Button>
            </Link>
            
          </div>
        </section>

      </div>

      <RelatedLawyers category="Derecho de Familia" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        {/* Compartir - Growth Hack */}
        <div className="mt-8">
          <BlogShare 
            title="¿Qué es el Derecho de Familia y cómo funciona en Chile? Guía 2026 completa" 
            url="https://legalup.cl/blog/derecho-de-familia-chile-2026" 
          />
        </div>

        <BlogNavigation currentArticleId="derecho-de-familia-chile-2026" />

        {/* Back to Blog */}
        <div className="mt-4 text-center">
          <Link 
            to="/blog" 
            className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Blog
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogArticle;
