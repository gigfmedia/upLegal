import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Puedo pedir aumento de pensión de alimentos?",
      answer: "Sí. Si cambian las necesidades del niño o la situación económica de los padres, es posible solicitar una modificación del monto de la pensión."
    },
    {
      question: "¿Puedo impedir visitas si no pagan pensión?",
      answer: "No. El régimen de visitas y la pensión de alimentos son procesos independientes. Sin embargo, puedes solicitar medidas para exigir el pago de la pensión."
    },
    {
      question: "¿Se puede cambiar el cuidado personal?",
      answer: "Sí. Si cambian las circunstancias familiares y el bienestar del menor lo requiere, se puede solicitar una modificación del cuidado personal."
    },
    {
      question: "¿Los mensajes de WhatsApp sirven como prueba?",
      answer: "Sí. Las conversaciones digitales pueden presentarse como prueba en tribunales, siempre que se acrediten correctamente."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Qué es el Derecho de Familia y cómo funciona en Chile? Guía 2026 completa"
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
            ¿Qué es el Derecho de Familia y cómo funciona en Chile? Guía 2026 completa
          </h1>
          
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          
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

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">En esta guía aprenderás:</h2>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <span>Qué es el derecho de familia</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <span>Cuáles son los juicios más comunes en Chile</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <span>Cómo funcionan los tribunales de familia</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <span>Qué documentos se necesitan para iniciar una causa</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <span>Preguntas frecuentes sobre divorcio, pensión de alimentos y cuidado de hijos</span>
              </li>
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
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Relaciones de pareja</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Relaciones entre padres e hijos</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Obligaciones económicas dentro de la familia</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Protección de niños, niñas y adolescentes</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span>Resolución de conflictos familiares</span>
              </li>
            </ul>
            <p className="text-gray-600 mt-4">
              Dentro de esta área se incluyen diversos temas legales como:
            </p>
            <ul className="space-y-2 text-gray-600 mt-2">
              <li>• Pensión de alimentos</li>
              <li>• Cuidado personal de hijos</li>
              <li>• Régimen de visitas</li>
              <li>• Divorcio</li>
              <li>• Violencia intrafamiliar</li>
              <li>• Adopción</li>
              <li>• Bienes familiares</li>
            </ul>
            <p className="text-base text-gray-500 mt-4">
              Debido a la naturaleza sensible de estos conflictos, los tribunales de familia aplican criterios especiales orientados a proteger el bienestar de los menores y promover acuerdos entre las partes.
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
                <p className="text-gray-600 mb-4">
                  Este dinero busca asegurar el bienestar del niño o adolescente y cubrir gastos esenciales como:
                </p>
                <ul className="grid grid-cols-2 gap-2 text-gray-600 mb-4">
                  <li>• Alimentación</li>
                  <li>• Educación</li>
                  <li>• Salud</li>
                  <li>• Vivienda</li>
                  <li>• Vestuario</li>
                  <li>• Transporte</li>
                </ul>
                <p className="text-gray-600 mb-4">
                  La obligación de pagar alimentos existe independientemente de si los padres están casados, separados o nunca convivieron.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-4">
                  <h4 className="font-bold mb-2">¿Cuánto se paga de pensión de alimentos?</h4>
                  <p className="text-gray-700 mb-2">No existe una cifra fija. El monto depende principalmente de dos factores:</p>
                  <ul className="list-disc ml-5 text-gray-700 mb-2">
                    <li>Necesidades del niño o adolescente</li>
                    <li>Capacidad económica del padre o madre que paga</li>
                  </ul>
                  <p className="text-gray-700">Los tribunales de familia suelen analizar: ingresos del demandado, gastos del menor, nivel de vida previo y número de hijos.</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                  <h4 className="font-bold text-red-900 mb-2">¿Qué pasa si no se paga la pensión?</h4>
                  <p className="text-red-800 mb-2">En Chile existen diversas medidas para obligar el pago. Entre las más comunes están:</p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-red-800">
                    <li>• Retención del sueldo</li>
                    <li>• Retención de devolución de impuestos</li>
                    <li>• Retención del seguro de cesantía</li>
                    <li>• Suspensión de licencia de conducir</li>
                    <li>• Prohibición de salir del país</li>
                    <li>• Arresto nocturno o arresto completo</li>
                  </ul>
                  <p className="text-red-800 mt-2 text-base">En los últimos años, la ley ha incorporado herramientas adicionales para mejorar el cumplimiento de las pensiones alimenticias.</p>
                </div>
              </div>

              {/* 2. Cuidado personal */}
              <div>
                <h3 className="text-xl font-bold mb-4">2. Cuidado personal de los hijos (tuición)</h3>
                <p className="text-gray-600 mb-4">
                  El cuidado personal determina con quién vive el niño o adolescente la mayor parte del tiempo. Este concepto reemplazó al antiguo término “tuición”.
                </p>
                <p className="text-gray-600 mb-4 text-base font-semibold uppercase tracking-wider">En Chile existen dos modalidades principales:</p>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h4 className="font-bold mb-2">Cuidado personal exclusivo</h4>
                    <p className="text-gray-600">El niño vive principalmente con uno de los padres. El otro padre mantiene un régimen de visitas.</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h4 className="font-bold mb-2">Cuidado personal compartido</h4>
                    <p className="text-gray-600">Ambos padres comparten responsabilidades y tiempos de cuidado. Este modelo busca que ambos participen activamente en la crianza.</p>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                  <p className="text-green-800">
                    <strong>El criterio principal que utilizan los tribunales es siempre el interés superior del niño.</strong> Esto significa que el juez evaluará cuál alternativa garantiza mayor estabilidad emocional, seguridad y bienestar para el menor.
                  </p>
                </div>
              </div>

              {/* 3. Régimen de visitas */}
              <div>
                <h3 className="text-xl font-bold mb-4">3. Régimen de relación directa y regular (visitas)</h3>
                <p className="text-gray-600 mb-4">
                  El régimen de relación directa y regular, conocido comúnmente como régimen de visitas, es el derecho del padre o madre que no tiene el cuidado personal a mantener contacto con sus hijos.
                </p>
                <p className="text-gray-600 mb-4">Este régimen puede incluir:</p>
                <ul className="grid grid-cols-2 gap-2 text-gray-600 mb-4">
                  <li>• Visitas presenciales</li>
                  <li>• Fines de semana alternados</li>
                  <li>• Vacaciones compartidas</li>
                  <li>• Feriados especiales</li>
                  <li>• Videollamadas o contacto digital</li>
                </ul>
                <p className="text-gray-600 mb-4 italic">El objetivo es mantener el vínculo afectivo entre el niño y ambos padres.</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                  <h4 className="font-bold text-amber-900 mb-1">¿Qué pasa si no se cumplen las visitas?</h4>
                  <p className="text-amber-800">
                    Si uno de los padres impide el contacto o no respeta el régimen establecido, la otra parte puede solicitar cumplimiento forzado ante el tribunal de familia. El juez puede ordenar medidas para asegurar que el régimen de visitas se cumpla correctamente.
                  </p>
                </div>
              </div>

              {/* 4. Divorcio */}
              <div>
                <h3 className="text-xl font-bold mb-4">4. Divorcio en Chile</h3>
                <p className="text-gray-600 mb-6">El divorcio es el proceso legal que pone término al vínculo matrimonial. En Chile existen diferentes tipos de divorcio.</p>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-bold text-lg">Divorcio de mutuo acuerdo</h4>
                    <p className="text-gray-600">Es el más rápido y sencillo. Requiere que ambos cónyuges estén de acuerdo en terminar el matrimonio y presenten un acuerdo completo sobre: pensión de alimentos, cuidado de hijos, régimen de visitas y compensación económica. Para solicitarlo se requiere al menos un año de cese de convivencia.</p>
                  </div>
                  <div className="border-l-4 border-blue-300 pl-4">
                    <h4 className="font-bold text-lg">Divorcio unilateral</h4>
                    <p className="text-gray-600">Se presenta cuando uno de los cónyuges desea divorciarse y el otro no. En este caso se requiere demostrar tres años de cese de convivencia.</p>
                  </div>
                  <div className="border-l-4 border-gray-300 pl-4">
                    <h4 className="font-bold text-lg">Divorcio por culpa</h4>
                    <p className="text-gray-600">Es menos frecuente. Se puede solicitar cuando uno de los cónyuges incurre en conductas graves como: maltrato, abandono reiterado o infidelidad con daño grave. Sin embargo, este tipo de divorcio suele ser más complejo de probar.</p>
                  </div>
                </div>
              </div>

              {/* 5. Violencia intrafamiliar */}
              <div className="bg-red-50/50 p-6 rounded-xl border border-red-100">
                <h3 className="text-xl font-bold text-red-900 mb-4">5. Violencia intrafamiliar (VIF)</h3>
                <p className="text-gray-700 mb-4">La violencia intrafamiliar incluye cualquier tipo de maltrato dentro del núcleo familiar. Puede manifestarse de diferentes formas:</p>
                <ul className="grid grid-cols-2 gap-2 text-gray-700 mb-6">
                  <li>• Violencia física</li>
                  <li>• Violencia psicológica</li>
                  <li>• Violencia económica</li>
                  <li>• Violencia sexual</li>
                </ul>
                <p className="text-gray-700 mb-4">Cuando se presenta una denuncia por violencia intrafamiliar, el tribunal puede dictar medidas de protección inmediatas como:</p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-red-500" /> Prohibición de acercamiento</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-red-500" /> Salida del agresor del hogar</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-red-500" /> Protección policial</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-red-500" /> Tratamientos obligatorios</li>
                </ul>
                <p className="mt-4 font-semibold text-red-900">El objetivo es proteger a la víctima y prevenir nuevas situaciones de violencia.</p>
              </div>

              {/* 6. Adopción */}
              <div>
                <h3 className="text-xl font-bold mb-4">6. Adopción</h3>
                <p className="text-gray-600 mb-4">
                  La adopción en Chile es el proceso legal mediante el cual un niño o niña pasa a formar parte de una nueva familia. Este procedimiento está altamente regulado y supervisado por tribunales y organismos especializados.
                </p>
                <p className="text-gray-600 mb-4">
                  El objetivo principal es garantizar que el niño sea integrado a un entorno seguro y estable. La adopción implica un análisis exhaustivo de las condiciones familiares y del bienestar del menor.
                </p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">¿Cómo funcionan los juicios de familia en Chile? (2026)</h2>
            <p className="text-gray-600 mb-6">Los conflictos familiares suelen resolverse a través de los Tribunales de Familia. Estos tribunales siguen un procedimiento específico diseñado para promover acuerdos y proteger a los menores.</p>
            
            <div className="space-y-6">
              {[
                {
                  title: "Presentación de la demanda",
                  desc: "El proceso comienza cuando una persona presenta una demanda ante el tribunal de familia competente. Esto puede realizarse con la ayuda de un abogado."
                },
                {
                  title: "Mediación obligatoria",
                  desc: "En muchas materias familiares la ley exige pasar primero por una mediación familiar. Esto ocurre principalmente en temas como: pensión de alimentos, cuidado personal y régimen de visitas. La mediación busca que las partes lleguen a un acuerdo sin necesidad de juicio."
                },
                {
                  title: "Audiencia preparatoria",
                  desc: "Si no se logra acuerdo en mediación, el caso pasa a tribunal. En la audiencia preparatoria se organizan las pruebas que se presentarán: informes sociales, informes psicológicos, testigos, documentos."
                },
                {
                  title: "Audiencia de juicio",
                  desc: "En esta etapa se presentan todas las pruebas ante el juez. El tribunal analiza los antecedentes para tomar una decisión."
                },
                {
                  title: "Sentencia",
                  desc: "Finalmente, el juez dicta una sentencia resolviendo el conflicto. En todas las decisiones relacionadas con menores, el criterio principal será siempre el interés superior del niño."
                }
              ].map((step, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">{step.title}</h4>
                    <p className="text-gray-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12 bg-gray-50 p-8 rounded-2xl border border-gray-100">
            <h2 className="text-2xl font-bold mb-6">Documentos frecuentes en causas de familia</h2>
            <p className="text-gray-600 mb-6">Para iniciar un proceso en tribunales de familia generalmente se requieren ciertos documentos. Entre los más comunes se encuentran:</p>
            <div className="grid md:grid-cols-2 gap-4 text-gray-700">
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Certificado de nacimiento del niño o adolescente</div>
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Certificado de matrimonio (si corresponde)</div>
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Certificados de ingresos</div>
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Acta de mediación frustrada</div>
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Documentos que acrediten convivencia o separación</div>
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /> Antecedentes de gastos del menor</div>
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
            <Link to="/consulta">
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
                Consultar con Abogado Ahora
              </Button>
            </Link>
            <Link to="/search?category=Derecho+de+Familia">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_ver_abogados', {
                    article: window.location.pathname,
                    location: 'blog_cta_derecho_familia_secondary',
                  });
                }}
                className="border-green-900 text-green-900 hover:text-white hover:bg-green-900 px-8 py-3 w-full sm:w-auto"
              >
                Ver Abogados de Familia
              </Button>
            </Link>
          </div>
        </section>

      </div>

      <RelatedLawyers category="Derecho de Familia" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Compartir - Growth Hack */}
        <div className="mt-8">
          <BlogShare 
            title="¿Qué es el Derecho de Familia y cómo funciona en Chile? Guía 2026 completa" 
            url="https://legalup.cl/blog/derecho-de-familia-chile-2026" 
          />
        </div>

        <BlogNavigation 
          prevArticle={{
            id: "como-calcular-tu-finiquito-chile-2026",
            title: "¿Cómo calcular tu finiquito en Chile? Guía 2026 paso a paso",
            excerpt: "Calcular el finiquito en Chile puede generar dudas, especialmente porque intervienen distintos tipos de indemnizaciones, vacaciones pendientes y pagos proporcionales. Te explicamos cómo calcularlo correctamente.",
            image: "/assets/finiquito-chile-2026.png"
          }} 
          nextArticle={{
            id: "derecho-penal-chile-2026",
            title: "¿Qué hacer si te acusan de un delito en Chile? Guía de Derecho Penal 2026",
            excerpt: "Enfrentar una acusación penal puede ser difícil. Conoce tus derechos, cómo funciona el proceso penal en Chile y qué pasos seguir para tu defensa.",
            image: "/assets/derecho-penal-chile-2026.png"
          }}
        />

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
