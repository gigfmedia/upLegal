import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, AlertCircle, Info, FileText, Shield } from "lucide-react";
import Header from "@/components/Header";
import { BlogGrowthHacks } from "@/components/blog/BlogGrowthHacks";
import { RelatedLawyers } from "@/components/blog/RelatedLawyers";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogNavigation } from "@/components/blog/BlogNavigation";
import InArticleCTA from "@/components/blog/InArticleCTA";
import { ReadingProgressBar } from "@/components/blog/ReadingProgressBar";
import BlogConversionPopup from "@/components/blog/BlogConversionPopup";

const BlogArticle = () => {
  const faqs = [
    {
      question: "¿Es válido un contrato de arriendo sin notario en Chile?",
      answer: "Sí. En Chile no es obligatorio firmar el contrato ante notario. Un contrato privado firmado por ambas partes tiene validez legal. Sin embargo, la firma ante notario otorga mayor respaldo probatorio en caso de conflicto judicial."
    },
    {
      question: "¿Pueden desalojarme si no tengo contrato de arriendo?",
      answer: "No. Independientemente de si existe contrato escrito o verbal, el desalojo siempre requiere una orden judicial. El arrendador no puede actuar por su cuenta para recuperar el inmueble."
    },
    {
      question: "¿Qué pasa si no pago el arriendo?",
      answer: "El arrendador puede iniciar una demanda judicial de término de contrato y cobro de rentas. Si la sentencia es favorable, puede obtener una orden de desalojo. Además, la deuda puede derivar en DICOM si cumple los requisitos legales."
    },
    {
      question: "¿El arrendador puede cambiar las condiciones del contrato?",
      answer: "No sin acuerdo de ambas partes. Durante la vigencia del contrato, el arrendador no puede modificar el monto del arriendo, las condiciones de uso ni las cláusulas pactadas de forma unilateral."
    },
    {
      question: "¿Qué cláusulas son ilegales en un contrato de arriendo?",
      answer: "Son ilegales las cláusulas que permitan al arrendador entrar sin autorización, renunciar a derechos legales del arrendatario, desalojar sin orden judicial o cortar servicios básicos como medida de presión."
    },
    {
      question: "¿Es obligatorio incluir el reajuste por IPC en el contrato?",
      answer: "No es obligatorio, pero sí muy recomendable. Si el contrato no incluye una cláusula de reajuste, el arrendador no puede subir el precio de forma unilateral durante la vigencia del contrato."
    },
    {
    question: "¿Cuánto tiempo mínimo debe durar un contrato de arriendo en Chile?",
    answer: "La ley chilena no establece un plazo mínimo obligatorio para los contratos de arriendo. Las partes pueden acordar libremente la duración. Lo más común son contratos de 12 meses renovables, aunque también existen contratos de 6 meses o por tiempo indefinido."
  }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Contrato de arriendo en Chile: modelo, cláusulas clave y errores que debes evitar (Guía 2026)"
        description="Todo lo que debes saber sobre el contrato de arriendo en Chile: qué debe incluir, errores comunes, modelo gratuito y cuándo necesitas abogado. Guía legal completa 2026."
        image="/assets/contrato-arriendo-chile-2026.png"
        url="https://legalup.cl/blog/contrato-de-arriendo-chile-2026"
        datePublished="2026-04-18"
        dateModified="2026-04-18"
        faqs={faqs}
      />
      <Header onAuthClick={() => {}} />
      <ReadingProgressBar />

      {/* Hero Section */}
      <div className="bg-green-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
          <div className="flex items-center gap-2 text-white mb-4">
            <Link to="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Artículo</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600 text-balance">
            Contrato de arriendo en Chile: modelo gratis, cláusulas clave y errores que debes evitar (Guía 2026)
          </h1>

          <p className="text-xl text-white max-w-3xl leading-relaxed">
            Firmar un contrato de arriendo es uno de los pasos más importantes al arrendar en Chile — y uno de los más subestimados. Un contrato mal hecho puede generar meses de conflictos legales.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-white mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>18 de Abril, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 13 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <BlogShare
            title="Contrato de arriendo en Chile: modelo, cláusulas clave y errores que debes evitar (Guía 2026)"
            url="https://legalup.cl/blog/contrato-de-arriendo-chile-2026"
            showBorder={false}
          />

          {/* Introducción */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              Muchos problemas legales en arriendo —desalojos, conflictos por garantía, subidas indebidas de precio— nacen por contratos mal hechos o incompletos. Sin embargo, la mayoría de las personas firma sin leer, sin entender qué están aceptando.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed mt-2">
              En esta guía 2026 te explicamos cómo funciona el contrato de arriendo en Chile, qué cláusulas debe incluir, qué errores evitar y te dejamos un modelo que puedes usar como base.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed mt-2">
              Si estás por arrendar o ya tienes un contrato, entender esto puede ahorrarte meses de problemas legales y pérdidas económicas.
            </p>
          </div>

          {/* ¿Qué es un contrato de arriendo? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es un contrato de arriendo en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Un contrato de arriendo es un acuerdo legal entre el <strong>arrendador</strong> (dueño) y el <strong>arrendatario</strong> (quien arrienda), donde se regula el uso de un inmueble a cambio de un pago mensual.
            </p>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8 my-8">
              <p className="text-gray-900 font-bold text-lg leading-relaxed mb-4">Base legal del arriendo</p>
              <p className="text-gray-700 leading-relaxed font-medium">
                En Chile, un contrato de arriendo debe incluir monto, duración, forma de pago, condiciones de uso y término del contrato. Este documento es la base de cualquier acción legal en caso de conflicto.
              </p>
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed font-medium">Regula aspectos como:</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "Monto del arriendo",
                "Duración del contrato",
                "Forma de pago",
                "Uso del inmueble",
                "Responsabilidades de cada parte",
                "Condiciones de término"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Link pilar */}
          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Guía Pilar</p>
            <Link
              to="/blog/derecho-arrendamiento-chile-guia-completa-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Guía 2026: Todo sobre el Arrendamiento en Chile
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* ¿Es obligatorio? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Es obligatorio tener un contrato de arriendo escrito?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed font-semibold text-lg">No, pero sí es altamente recomendable.</p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Un contrato verbal es válido en Chile, pero en la práctica genera problemas difíciles de resolver. Sin un documento escrito, es muy difícil probar qué acordaron las partes.
            </p>
            <div className="space-y-3 mb-6">
              {[
                "Dificultad para probar el monto del arriendo pactado",
                "Conflictos sobre duración y condiciones",
                "Problemas para exigir derechos ante el tribunal",
                "Dificultad para recuperar la garantía"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Link sin contrato */}
          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/que-pasa-si-no-tengo-contrato-de-arriendo-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 ¿Qué pasa si no tienes contrato de arriendo?
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Notario */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Debe firmarse ante notario un contrato de arriendo?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed font-semibold text-lg">No es obligatorio firmarlo ante notario en Chile.</p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Pero sí tiene ventajas concretas que pueden ahorrarte problemas en caso de conflicto:
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {[
                { title: "Mayor respaldo legal", desc: "El documento tiene fecha cierta y autenticidad verificable." },
                { title: "Facilita pruebas en juicio", desc: "Los tribunales dan más peso a documentos notariales." },
                { title: "Reduce conflictos", desc: "Ambas partes tienen certeza sobre lo firmado." }
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <CheckCircle className="h-5 w-5 text-green-600 mb-3" />
                  <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-base text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8 my-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Recomendación práctica</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <p className="text-gray-700 font-medium">Arriendos de bajo monto → El contrato privado es suficiente.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <p className="text-gray-700 font-medium">Arriendos de alto valor o comerciales → Siempre ante notario para mayor seguridad.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tipos de contrato */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Tipos de contrato de arriendo en Chile</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">No todos los contratos son iguales. Estos son los más comunes:</p>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { title: "Contrato de arriendo simple", items: ["Documento básico entre las partes", "El más usado en Chile", "Menor costo, válido legalmente"] },
                { title: "Contrato ante notario", items: ["Firmado y autorizado por notario", "Mayor seguridad jurídica", "Recomendado para montos altos"] },
                { title: "Contrato con aval", items: ["Incluye un tercero responsable", "Reduce el riesgo para el arrendador", "Más común en departamentos"] },
                { title: "Contrato comercial", items: ["Para oficinas o locales comerciales", "Tiene reglas distintas al residencial", "Mayor flexibilidad en cláusulas"] }
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <div className="bg-gray-900 w-7 h-7 rounded-full flex items-center justify-center text-white mb-4 text-sm">{i + 1}</div>
                  <h3 className="font-bold text-gray-900 mb-3">{item.title}</h3>
                  <div className="space-y-1">
                    {item.items.map((sub, j) => (
                      <div key={j} className="flex items-center gap-2 text-gray-600">
                        <ChevronRight className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-base">{sub}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <InArticleCTA
            message="¿Estás por firmar un contrato de arriendo y tienes dudas sobre alguna cláusula? Un abogado puede revisarlo antes de que lo hagas."
            buttonText="Revisar mi contrato con un abogado"
            category="Derecho Arrendamiento"
          />

          {/* Qué debe incluir */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Qué debe incluir un contrato de arriendo en Chile</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">Un contrato bien hecho evita conflictos. Estas son las cláusulas esenciales:</p>
            <div className="space-y-4">
              {[
                {
                  title: "Identificación de las partes",
                  desc: "Nombre completo, RUT y domicilio tanto del arrendador como del arrendatario.",
                  icon: <FileText className="h-5 w-5" />
                },
                {
                  title: "Identificación del inmueble",
                  desc: "Dirección exacta del inmueble, rol de avalúo si corresponde y detalles relevantes (piso, estacionamiento, bodega).",
                  icon: <Info className="h-5 w-5" />
                },
                {
                  title: "Monto y forma de pago del arriendo",
                  desc: "Valor mensual exacto, fecha límite de pago y medio de pago acordado (transferencia, efectivo, etc.).",
                  icon: <Shield className="h-5 w-5" />
                },
                {
                  title: "Reajuste por IPC",
                  desc: "Si no está en el contrato, el arrendador no puede subir el precio unilateralmente. Debe especificar la periodicidad (anual, semestral) y el índice a usar.",
                  icon: <FileText className="h-5 w-5" />
                },
                {
                  title: "Duración del contrato",
                  desc: "Fecha de inicio y fecha de término. Si no se especifica, puede generar tácita reconducción al vencerse.",
                  icon: <Calendar className="h-5 w-5" />
                },
                {
                  title: "Garantía",
                  desc: "Monto de la garantía, condiciones bajo las cuales se puede descontar y plazo de devolución al término.",
                  icon: <Shield className="h-5 w-5" />
                },
                {
                  title: "Uso del inmueble",
                  desc: "Si es habitacional o comercial. El uso no puede cambiar sin acuerdo de ambas partes.",
                  icon: <Info className="h-5 w-5" />
                },
                {
                  title: "Causales de término anticipado",
                  desc: "No pago del arriendo, daños al inmueble, incumplimiento de cláusulas u otras causales acordadas.",
                  icon: <AlertCircle className="h-5 w-5" />
                }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="bg-green-900 p-2 rounded-lg text-green-600 font-bold text-base w-9 h-9 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">{item.title}</span>
                    <p className="text-base text-gray-600 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cluster links relacionados con cláusulas */}
          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/reajuste-arriendo-ipc-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Reajuste por IPC: Cómo calcularlo en 2026
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/tacita-reconduccion-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Tácita reconducción: ¿Qué es y cómo afecta?
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Modelo */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Modelo de contrato de arriendo en Chile (ejemplo base)</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Este es un modelo simple que puedes usar como referencia. Recuerda que cada caso puede requerir adaptaciones según tus condiciones específicas.
            </p>
            <div className="bg-green-900 rounded-xl p-8 text-gray-100 font-mono text-sm leading-relaxed">
              <p className="font-bold text-green-400 mb-4 text-base">CONTRATO DE ARRIENDO</p>
              <p className="mb-2">En [ciudad], a [fecha]</p>
              <p className="mb-4 text-gray-300">————————————————————</p>
              <p className="mb-1"><span className="text-green-400">Arrendador:</span> [Nombre completo, RUT, domicilio]</p>
              <p className="mb-4"><span className="text-green-400">Arrendatario:</span> [Nombre completo, RUT, domicilio]</p>
              <p className="mb-4 text-gray-300">————————————————————</p>
              <div className="space-y-2 mb-4">
                <p><span className="text-green-400">1. Inmueble:</span> [Dirección exacta, comuna, ciudad]</p>
                <p><span className="text-green-400">2. Monto arriendo:</span> $[monto] mensuales</p>
                <p><span className="text-green-400">3. Fecha de pago:</span> Día [X] de cada mes</p>
                <p><span className="text-green-400">4. Duración:</span> Desde [fecha inicio] hasta [fecha término]</p>
                <p><span className="text-green-400">5. Garantía:</span> $[monto], equivalente a [N] meses</p>
                <p><span className="text-green-400">6. Reajuste:</span> Anual según IPC publicado por el INE</p>
                <p><span className="text-green-400">7. Uso:</span> Habitacional exclusivamente</p>
                <p><span className="text-green-400">8. Obligaciones:</span> Cuidado del inmueble, prohibición de subarrendar</p>
              </div>
              <p className="mb-4 text-gray-300">————————————————————</p>
              <p className="text-gray-300">Firma Arrendador: _______________</p>
              <p className="text-gray-300">Firma Arrendatario: _______________</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mt-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800 text-base">
                <strong>Este modelo es una base de referencia.</strong> Cada arriendo es distinto y el contrato debe adaptarse a las condiciones específicas de cada caso.
              </p>
            </div>
          </div>

          {/* ¿Se puede descargar? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Se puede descargar un contrato de arriendo en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Sí, existen modelos base disponibles en línea. Pero hay riesgos importantes que debes conocer antes de usarlos sin revisión:
            </p>
            <div className="space-y-3 mb-6">
              {[
                "No todos los contratos sirven para todos los casos",
                "Un contrato genérico puede dejar vacíos legales importantes",
                "Siempre debes adaptarlo a tu situación concreta",
                "Un mal contrato es una de las principales causas de conflictos en arriendos"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <InArticleCTA
            message="¿Encontraste un modelo de contrato y no estás seguro si te protege bien? Un abogado puede revisarlo y adaptarlo a tu caso."
            buttonText="Revisar mi contrato"
            category="Derecho Arrendamiento"
          />

          {/* Cláusulas abusivas */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Cláusulas abusivas o ilegales en contratos de arriendo</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Algunas cláusulas que aparecen en contratos no tienen validez legal. Si las firmaste, no te obligan. Estas son las más comunes:
            </p>
            <div className="space-y-3 mb-6">
              {[
                "Permitir al arrendador entrar al inmueble sin autorización del arrendatario",
                "Obligar al arrendatario a renunciar a derechos que la ley le reconoce",
                "Autorizar al arrendador a desalojar sin orden judicial",
                "Cortar servicios básicos (agua, luz, gas) como medida de presión por deuda"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cluster link desalojo */}
          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/me-quieren-desalojar-que-hago-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Me quieren desalojar: Guía paso a paso
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Errores comunes */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Errores comunes al firmar un contrato de arriendo</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">Estos errores generan la gran mayoría de los conflictos legales en arriendos en Chile:</p>
            <div className="space-y-4">
              {[
                {
                  title: "Firmar sin leer el contrato completo",
                  desc: "Es uno de los errores más graves. Cualquier cláusula firmada se considera aceptada, aunque no la hayas leído."
                },
                {
                  title: "No incluir cláusula de reajuste por IPC",
                  desc: "Si no queda explícito, el arrendador no puede subir el precio. Pero tampoco tú puedes exigir que lo ajuste a tu favor."
                },
                {
                  title: "No documentar el estado del inmueble",
                  desc: "Sin fotos ni acta de entrega, es imposible probar qué daños existían antes de que entraste a arrendar."
                },
                {
                  title: "Pagar sin comprobante",
                  desc: "Siempre guarda un respaldo de cada pago. Una transferencia con glosa o un recibo son fundamentales si hay disputa."
                },
                {
                  title: "No definir claramente el término del contrato",
                  desc: "Puede dificultar tanto la salida del arrendatario como el inicio de un proceso de desalojo por parte del arrendador."
                }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-gray-50/30 transition-colors">
                  <div className="bg-gray-900 text-white font-bold text-sm w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 mb-1">{item.title}</p>
                    <p className="text-base text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Caso real */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Caso real: el error que termina en pérdida de dinero</h2>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
              <h3 className="font-bold text-gray-900 mb-4">Situación típica en Chile</h3>
              <div className="space-y-2 mb-4">
                {[
                  "Arrendatario firma un contrato genérico descargado de internet",
                  "No revisa las cláusulas de garantía ni el estado de entrega",
                  "No documenta el estado del inmueble al momento de entrar"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0" />
                    <span className="text-base">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-gray-700 font-medium mb-3">Al terminar el contrato:</p>
              <div className="space-y-2">
                {[
                  "El arrendador descuenta parte de la garantía por supuestos daños",
                  "No hay fotos ni acta que prueben el estado original del inmueble",
                  "El arrendatario pierde parte de su garantía sin poder reclamarlo"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-base">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-8 mt-6">
              <p className="text-gray-700 leading-relaxed font-medium">
                Este tipo de situaciones es extremadamente común en Chile. La mayoría de los conflictos por garantía no ocurren por mala fe, sino por contratos mal redactados y falta de documentación rigurosa al inicio.
              </p>
            </div>
          </div>

          {/* Cluster garantía */}
          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/no-devuelven-garantia-arriendo-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Garantía de arriendo: Cómo recuperarla hoy
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Incumplimiento */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si no cumples el contrato?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El incumplimiento del contrato —ya sea por el arrendatario o el arrendador— tiene consecuencias legales reales. Dependiendo del caso, puede derivar en:
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {[
                { title: "Demanda judicial", desc: "El afectado puede iniciar un proceso ante tribunal civil." },
                { title: "Cobro de deuda", desc: "Las cuotas impagas pueden reclamarse con intereses." },
                { title: "Orden de desalojo", desc: "El incumplimiento grave puede terminar en lanzamiento." }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-red-50 p-4 rounded-lg border border-red-100">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900 block">{item.title}</span>
                    <span className="text-gray-600 text-base">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/orden-desalojo-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Orden de desalojo: Todo lo que debes saber
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/dicom-deuda-arriendo-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 DICOM por deudas de arriendo: Realidad 2026
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* ¿Cuándo necesitas abogado? */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo necesitas un abogado?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Muchas personas consultan a un abogado cuando el conflicto ya escaló. En estos casos, actuar a tiempo es clave:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "Hay un conflicto contractual activo o en riesgo",
                "Hay problemas con la devolución de la garantía",
                "Recibes amenazas de desalojo o ya hay demanda",
                "Encuentras cláusulas que no entiendes o te parecen abusivas",
                "El arrendador no cumple sus obligaciones",
                "Quieres terminar el contrato anticipadamente"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <Shield className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Checklist antes de firmar un contrato de arriendo</h2>
            <div className="bg-green-50 p-6 rounded-xl border border-green-100">
              <div className="grid sm:grid-cols-1 gap-4">
                {[
                  "Leer el contrato completo antes de firmar",
                  "Verificar que incluye cláusula de reajuste por IPC",
                  "Confirmar fechas de inicio y término",
                  "Documentar el estado del inmueble con fotos",
                  "Guardar copia firmada del contrato",
                  "Confirmar el monto y condiciones de la garantía",
                  "Verificar que no hay cláusulas abusivas",
                  "Preguntar si hay deudas de servicios anteriores"
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-3 text-green-900">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-green-900 text-base font-bold leading-tight">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Conclusión */}
          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El contrato de arriendo es el documento más importante en cualquier relación de arriendo en Chile. No es solo un trámite: es la base que define tus derechos, tus obligaciones y cómo se resolverán los conflictos.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              La mayoría de los problemas legales —desalojos, conflictos por garantía o deudas— no ocurren por mala fe, sino por contratos mal redactados o poco claros. Un contrato incompleto puede dejar espacios que luego se transforman en discusiones difíciles de resolver.
            </p>
            <p className="text-gray-600 font-bold leading-relaxed">
              Revisar cada cláusula, asegurarte de que el reajuste por IPC esté bien definido, documentar el estado del inmueble y guardar respaldos de pago son acciones simples que pueden evitarte meses de problemas. Si estás por firmar o ya tienes problemas con tu contrato, actuar a tiempo hace toda la diferencia.
            </p>
          </div>

          {/* FAQ */}
          <div className="mb-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-6">Preguntas frecuentes sobre el contrato de arriendo en Chile</h2>
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
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">¿Tienes dudas sobre tu contrato de arriendo?</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Recibe orientación clara de un abogado especialista y protege tu situación antes de que el problema escale. Consulta hoy mismo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consulta">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_contrato_arriendo_primary',
                  });
                }}
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto shadow-md"
              >
                Hablar con un Abogado Ahora
              </Button>
            </Link>
            <Link to="/search?category=Derecho+Civil">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_ver_abogados', {
                    article: window.location.pathname,
                    location: 'blog_cta_contrato_arriendo_secondary',
                  });
                }}
                className="border-green-900 text-green-900 hover:bg-green-900 hover:text-white px-8 py-3 w-full sm:w-auto"
              >
                Ver Abogados de Arriendo
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <RelatedLawyers category="Derecho Civil" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare
            title="Contrato de arriendo en Chile: modelo, cláusulas clave y errores que debes evitar (Guía 2026)"
            url="https://legalup.cl/blog/contrato-de-arriendo-chile-2026"
          />
        </div>

        <BlogNavigation
          prevArticle={{
            id: "derecho-arrendamiento-chile-guia-completa-2026",
            title: "Derecho de arrendamiento en Chile: guía completa 2026",
            excerpt: "Todo lo que necesitas saber sobre contratos, desalojos, garantías e IPC en esta guía completa 2026.",
            image: "/assets/derecho-arrendamiento-chile-2026.png"
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
      <BlogConversionPopup category="Derecho Inmobiliario" topic="contrato-arriendo" />
    </div>
  );
};

export default BlogArticle;
