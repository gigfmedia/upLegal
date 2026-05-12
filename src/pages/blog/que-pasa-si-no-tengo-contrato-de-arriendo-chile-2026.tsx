import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, Info, Shield, Search, MessageSquare, AlertCircle, XCircle } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import InArticleCTA from "@/components/blog/InArticleCTA";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Un contrato verbal tiene valor legal?",
      answer: "Sí, pero es más difícil de probar."
    },
    {
      question: "¿Me pueden desalojar sin contrato?",
      answer: "Sí, pero solo mediante un juicio."
    },
    {
      question: "¿Puedo exigir condiciones si no hay contrato?",
      answer: "Sí, pero deberás probar lo acordado."
    },
    {
      question: "¿El arrendador puede cambiar las reglas?",
      answer: "No arbitrariamente, pero puede terminar el arriendo."
    },
    {
      question: "¿Qué pasa si hay conflicto?",
      answer: "Se resuelve en tribunales con pruebas."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Qué pasa si no tengo contrato de arriendo en Chile? (Guía legal 2026)"
        description="Arrendar sin contrato escrito es mucho más común de lo que parece en Chile. Descubre tus derechos y qué hacer en esta Guía 2026."
        image="/assets/sin-contrato-arriendo-2026.png"
        url="https://legalup.cl/blog/que-pasa-si-no-tengo-contrato-de-arriendo-chile-2026"
        datePublished="2026-03-26"
        dateModified="2026-03-26"
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
          
          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600">
            ¿Qué pasa si no tengo contrato de arriendo en Chile? (Guía legal 2026)
          </h1>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400/80 mb-4">
              Resumen rápido
            </p>

            <ul className="space-y-2">
              {[
                "Sí puedes arrendar sin contrato escrito en Chile",
                "Igualmente existen derechos y obligaciones legales",
                "Sin contrato, probar acuerdos puede ser más difícil",
                "El arrendador no puede desalojarte por la fuerza",
                "Los conflictos suelen terminar resolviéndose en tribunales"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm sm:text-base text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xl max-w-3xl leading-relaxed">
            Arrendar sin contrato escrito es mucho más común de lo que parece en Chile. Muchas personas viven en una propiedad con acuerdos verbales, sin firmar ningún documento formal. Pero cuando surgen problemas, ¿qué pasa legalmente?
          </p>
          
          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>27 de Marzo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 8 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-12">
        <div className="bg-white sm:rounded-lg sm:shadow-sm p-4 sm:p-8">
          <BlogShare 
            title="¿Qué pasa si no tengo contrato de arriendo en Chile? (Guía legal 2026)" 
            url="https://legalup.cl/blog/que-pasa-si-no-tengo-contrato-de-arriendo-chile-2026" 
            showBorder={false}
          />
          
          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              Arrendar sin contrato escrito es mucho más común de lo que parece en Chile. Muchas personas viven en una propiedad con acuerdos verbales, sin firmar ningún documento formal.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Pero cuando surgen problemas —como no pago, aumento del arriendo o desalojo— aparece la gran duda: ¿Qué pasa legalmente si no hay contrato de arriendo?
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <p className="font-bold text-gray-900 mb-4 text-xl">En esta guía 2026 te explicamos:</p>
              <ul className="space-y-3 p-0 m-0">
                {[
                  "Si el arriendo es válido sin contrato",
                  "Qué derechos tiene el arrendatario",
                  "Qué puede hacer el dueño",
                  "Cómo se resuelven conflictos",
                  "Qué hacer en caso de problemas"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-base font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Es válido un arriendo sin contrato en Chile?</h2>
            <p className="text-gray-900 mb-6 leading-relaxed font-bold text-xl">Sí.</p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En Chile, un arriendo no necesita estar por escrito para ser válido. Esto significa que un acuerdo verbal entre arrendador y arrendatario sí tiene valor legal. Este tipo de acuerdo se conoce como:
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Contrato verbal o tácito</h3>
              <p className="text-gray-700 leading-relaxed font-medium">Aunque legalmente tiene validez, recuerda que en caso de conflicto es mucho más difícil de probar ante un tribunal.</p>
            </div>
            
            <h2 className="text-2xl font-bold mb-4 text-gray-900 mt-8">¿Qué implica no tener contrato escrito?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              No tener contrato genera incertidumbre en aspectos clave:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "Monto exacto del arriendo",
                "Fecha de pago",
                "Duración del acuerdo",
                "Reajustes",
                "Condiciones de término"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En caso de conflicto, todo esto debe probarse con:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "Transferencias bancarias",
                "Mensajes",
                "Testigos",
                "Comprobantes"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué derechos tiene el arrendatario sin contrato?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Aunque no exista contrato escrito, el arrendatario sigue teniendo derechos:
            </p>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">1. Derecho a no ser desalojado arbitrariamente</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  El arrendador no puede sacarte por la fuerza. Esto incluye:
                </p>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
                  <p className="text-gray-900 font-bold mb-4">Está prohibido por ley:</p>
                  <ul className="space-y-3 mb-4">
                    <li className="flex items-center gap-3 text-gray-700">
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <span>Cambiar la cerradura sin orden judicial</span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-700">
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <span>Sacar pertenencias por la fuerza</span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-700">
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <span>Cortar servicios básicos (agua, luz)</span>
                    </li>
                  </ul>
                  <p className="text-gray-900 font-bold italic">Todo esto constituye una acción ilegal y puede ser denunciado.</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">2. Derecho a un proceso judicial</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Para desalojarte, el dueño debe iniciar un juicio. Puedes revisar cómo funciona aquí:
                </p>
                <p className="text-gray-600 mb-4 leading-relaxed">Entiende los plazos y protecciones legales ante un desalojo:</p>
                <div className="text-center py-4 border-t border-b border-gray-100 my-8">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
                  <Link
                    to="/blog/orden-desalojo-chile-2026"
                    className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
                  >
                    👉 Guía completa: ¿Qué es una orden de desalojo?
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">3. Derecho a defensa</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Puedes:
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mb-4 mt-2">
                  {[
                    "Oponerte",
                    "Presentar pruebas",
                    "Explicar tu situación"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span className="text-base text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <InArticleCTA 
              message="Si estás en esta situación, puedes hablar con un abogado ahora mismo." 
              category="Derecho Inmobiliario"
            />
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué puede hacer el arrendador si no hay contrato?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">El dueño igual tiene herramientas legales.</p>
            
            <div className="grid sm:grid-cols-1 gap-6 mb-8">
              {[
                { title: "1. Poner término al arriendo", desc: "Al no haber plazo fijo, generalmente se considera un arriendo indefinido. El arrendador puede: Solicitar la restitución del inmueble o dar aviso previo." },
                { title: "2. Demandar judicialmente", desc: "Puede iniciar un juicio para: Recuperar la propiedad, Cobrar deudas o Formalizar el término del arriendo." },
                { title: "3. Usar la Ley 21.461", desc: "Incluso sin contrato, puede intentar aplicar el procedimiento monitorio si logra probar la relación de arriendo." }
              ].map((cause, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900 block mb-1">{cause.title}</span>
                    <span className="text-gray-600 text-base">{cause.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo se prueba un arriendo sin contrato?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed font-medium">Este es el punto más importante.</p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              En tribunales, puedes probar el arriendo con:
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Pruebas fundamentales</h3>
              <ul className="space-y-3 mb-6">
                {[
                  "Transferencias bancarias periódicas",
                  "Comprobantes de pago de servicios",
                  "Conversaciones (WhatsApp, correo)",
                  "Testimonios de vecinos",
                  "Cuentas que llegan a tu nombre"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-base font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-gray-900 font-bold">Sin contrato escrito, la prueba es tu mejor defensa ante tribunales.</p>
            </div>

            <InArticleCTA 
              message="Cada caso es distinto — un abogado puede decirte exactamente qué hacer." 
              category="Derecho Inmobiliario"
            />
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Pueden subirte el arriendo si no hay contrato?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed font-bold">No de forma arbitraria.</p>
            <p className="text-gray-600 mb-4 leading-relaxed">Pero hay una diferencia importante:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {[
                "Sin contrato, no hay condiciones claras",
                "El arrendador puede presionar para subir el precio",
                "También puede terminar el arriendo si no aceptas"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed font-medium">Esto deja al arrendatario en una posición más débil.</p>

            <h2 className="text-2xl font-bold mb-4 text-gray-900 mt-8">¿Pueden desalojarte más rápido si no hay contrato?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed font-bold">No directamente.</p>
            <p className="text-gray-600 mb-4 leading-relaxed">El proceso sigue siendo judicial. Pero:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "Es más fácil para el arrendador terminar el acuerdo",
                "Hay menos protección contractual",
                "El conflicto se resuelve más rápido en la práctica"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Qué pasa si dejo de pagar el arriendo?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">Aunque no haya contrato:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {[
                "Sigues teniendo la obligación de pagar",
                "El arrendador puede demandar",
                "Puede iniciar proceso de desalojo"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Puedes revisar más sobre esto en nuestro artículo especial:
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">Pasos críticos si el dueño te pide la propiedad sin orden judicial:</p>
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link
                to="/blog/me-quieren-desalojar-que-hago-chile-2026"
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿Te quieren desalojar sin orden judicial?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Riesgos y Soluciones</h2>
            
            <h3 className="text-xl font-bold mb-4 text-gray-900">Riesgos de arrendar sin contrato</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">Estos son los principales problemas:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {[
                "Falta de claridad en reglas",
                "Dificultad para defenderte",
                "Riesgo de aumentos inesperados",
                "Conflictos difíciles de probar",
                "Mayor vulnerabilidad legal"
              ].map((risk, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100 h-full min-h-[3rem]">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{risk}</span>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-900">¿Conviene regularizar la situación?</h3>
            <p className="text-gray-600 mb-4 leading-relaxed font-bold">Sí, totalmente.</p>
            <p className="text-gray-600 mb-4 leading-relaxed">Tener contrato permite:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {[
                "Definir condiciones claras",
                "Evitar conflictos",
                "Proteger a ambas partes"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-900">¿Qué debe tener un contrato de arriendo?</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">Si decides formalizar, debería incluir:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {[
                "Monto del arriendo",
                "Fecha de pago",
                "Duración",
                "Reajustes (IPC u otro)",
                "Garantía",
                "Condiciones de término"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-900">¿Qué hacer si estás arrendando sin contrato?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">Si estás en esta situación, te conviene:</p>
            <div className="space-y-4 mb-8">
              {[
                { title: "Guardar todos los pagos", desc: "Transferencias, comprobantes, todo." },
                { title: "Mantener respaldo de conversaciones", desc: "WhatsApp o correo pueden servir como prueba." },
                { title: "Evitar conflictos innecesarios", desc: "Sin contrato, todo se vuelve más difícil." },
                { title: "Buscar asesoría legal", desc: "Especialmente si: Hay amenaza de desalojo, problemas de pago o conflictos con el dueño." }
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div className="bg-gray-900 p-2 rounded-lg text-white w-7 h-7 flex items-center justify-center flex-shrink-0 font-normal text-sm">
                    {i+1}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">{step.title}</span>
                    <p className="text-base text-gray-600 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-900">Casos comunes en Chile</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">Situaciones típicas:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "Arriendos entre conocidos",
                "Familiares",
                "Piezas o anexos",
                "Acuerdos informales"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed text-base">
              Arrendar sin contrato en Chile es legal, pero riesgoso. Aunque el acuerdo verbal tiene validez, la falta de un documento escrito genera incertidumbre y debilita la posición de ambas partes.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed text-base">
              Si estás en esta situación, lo más importante es protegerte con pruebas y actuar a tiempo.
            </p>
          </div>

          {/* FAQ */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes</h2>
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
        <section className="bg-white rounded-xl shadow-sm p-8 text-center mt-8 border">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Problemas con un arriendo sin contrato?</h2>
            <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
              Habla con un abogado y entiende cuáles son tus opciones legales. Conectamos a personas con abogados especialistas en arrendamiento para defender tu situación de forma inmediata y profesional.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/search?category=Derecho+Inmobiliario">
                <Button
                  size="lg"
                  onClick={() => {
                    window.gtag?.('event', 'click_consultar_abogado', {
                      article: window.location.pathname,
                      location: 'blog_cta_sin_contrato_arriendo_primary',
                    });
                  }}
                  className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto shadow-md"
                >
                  Hablar con abogado ahora
                </Button>
              </Link>
              
            </div>
          </section>
      </div>

      <RelatedLawyers category="Arrendamiento" />

      <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare 
            title="¿Qué pasa si no tengo contrato de arriendo en Chile? (Guía legal 2026)" 
            url="https://legalup.cl/blog/que-pasa-si-no-tengo-contrato-de-arriendo-chile-2026" 
          />
        </div>
        <BlogNavigation currentArticleId="que-pasa-si-no-tengo-contrato-de-arriendo-chile-2026" />

        <div className="mt-8 text-center">
          <Link 
            to="/blog" 
            className="inline-flex items-center gap-2 text-green-900 hover:text-green-600 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Blog
          </Link>
        </div>
      </div>
      
      <BlogConversionPopup category="Derecho Inmobiliario" topic="sin-contrato" />
    </div>
  );
};

export default BlogArticle;
