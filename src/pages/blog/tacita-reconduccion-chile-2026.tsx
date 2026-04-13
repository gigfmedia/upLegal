import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Calendar, User, Clock, CheckCircle, AlertCircle, XCircle, ArrowLeft } from "lucide-react";
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
      question: "¿Qué es la tácita reconducción en un contrato de arriendo?",
      answer: "La tácita reconducción ocurre cuando un contrato de arriendo vence y ambas partes continúan la relación como si siguiera vigente — el arrendatario sigue pagando y el arrendador sigue recibiendo — sin firmar un contrato nuevo. En Chile, esto prorroga el contrato original bajo las mismas condiciones, pero por un período indefinido."
    },
    {
      question: "¿La tácita reconducción es automática en Chile?",
      answer: "Sí. Si el contrato vence y ninguna de las partes manifiesta su intención de terminarlo, y el arrendatario continúa ocupando el inmueble con el consentimiento del arrendador, se entiende que el contrato se ha renovado tácitamente bajo las mismas condiciones originales."
    },
    {
      question: "¿Se puede subir el arriendo en tácita reconducción?",
      answer: "Solo si el contrato original tenía cláusula de reajuste. Si el contrato no contemplaba aumentos, el arrendador no puede subir el precio unilateralmente durante la tácita reconducción. Cualquier cambio en el monto requiere acuerdo de ambas partes o un contrato nuevo."
    },
    {
      question: "¿Puede el arrendador desalojarme si estoy en tácita reconducción?",
      answer: "Sí, pero debe seguir el procedimiento legal correspondiente. La tácita reconducción no elimina los derechos del arrendatario. Para terminar el contrato, el arrendador debe notificar con anticipación o iniciar un juicio de desalojo si el arrendatario no quiere irse, igual que con cualquier contrato vigente."
    },
    {
      question: "¿Conviene mantenerse en tácita reconducción o es mejor formalizar?",
      answer: "Depende de cada situación, pero en general es más seguro formalizar. Sin contrato escrito actualizado, cualquier conflicto sobre condiciones, precio o plazos es más difícil de resolver. Un contrato nuevo protege tanto al arrendatario como al arrendador y evita ambigüedades."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Tácita reconducción en Chile: qué es y qué pasa si sigues arrendando sin contrato (Guía 2026)"
        description="Si tu contrato de arriendo terminó pero sigues pagando y viviendo ahí, entraste en tácita reconducción. Descubre tus derechos y qué implica."
        image="/assets/sin-contrato-arriendo-2026.png"
        url="https://legalup.cl/blog/tacita-reconduccion-chile-2026"
        datePublished="2026-04-13"
        dateModified="2026-04-13"
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
          
          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600 text-balance">
            Tácita reconducción en Chile: qué es y qué pasa si sigues arrendando sin contrato (Guía 2026)
          </h1>
          
          <p className="text-xl max-w-3xl leading-relaxed">
            Muchas personas siguen viviendo en una propiedad después de que el contrato de arriendo termina. Pagan el arriendo normalmente y todo parece seguir igual. ¿Sigo con contrato? ¿Me pueden echar? ¿Se renovó automáticamente? Aquí es donde aparece un concepto clave: la tácita reconducción.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>13 de Abril, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 10 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <BlogShare 
            title="Tácita reconducción en Chile: qué es y qué pasa si sigues arrendando sin contrato (Guía 2026)" 
            url="https://legalup.cl/blog/tacita-reconduccion-chile-2026" 
            showBorder={false}
          />
          
          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              Muchas personas siguen viviendo en una propiedad después de que el contrato de arriendo termina. Pagan el arriendo normalmente y todo parece seguir igual.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Pero surge la duda:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 font-medium mb-6">
              <li>¿Sigo con contrato?</li>
              <li>¿Me pueden echar en cualquier momento?</li>
              <li>¿Se renovó automáticamente?</li>
            </ul>
            <p className="text-lg text-gray-600 leading-relaxed font-bold">
              Aquí es donde aparece un concepto clave:
            </p>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-6 mt-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-3">
                La tácita reconducción
              </h3>
              <p className="text-blue-800 text-base">En esta guía 2026 te explicamos qué significa, cómo funciona en Chile y cuáles son tus derechos como arrendatario o arrendador.</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es la tácita reconducción?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La tácita reconducción ocurre cuando un contrato de arriendo termina, pero ambas partes continúan la relación como si nada hubiera cambiado.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed font-bold">Es decir:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "El arrendatario sigue ocupando la propiedad",
                "El arrendador sigue recibiendo el pago"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <div className="mb-6">
              <p className="flex items-center gap-2">
                Sin firmar un nuevo contrato
              </p>
            </div>
            
            <h2 className="text-2xl font-bold mb-4 mt-8 text-gray-900">¿Está regulada en Chile?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed font-bold">
              Sí, es un concepto reconocido en el derecho civil chileno.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Se basa en el comportamiento de las partes, no en un nuevo documento.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa cuando hay tácita reconducción?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Se genera una nueva relación de arriendo, pero con características distintas.
            </p>
            
            <h3 className="text-xl font-bold mb-4 text-gray-900">Cambios importantes</h3>
            <div className="grid sm:grid-cols-1 gap-4 mb-8">
              {[
                "No hay plazo fijo definido",
                "El contrato pasa a ser indefinido",
                "Se mantienen condiciones anteriores (en muchos casos)"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Se mantiene el mismo contrato?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed font-bold">
              En parte sí, pero no completamente.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Se mantienen
                </h3>
                <ul className="space-y-3">
                  {[
                    "Monto del arriendo",
                    "Uso del inmueble",
                    "Obligaciones básicas"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                      <span className="text-green-800">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Cambia
                </h3>
                <ul className="space-y-3">
                  {[
                    "Duración del contrato"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
                      <span className="text-orange-800">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-orange-200">
                  <p className="font-bold text-orange-900 flex items-center gap-2">
                    Deja de ser a plazo fijo
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6 mt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Ejemplo práctico</h3>
              <p className="text-gray-700 font-medium mb-2">Contrato por 12 meses.</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
                <li>Termina en enero</li>
                <li>El arrendatario sigue viviendo</li>
                <li>El arrendador sigue recibiendo el pago</li>
              </ul>
              <div className="pt-3 border-t border-gray-300">
                <p className="font-bold text-gray-900 flex items-center gap-2">
                  Resultado: Se configura la tácita reconducción.
                </p>
              </div>
            </div>
            
            <InArticleCTA 
              message="¿Estás en esta situación y necesitas ayuda con tu arriendo?" 
              category="Derecho Inmobiliario"
            />
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Me pueden desalojar si estoy en tácita reconducción?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed font-bold">
              Sí, pero no de forma inmediata ni arbitraria.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El arrendador debe:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "Dar aviso previo",
                "Respetar condiciones mínimas"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="mb-6">
              <p className="flex items-center gap-2">
                No puede simplemente sacarte sin proceso.
              </p>
            </div>

            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link 
                to="/blog/orden-desalojo-chile-2026" 
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 Orden de desalojo en Chile: qué es, cuándo ocurre y cómo funciona
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-900">¿Cuánto aviso deben dar?</h3>
            <p className="text-gray-600 mb-4 leading-relaxed">Depende del caso.</p>
            <p className="text-gray-600 mb-6 leading-relaxed">Pero generalmente: Debe ser un plazo razonable</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Se puede subir el arriendo en tácita reconducción?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed font-bold">Sí, pero no arbitrariamente.</p>
            
            <h3 className="text-xl font-bold mb-4 text-gray-900 mt-6">Reglas</h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "Debe respetar lo pactado originalmente",
                "Puede aplicarse reajuste (por IPC, por ejemplo)"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>

            <p className="text-gray-600 mb-4 leading-relaxed font-medium">Esto conecta con:</p>
            
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link 
                to="/blog/reajuste-arriendo-ipc-chile-2026" 
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 Reajuste de arriendo por IPC en Chile: Todo lo que necesitas saber 2026
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <h2 className="text-2xl font-bold mb-4 mt-8 text-gray-900">¿Se puede terminar el contrato en cualquier momento?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Sí, porque ya no hay plazo fijo.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed font-bold">Pero: Debe hacerse correctamente</p>
            
            <h3 className="text-xl font-bold mb-4 text-gray-900">Requiere</h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "Aviso previo",
                "Respeto de condiciones"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>

            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link 
                to="/blog/me-quieren-desalojar-que-hago-chile-2026" 
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿Me pueden desalojar sin orden judicial en Chile? Guía 2026
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Diferencia clave: contrato vigente vs tácita reconducción</h2>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg font-bold mb-3 text-gray-900">Contrato vigente</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Plazo definido</li>
                  <li>Condiciones claras</li>
                </ul>
              </div>
              <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
                <h3 className="text-lg font-bold mb-3 text-gray-900">Tácita reconducción</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Sin plazo fijo</li>
                  <li>Mayor flexibilidad</li>
                  <li>Más incertidumbre</li>
                </ul>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8 mt-8">
              <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                <h3 className="text-lg font-bold text-red-900 mb-4">Riesgos para el arrendatario</h3>
                <ul className="space-y-3 text-red-800">
                  <li className="flex items-start gap-2"><XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" /> Falta de estabilidad</li>
                  <li className="flex items-start gap-2"><XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" /> Posible término con aviso</li>
                  <li className="flex items-start gap-2"><XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" /> Dificultad para exigir condiciones</li>
                </ul>
              </div>
              <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                <h3 className="text-lg font-bold text-orange-900 mb-4">Riesgos para el arrendador</h3>
                <ul className="space-y-3 text-orange-800">
                  <li className="flex items-start gap-2"><XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" /> Menor control contractual</li>
                  <li className="flex items-start gap-2"><XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" /> Dificultad para modificar condiciones</li>
                  <li className="flex items-start gap-2"><XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" /> Necesidad de iniciar proceso para desalojo</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">¿Conviene firmar un nuevo contrato?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">En la mayoría de los casos:</p>
            
            <div className="mb-6">
              <p className="font-bold flex items-center gap-2">
                Sí
              </p>
            </div>
            
            <h3 className="text-xl font-bold mb-4 text-gray-900">Ventajas</h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "Claridad",
                "Seguridad jurídica",
                "Condiciones definidas"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>

            <h2 className="text-2xl font-bold mb-4 mt-8 text-gray-900">¿Qué pasa si no hay contrato escrito?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">Se puede probar la relación con:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "Pagos",
                "Mensajes",
                "Testigos"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <div className="mb-6">
              <p className="flex items-center gap-2">
                Pero es más complejo
              </p>
            </div>

            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link 
                to="/blog/no-devuelven-garantia-arriendo-chile-2026" 
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿No te devuelven la garantía de arriendo? Qué hacer legalmente en Chile
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Relación con otros problemas de arriendo</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">La tácita reconducción suele aparecer junto con:</p>
            
            <div className="grid sm:grid-cols-3 gap-3 mb-8">
              {[
                "No pago de arriendo",
                "Conflictos de desalojo",
                "Problemas con garantía"
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-center text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="font-bold text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>

            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link 
                to="/blog/cuanto-demora-juicio-desalojo-chile-2026" 
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 ¿Cuánto demora un juicio de desalojo en Chile? Plazos legales 2026
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué hacer si estás en tácita reconducción?</h2>
            
            <div className="space-y-4 mb-8">
              {[
                { title: "Confirmar la situación", desc: "¿terminó el contrato? ¿sigues pagando?" },
                { title: "Evaluar riesgos", desc: "estabilidad, condiciones" },
                { title: "Formalizar", desc: "firmar nuevo contrato" },
                { title: "Asesorarte", desc: "especialmente si hay conflicto" }
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div className="bg-gray-900 p-2 rounded-lg text-white w-7 h-7 flex items-center justify-center flex-shrink-0 font-normal text-sm">
                    {i+1}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">{step.title}</span>
                    <p className="text-base text-gray-600 mt-1 capitalize">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold mb-4 text-gray-900">Casos comunes en Chile</h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "Arrendatario sigue sin contrato",
                "Arrendador quiere terminar relación",
                "Conflictos por subida de arriendo",
                "Dudas sobre derechos"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 h-full min-h-[3rem]">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            
            <InArticleCTA 
              message="¿Necesitas regularizar tu situación de arriendo con asesoría legal?" 
              category="Derecho Inmobiliario"
            />
          </div>

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed text-base">
              La tácita reconducción es una situación muy común en Chile, especialmente cuando el contrato de arriendo termina y ninguna de las partes toma acciones formales. Aunque en la práctica permite que el arriendo continúe sin interrupciones, también genera un escenario de mayor incertidumbre jurídica.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed text-base">
              Para el arrendatario, implica menor estabilidad, ya que el contrato deja de tener un plazo definido y puede terminarse con aviso. Para el arrendador, significa menos control sobre las condiciones originales y la necesidad de recurrir a procedimientos legales si quiere recuperar la propiedad.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed text-base">
              Si bien la tácita reconducción es válida y reconocida por la ley, no es la situación más recomendable a largo plazo. Mantener un arriendo sin contrato actualizado puede generar conflictos innecesarios, dificultades para exigir derechos y problemas en caso de incumplimientos.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed text-base font-bold">
              Por eso, lo más recomendable en la mayoría de los casos es formalizar un nuevo contrato de arriendo, donde se establezcan claramente las condiciones, plazos y obligaciones de ambas partes.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed text-base">
              Si ya estás en una situación de tácita reconducción y tienes dudas sobre tus derechos o riesgos, es importante informarte a tiempo y, si es necesario, buscar asesoría legal para evitar problemas futuros.
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
      </div>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">
            ¿Estás arrendando sin contrato y no sabes cuáles son tus derechos?
          </h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Habla con un abogado y aclara tu situación antes de que surjan problemas. En LegalUp conectamos a personas con abogados especialistas para guiarte en tu caso.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consulta">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_tacita_primary',
                  });
                }}
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto shadow-md"
              >
                Consultar con Abogado Ahora
              </Button>
            </Link>
            <Link to="/search?category=Arrendamiento">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_ver_abogados', {
                    article: window.location.pathname,
                    location: 'blog_cta_tacita_secondary',
                  });
                }}
                className="border-gray-600 text-gray-600 hover:bg-green-900 hover:text-white px-8 py-3 w-full sm:w-auto"
              >
                Ver Abogados Disponibles
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <RelatedLawyers category="Arrendamiento" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare 
            title="Tácita reconducción en Chile: qué es y qué pasa si sigues arrendando sin contrato (Guía 2026)" 
            url="https://legalup.cl/blog/tacita-reconduccion-chile-2026" 
          />
        </div>
        <BlogNavigation 
          prevArticle={{
            id: "dicom-deuda-arriendo-chile-2026",
            title: "¿Me pueden meter a DICOM por deuda de arriendo en Chile? (Guía legal completa 2026)",
            excerpt: "Descubre cuándo una deuda de arriendo puede afectar tu DICOM en Chile.",
            image: "/assets/dicom-arriendo-chile-2026.png"
          }}
        />

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
      
      <BlogConversionPopup category="Derecho Inmobiliario" topic="tacita-reconduccion" />
    </div>
  );
};

export default BlogArticle;
