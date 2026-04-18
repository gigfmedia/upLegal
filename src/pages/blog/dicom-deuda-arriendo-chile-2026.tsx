import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, ChevronRight, CheckCircle, Info, Shield, Search, MessageSquare, AlertCircle, FileText, CreditCard } from "lucide-react";
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
      question: "¿Puedo ir a DICOM por deuda de arriendo?",
      answer: "Sí, pero solo en ciertos casos. No es automático y debe cumplir requisitos legales específicos como tener contrato firmado, pagaré o sentencia judicial."
    },
    {
      question: "¿Es automático que una deuda de arriendo vaya a DICOM?",
      answer: "No. A diferencia de créditos bancarios o tarjetas de crédito, el arriendo es una relación civil que requiere validación antes de poder ser informada a DICOM."
    },
    {
      question: "¿Necesitan demandarme para meter me a DICOM?",
      answer: "Muchas veces sí. En la mayoría de los casos se requiere una sentencia judicial o documento de cobro válido para que la deuda pueda ser informada legalmente."
    },
    {
      question: "¿Puedo salir de DICOM si estoy por deuda de arriendo?",
      answer: "Sí, dependiendo del caso. Puedes solicitar eliminación si la deuda no cumple requisitos, negociar el pago o tomar acciones legales si el registro es indebido."
    },
    {
      question: "¿Me afecta estar en DICOM para arrendar?",
      answer: "Sí, puede dificultar la postulación a nuevos arriendos ya que muchos arrendadores consultan DICOM antes de aceptar candidatos."
    },
    {
      question: "¿Me pueden meter a DICOM sin avisar?",
      answer: "En muchos casos debería existir notificación previa, pero no siempre ocurre correctamente. Es importante revisar tu informe comercial regularmente."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="¿Me pueden meter a DICOM por deuda de arriendo en Chile? Guía legal 2026"
        description="Descubre cuándo una deuda de arriendo puede afectar tu DICOM en Chile. Requisitos legales, cómo salir y qué hacer si te amenazan. Consulta abogados en LegalUp."
        image="/assets/dicom-arriendo-chile-2026.png"
        url="https://legalup.cl/blog/dicom-deuda-arriendo-chile-2026"
        datePublished="2026-04-10"
        dateModified="2026-04-10"
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
            ¿Me pueden meter a DICOM por deuda de arriendo en Chile? (Guía legal completa 2026)
          </h1>
          
          <p className="text-xl max-w-3xl leading-relaxed">
            Tener problemas con el pago del arriendo genera muchas dudas, pero hay una que aparece siempre: ¿Me pueden meter a DICOM por deuda de arriendo? Muchos arrendadores usan esta amenaza como presión, pero no siempre es legal ni posible.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>10 de Abril, 2026</span>
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
            title="¿Me pueden meter a DICOM por deuda de arriendo en Chile? (Guía 2026)" 
            url="https://legalup.cl/blog/dicom-deuda-arriendo-chile-2026" 
            showBorder={false}
          />
          
          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              Tener problemas con el pago del arriendo genera muchas dudas, pero hay una que aparece siempre:
            </p>
            <p className="text-lg text-gray-600 leading-relaxed font-bold">
              ¿Me pueden meter a DICOM por deuda de arriendo?
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Muchos arrendadores usan esta amenaza como presión, pero no siempre es legal ni posible.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              En esta guía completa 2026 te explicamos cuándo una deuda de arriendo puede ir a DICOM, cuándo NO es posible, qué dice la ley en Chile, qué hacer si te amenazan, cómo saber si estás en DICOM y cómo salir si ya apareces.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es DICOM y cómo funciona en Chile?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              DICOM es un sistema de información comercial que registra deudas impagas y comportamiento financiero.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Aparecer en DICOM puede afectar:
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                { title: "Acceso a créditos", desc: "Dificultad para obtener préstamos bancarios o refinanciamiento." },
                { title: "Postulación a arriendos", desc: "Los arrendadores suelen consultar DICOM antes de aceptar candidatos." },
                { title: "Contratos financieros", desc: "Complicaciones para abrir cuentas corrientes o tarjetas de crédito." }
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm mb-1">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-2 leading-tight">{item.title}</p>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <p className="text-gray-700 leading-relaxed font-medium">
                Pero no cualquier deuda puede ser publicada. Es fundamental entender los requisitos legales antes de alarmarse.
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Una deuda de arriendo va automáticamente a DICOM?</h2>
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg mb-8">
              <h3 className="text-lg font-bold text-red-800 mb-2">No</h3>
              <p className="text-red-800">
                Una deuda de arriendo NO se informa automáticamente a DICOM. A diferencia de créditos bancarios, tarjetas de crédito o casas comerciales, el arriendo es una relación civil, no financiera directa.
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuándo una deuda de arriendo SÍ puede llegar a DICOM?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Para que una deuda sea informada, debe cumplir ciertos requisitos legales. En LegalUp recomendamos revisar estos 4 puntos clave antes de preocuparse:
            </p>
            
            <div className="space-y-4">
              {[
                { 
                  title: "Debe existir una deuda clara y exigible", 
                  desc: "No basta con que el arrendador diga que le debes. El monto debe estar definido, no estar siendo discutido judicialmente y estar fuera de plazo (vencido).",
                  sublabel: "Requisito: Monto definido · Sin discusión judicial · Plazo vencido" 
                },
                { 
                  title: "Debe estar respaldada por un documento válido", 
                  desc: "Para informar a DICOM, el arrendador necesita un respaldo legal sólido como un contrato firmado ante notario, un pagaré o un documento de cobro válido.",
                  sublabel: "Documentos: Contrato ante notario · Pagaré · Sentencia judicial"
                },
                { 
                  title: "Suele requerir validación judicial", 
                  desc: "En la mayoría de los casos de arriendo de vivienda, se necesita una demanda o una sentencia de un tribunal para que la deuda pueda ser informada legalmente.",
                  sublabel: "Proceso: Demanda civil · Sentencia ejecutoriada"
                },
                { 
                  title: "Cumplimiento de la Ley de Protección de Datos", 
                  desc: "No se puede publicar información de deudas si no se cumple estrictamente con la normativa de protección de datos personales en Chile.",
                  sublabel: "Marco legal: Ley 19.628 sobre protección de la vida privada"
                }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 mb-1">{item.title}</p>
                    <p className="text-base text-gray-600">{item.desc}</p>
                    <p className="text-xs text-gray-400 mt-2 italic">{item.sublabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Ejemplos reales (muy importante)</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              La diferencia entre estar o no en DICOM suele depender de cómo se formalizó el arriendo. Aquí tienes tres escenarios comunes analizados bajo el estándar de LegalUp:
            </p>
            
            <div className="space-y-6">
              {/* Escenario 1 */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-green-50 px-6 py-3 border-b border-green-100">
                  <span className="text-green-900 font-bold text-sm uppercase tracking-wider">Escenario 1: Arriendo Informal</span>
                </div>
                <div className="p-6">
                  <p className="text-gray-900 font-bold mb-2 text-lg">Sin contrato escrito (trato de palabra)</p>
                  <p className="text-gray-600 mb-6">Si no existe ningún documento firmado y solo hay un acuerdo verbal entre las partes.</p>
                  <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-gray-900 font-bold">Situación: Riesgo de DICOM nulo</p>
                      <p className="text-gray-600 text-sm">El arrendador no tiene base documental para informarte a un registro comercial.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Escenario 2 */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <span className="text-gray-900 font-bold text-sm uppercase tracking-wider">Escenario 2: Contrato Simple</span>
                </div>
                <div className="p-6">
                  <p className="text-gray-900 font-bold mb-2 text-lg">Contrato firmado por las partes</p>
                  <p className="text-gray-600 mb-6">Existe un contrato, pero no hay pagarés ni sentencias judiciales todavía.</p>
                  <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-3">
                    <Info className="h-6 w-6 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-gray-900 font-bold">Situación: Evaluación Legal Necesaria</p>
                      <p className="text-gray-600 text-sm">No vas a DICOM directo, pero el arrendador puede iniciar cobros que sí afecten tu informe.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Escenario 3 */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-green-900 px-6 py-3 border-b border-gray-800">
                  <span className="text-green-600 font-bold text-sm uppercase tracking-wider">Escenario 3: Deuda Validada</span>
                </div>
                <div className="p-6">
                  <p className="text-gray-900 font-bold mb-2 text-lg">Juicio en curso o Pagaré firmado</p>
                  <p className="text-gray-600 mb-6">La deuda ya fue reconocida judicialmente o existe un documento de cobro ejecutivo.</p>
                  <div className="bg-green-900/5 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-green-900 flex-shrink-0" />
                    <div>
                      <p className="text-green-900 font-bold">Situación: Riesgo de DICOM Inminente</p>
                      <p className="text-green-800 text-sm">En este caso, la deuda puede ser informada legalmente de forma rápida.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿El arrendador puede amenazar con DICOM?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Sí, y es muy común. Pero en muchos casos es solo presión. Si no existen los requisitos legales, no puede hacerlo.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si dejo de pagar el arriendo?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Aunque no vayas inmediatamente a DICOM, sí hay consecuencias reales:
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                { title: "Demanda judicial", desc: "El arrendador puede iniciar acciones legales" },
                { title: "Orden de desalojo", desc: "Proceso judicial para recuperar la propiedad" },
                { title: "Cobro de deuda", desc: "Reclamación del monto adeudado más intereses" }
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
            <p className="text-gray-600 mb-4 leading-relaxed">Entiende los plazos y protecciones legales ante un desalojo:</p>
            <div className="text-center py-4 border-t border-b border-gray-100 my-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
              <Link 
                to="/blog/me-quieren-desalojar-que-hago-chile-2026" 
                className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
              >
                👉 Me quieren desalojar, ¿qué hago? Guía paso a paso 2026
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Diferencia clave: deuda civil vs financiera</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg font-bold mb-3 text-gray-900">Deuda de arriendo</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Relación entre particulares</li>
                  <li>Requiere validación</li>
                  <li>No va automáticamente a DICOM</li>
                </ul>
              </div>
              <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                <h3 className="text-lg font-bold mb-3 text-gray-900">Deuda financiera</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Bancos</li>
                  <li>Retail</li>
                  <li>👉 Estas sí se informan directamente</li>
                </ul>
              </div>
            </div>
          </div>

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

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué hacer si te amenazan con DICOM?</h2>
            <div className="space-y-4">
              {[
                { title: "Revisar si la deuda cumple requisitos", desc: "¿Existe contrato? ¿Está documentada? ¿Es exigible?", icon: <FileText className="h-5 w-5" /> },
                { title: "No actuar por miedo", desc: "Muchas amenazas no tienen base legal.", icon: <Shield className="h-5 w-5" /> },
                { title: "Solicitar respaldo", desc: "Pide: Detalle de la deuda, base legal", icon: <MessageSquare className="h-5 w-5" /> },
                { title: "Evaluar tu situación", desc: "Puede haber errores o abusos.", icon: <Search className="h-5 w-5" /> },
                { title: "Consultar con un abogado", desc: "Especialmente si hay presión o dudas.", icon: <Info className="h-5 w-5" /> }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
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

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-sm text-gray-500 mb-3 leading-relaxed">Las deudas de arriendo son solo uno de los conflictos posibles. Puedes ver todos los escenarios en esta</p>
            <Link
              to="/blog/derecho-arrendamiento-chile-guia-completa-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Guía completa de arriendo en Chile
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo saber si estás en DICOM?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Puedes verificar tu situación fácilmente.
            </p>
            <h3 className="text-xl font-bold mb-4 text-gray-900">Paso a paso</h3>
            <div className="space-y-4">
              {[
                { title: "Solicitar informe comercial", desc: "Ingresa a la web de DICOM o Equifax y solicita tu informe" },
                { title: "Revisar deudas registradas", desc: "Verifica qué deudas aparecen y su monto" },
                { title: "Confirmar origen de la deuda", desc: "Esto es clave antes de tomar decisiones" }
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div className="bg-gray-900 p-2 rounded-lg text-white font-bold text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">{i+1}</div>
                  <div>
                    <span className="font-bold text-gray-900">{step.title}</span>
                    <p className="text-base text-gray-600 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué hacer si ya estás en DICOM por arriendo?</h2>
            <div className="space-y-4">
              {[
                { title: "Verificar si el registro es correcto", desc: "Puede haber errores en la información reportada" },
                { title: "Revisar legalidad del reporte", desc: "No todos los registros son válidos legalmente" },
                { title: "Solicitar eliminación", desc: "Si la deuda no cumple requisitos, puedes pedir que la retiren" },
                { title: "Negociar o pagar", desc: "En algunos casos, llegar a un acuerdo puede ser la solución" },
                { title: "Acciones legales", desc: "Si el registro es indebido, puedes tomar acciones legales" }
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl hover:bg-blue-50/30 transition-colors">
                  <div className="bg-gray-900 p-2 rounded-lg text-white font-bold text-sm w-7 h-7 flex items-center justify-center flex-shrink-0">{i+1}</div>
                  <div>
                    <span className="font-bold text-gray-900">{step.title}</span>
                    <p className="text-base text-gray-600 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/no-devuelven-garantia-arriendo-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 ¿No te devuelven la garantía de arriendo? Qué hacer legalmente en Chile 2026
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cuánto tiempo dura una deuda en DICOM?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Depende del caso. Pero en general puede mantenerse varios años hasta que se pague o elimine.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Me pueden meter a DICOM sin avisar?</h2>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <p className="text-gray-700 leading-relaxed font-medium">
                En muchos casos debería existir notificación, pero no siempre ocurre correctamente.
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Errores comunes</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "Creer que cualquier deuda va a DICOM",
                "Asustarse por amenazas sin respaldo",
                "No revisar contrato",
                "No pedir información formal",
                "No asesorarse"
              ].map((error, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium text-base">{error}</span>
                </div>
              ))}
            </div>
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

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Casos frecuentes en Chile</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "Amenazas sin base legal",
                "Deudas informales",
                "Registros incorrectos",
                "Conflictos de arriendo"
              ].map((caso, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium text-base">{caso}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/tacita-reconduccion-chile-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Tácita reconducción en Chile: qué es y qué pasa si sigues arrendando sin contrato
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* FAQs */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-bold mb-2 text-gray-900">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Conclusion */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-4">
              Una deuda de arriendo no va automáticamente a DICOM, pero en ciertos casos sí puede ser informada si cumple requisitos legales. Lo importante es entender tu situación real y no actuar solo por miedo. Con la información correcta, puedes evitar problemas mayores o resolverlos a tiempo.
            </p>
          </div>



        </div>
      </div>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border">
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">
            ¿Tienes una deuda de arriendo y no sabes si puede afectarte en DICOM?
          </h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Habla con un abogado especializado y revisa tu situación antes de que escale. En LegalUp conectamos a personas con abogados que analizan tu caso de forma inmediata.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consulta">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_dicom_primary',
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
                    location: 'blog_cta_dicom_secondary',
                  });
                }}
                className="border-gray-600 text-gray-600 hover:bg-green-900 hover:text-white px-8 py-3 w-full sm:w-auto"
              >
                Ver Abogados de Arriendo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <RelatedLawyers category="Derecho Civil" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8">
          <BlogShare 
            title="¿Me pueden meter a DICOM por deuda de arriendo en Chile? (Guía 2026)" 
            url="https://legalup.cl/blog/dicom-deuda-arriendo-chile-2026" 
          />
        </div>

        <BlogNavigation 
          prevArticle={{
            id: "no-devuelven-garantia-arriendo-chile-2026",
            title: "No me devuelven la garantía de arriendo en Chile",
            excerpt: "Uno de los problemas más comunes al terminar un contrato de arriendo es que el arrendador no devuelve la garantía. Descubre cómo recuperar tu dinero paso a paso.",
            image: "/assets/no-devuelven-garantia-arriendo-chile-2026.png"
          }}
          nextArticle={{
            id: "tacita-reconduccion-chile-2026",
            title: "Tácita reconducción en Chile: qué es y qué pasa si sigues arrendando sin contrato (Guía 2026)",
            excerpt: "Si tu contrato de arriendo terminó pero sigues pagando y viviendo ahí, entraste en tácita reconducción. Descubre tus derechos y qué implica.",
            image: "/assets/tacita-reconduccion-chile-2026.png"
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
      <BlogConversionPopup category="Derecho Inmobiliario" topic="dicom-arriendo" />
    </div>
  );
};

export default BlogArticle;
