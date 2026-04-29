import { useMemo, useState } from "react";
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
  const [rentValue, setRentValue] = useState<string>("500000");
  const [ipcPercent, setIpcPercent] = useState<string>("5");

  const parsed = useMemo(() => {
    const rent = Number(String(rentValue).replace(/[^0-9]/g, ""));
    const ipc = Number(String(ipcPercent).replace(/[^0-9.,-]/g, "").replace(",", "."));
    const ipcDecimal = Number.isFinite(ipc) ? ipc / 100 : NaN;
    const newRent = Number.isFinite(rent) && Number.isFinite(ipcDecimal) ? Math.round(rent * (1 + ipcDecimal)) : NaN;
    const diff = Number.isFinite(rent) && Number.isFinite(newRent) ? newRent - rent : NaN;
    const pct = Number.isFinite(rent) && rent > 0 && Number.isFinite(diff) ? (diff / rent) * 100 : NaN;
    return { rent, ipc, ipcDecimal, newRent, diff, pct };
  }, [rentValue, ipcPercent]);

  const formatClp = (n: number) => {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("es-CL");
  };

  const faqs = [
    {
      question: "¿Cuánto pueden subir el arriendo según el IPC en Chile 2026?",
      answer: "El aumento depende del IPC acumulado del período definido en el contrato. Si el IPC fue de 5%, un arriendo de $500.000 sube a $525.000. No existe un tope legal fijo, pero el aumento debe respetar exactamente lo que establece la cláusula de reajuste del contrato."
    },
    {
      question: "¿Es obligatorio aplicar el reajuste por IPC en el arriendo?",
      answer: "No. El reajuste por IPC solo aplica si el contrato de arriendo lo establece expresamente. Si el contrato no tiene cláusula de reajuste, el arrendador no puede subir el arriendo de forma unilateral durante la vigencia del contrato."
    },
    {
      question: "¿Cada cuánto se puede reajustar el arriendo en Chile?",
      answer: "Depende de lo que establezca el contrato. Lo más común es un reajuste anual, aunque algunos contratos establecen reajustes semestrales. El contrato debe indicar claramente la periodicidad y el mecanismo de cálculo."
    },
    {
      question: "¿Dónde se obtiene el IPC oficial para calcular el reajuste?",
      answer: "El IPC es publicado mensualmente por el Instituto Nacional de Estadísticas (INE) de Chile en su sitio web oficial. Para calcular correctamente el reajuste debes usar el IPC acumulado del período exacto que indica tu contrato, no el IPC mensual."
    },
    {
      question: "¿Qué puedo hacer si el arrendador aplicó un reajuste incorrecto?",
      answer: "Primero revisa tu contrato para verificar la cláusula de reajuste y el período. Luego compara con el IPC oficial del INE. Si el cobro no corresponde, puedes solicitar una explicación por escrito al arrendador. Si el error persiste, corresponde buscar asesoría legal para evaluar si existe cobro indebido."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogGrowthHacks
        title="Reajuste arriendo IPC Chile 2026 — Calcula cuánto sube tu arriendo"
        description="Calculadora de reajuste de arriendo por IPC (ejemplo 5%) + guía legal 2026: fórmula, pasos del cálculo y qué hacer si te cobran mal."
        image="/assets/reajuste-arriendo-ipc-2026.png"
        url="https://legalup.cl/blog/reajuste-arriendo-ipc-chile-2026"
        datePublished="2026-04-06"
        dateModified="2026-04-06"
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
          
          <h1 className="text-3xl sm:text-4xl font-bold font-serif mb-6 text-green-600 text-balance leading-tight">
            Reajuste arriendo IPC Chile 2026 — Calcula cuánto sube tu arriendo
          </h1>
          
          <p className="text-xl max-w-3xl leading-relaxed">
            El reajuste del arriendo según IPC es una de las dudas más frecuentes tanto para arrendadores como arrendatarios en Chile. Muchas personas ven subir el precio mensual sin entender cómo se calcula realmente ni si el aumento es correcto.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>06 de Abril, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Equipo LegalUp</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Tiempo de lectura: 9 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <BlogShare 
            title="Reajuste arriendo IPC Chile 2026 — Calcula cuánto sube tu arriendo" 
            url="https://legalup.cl/blog/reajuste-arriendo-ipc-chile-2026" 
            showBorder={false}
          />
          
          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-lg text-gray-600 leading-relaxed mb-6 font-medium">
              El reajuste del arriendo según IPC es una de las dudas más frecuentes entre arrendadores y arrendatarios en Chile. Cada año, miles de personas reciben un aviso de aumento y no saben si el monto es correcto, si el arrendador puede cobrarlo, o qué pueden hacer si creen que el cálculo está mal.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              Esta guía te explica cómo funciona el mecanismo, cómo calcularlo paso a paso, y qué hacer si el reajuste no corresponde.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué es el reajuste de arriendo según IPC?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El IPC (Índice de Precios al Consumidor) es el indicador oficial que mide la variación de precios en la economía chilena. Lo publica mensualmente el Instituto Nacional de Estadísticas (INE).
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Cuando un contrato de arriendo incluye una cláusula de reajuste por IPC, significa que el valor mensual se ajusta periódicamente según la inflación acumulada del período. Esto protege al arrendador de que el valor real del arriendo se erosione con el tiempo, y al arrendatario le da certeza de que el aumento no es arbitrario — está anclado a un índice oficial.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Es obligatorio aplicar el IPC en el arriendo?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              No. El reajuste por IPC solo aplica si está expresamente establecido en el contrato de arriendo.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Si tu contrato no tiene cláusula de reajuste:
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700">El valor del arriendo no puede modificarse de forma unilateral durante la vigencia del contrato</span>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700">Cualquier aumento requiere acuerdo de ambas partes y, en la práctica, implica firmar un nuevo contrato o un anexo</span>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700">Si el arrendador exige un aumento sin respaldo contractual, puedes rechazarlo</span>
              </div>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed font-bold text-lg">
              Esto es lo primero que debes revisar si te llegó un aviso de aumento: ¿tu contrato menciona IPC?
            </p>
          </div>

          {/* Cluster link equivalent */}
          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link 
              to="/blog/me-subieron-el-arriendo-que-hago-2026" 
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 ¿Te subieron el arriendo? Qué hacer hoy
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cada cuánto se puede reajustar el arriendo?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Depende de lo que establezca el contrato. Las frecuencias más comunes son:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="flex flex-col gap-2 p-5 bg-gray-50 rounded-xl border border-gray-100 h-full">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="font-bold text-gray-900 text-lg">Anual:</span>
                </div>
                <span className="text-gray-700 text-base">La más habitual. El arriendo se reajusta una vez al año según el IPC acumulado de los últimos 12 meses</span>
              </div>
              <div className="flex flex-col gap-2 p-5 bg-gray-50 rounded-xl border border-gray-100 h-full">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="font-bold text-gray-900 text-lg">Semestral:</span>
                </div>
                <span className="text-gray-700 text-base">Menos frecuente, pero válida si el contrato lo establece</span>
              </div>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El contrato debe indicar claramente dos cosas: la periodicidad del reajuste y el período exacto del IPC a usar. Si alguna de estas no está definida, hay margen para interpretación y potencial conflicto.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Cómo se calcula el reajuste por IPC paso a paso?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed font-medium">La fórmula es simple:</p>
            <p className="text-gray-900 font-bold text-xl mb-8 text-center bg-gray-50 p-6 rounded-lg border border-gray-100">Nuevo arriendo = arriendo actual × (1 + variación IPC)</p>
            
            <div className="space-y-4 mb-8 text-gray-700">
              <div className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4">
                <div className="bg-gray-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <p className="text-xl font-bold mb-3 text-gray-900 mb-1">Identifica tu arriendo actual</p>
                  <p className="text-gray-600">Ejemplo: $500.000</p>
                </div>
              </div>
              
              <div className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4">
                <div className="bg-gray-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <p className="text-xl font-bold mb-3 text-gray-900 mb-1">Obtén el IPC acumulado del período</p>
                  <p className="text-gray-600">
                    El IPC oficial lo encuentras en el sitio del INE (ine.gob.cl). Debes usar el IPC acumulado del período exacto que indica tu contrato, no el IPC del último mes.<br/>
                    Supongamos: 5%
                  </p>
                </div>
              </div>

              <div className="border border-gray-100 bg-white p-5 rounded-xl flex items-start gap-4">
                <div className="bg-gray-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <p className="text-xl font-bold mb-3 text-gray-900 mb-1">Aplica la fórmula</p>
                  <p className="text-gray-600">
                    $500.000 × 1,05 = $525.000<br/>
                    <span className="font-bold text-gray-900 line-clamp-2 mt-2">Ese es el nuevo arriendo correcto.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Calculadora IPC arriendo 2026</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Ingresa tu arriendo actual y el IPC acumulado del período que indica tu contrato (dato del INE). Esta calculadora usa un ejemplo referencial (5%) para que puedas probar el cálculo.
            </p>

            <div className="border border-gray-200 bg-gray-50 rounded-xl p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-900">Arriendo actual (CLP)</label>
                  <input
                    inputMode="numeric"
                    value={rentValue}
                    onChange={(e) => setRentValue(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-900"
                    placeholder="Ej: 500000"
                    aria-label="Arriendo actual"
                  />
                  <p className="text-xs text-gray-500">Ejemplo: {formatClp(parsed.rent)}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-900">IPC acumulado (%)</label>
                  <input
                    inputMode="decimal"
                    value={ipcPercent}
                    onChange={(e) => setIpcPercent(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-900"
                    placeholder="Ej: 5"
                    aria-label="IPC acumulado"
                  />
                  <p className="text-xs text-gray-500">Ejemplo referencial: 5%</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Nuevo arriendo</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">${formatClp(parsed.newRent)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Aumento</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">${formatClp(parsed.diff)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Porcentaje</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{Number.isFinite(parsed.pct) ? `${parsed.pct.toFixed(2)}%` : '—'}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  variant="outline"
                  className="h-11 border-gray-900 text-gray-900 hover:bg-green-900 hover:text-white"
                  onClick={() => {
                    setRentValue("500000");
                    setIpcPercent("5");
                  }}
                >
                  Restaurar ejemplo
                </Button>
              </div>

              <div className="mt-5 text-xs text-gray-500 leading-relaxed">
                El cálculo es una aproximación para fines informativos. Para evitar errores, usa el IPC acumulado exacto del período indicado en tu contrato y el dato oficial del INE.
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-xl font-bold mb-6 text-gray-900 border-t pt-8">Ejemplos reales de reajuste</h3>
            
            <div className="grid md:grid-cols-1 gap-6 mt-6">
              <div className="border border-gray-200 bg-gray-50 rounded-xl p-8 flex flex-col items-start h-full">
                <h4 className="font-bold text-gray-900 mb-4 text-lg">Ejemplo 1 — Familia en Santiago, arriendo anual</h4>
                <p className="text-gray-600 mb-6 leading-relaxed text-base flex-grow">
                  María lleva dos años arrendando un departamento en Ñuñoa por $600.000 mensuales. Su contrato establece reajuste anual según IPC. Al cumplirse el año, el IPC acumulado fue de 6%.<br/><br/>
                  El arrendador le envió un aviso cobrando $650.000. María revisó el INE, hizo el cálculo y solicitó explicación. El error era administrativo — el arrendador había usado un IPC incorrecto.
                </p>
                <div className="w-full border-t border-gray-200 pt-4">
                  <p className="text-base text-gray-700"><strong>Cálculo:</strong> <span className="font-bold text-gray-900 text-lg">$600.000 × 1,06 = $636.000</span></p>
                </div>
              </div>

              <div className="border border-gray-200 bg-gray-50 rounded-xl p-8 flex flex-col items-start h-full">
                <h4 className="font-bold text-gray-900 mb-4 text-lg">Ejemplo 2 — Arriendo comercial, reajuste semestral</h4>
                <p className="text-gray-600 mb-6 leading-relaxed text-base flex-grow">
                  Local comercial en Providencia, arriendo de $750.000. Contrato con reajuste semestral. IPC del semestre: 2,5%.
                </p>
                <div className="w-full border-t border-gray-200 pt-4">
                  <p className="text-base text-gray-700"><strong>Cálculo:</strong> <span className="font-bold text-gray-900 text-lg">$750.000 × 1,025 = $768.750</span></p>
                </div>
              </div>

              <div className="border border-gray-200 bg-gray-50 rounded-xl p-8 flex flex-col items-start h-full">
                <h4 className="font-bold text-gray-900 mb-4 text-lg">Ejemplo 3 — IPC alto por inflación</h4>
                <p className="text-gray-600 mb-6 leading-relaxed text-base flex-grow">
                  Arriendo de $400.000 con IPC anual de 9% (ejemplo referencial).
                </p>
                <div className="w-full border-t border-gray-200 pt-4">
                  <p className="text-base text-gray-700"><strong>Cálculo:</strong> <span className="font-bold text-gray-900 text-lg">$400.000 × 1,09 = $436.000</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Puede el arrendador subir más que el IPC?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed text-lg font-medium">Depende de lo que diga el contrato.</p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700">Si el contrato establece reajuste "según IPC", el aumento debe limitarse exactamente a ese porcentaje</span>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700">Si el contrato permite un reajuste mayor (por ejemplo, "IPC más un 2%"), ese margen adicional es válido</span>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700">Si el contrato venció y están en tácita reconducción — es decir, el arrendatario sigue pagando y el arrendador sigue recibiendo sin firmar un contrato nuevo — las condiciones originales se entienden prorrogadas, incluyendo la cláusula de reajuste</span>
              </div>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed font-bold text-lg">
              Si el arrendador quiere subir más del IPC sin que el contrato lo permita, necesita tu acuerdo. Sin acuerdo, el aumento no corresponde.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Errores comunes al aplicar el reajuste</h2>
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-gray-800">
                  <p className="font-bold mb-1">Usar el IPC mensual en vez del acumulado.</p>
                  <p className="text-gray-700">El IPC que debes usar es el del período completo indicado en el contrato, no el de un mes puntual.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-gray-800">
                  <p className="font-bold mb-1">Aplicar el reajuste fuera de fecha.</p>
                  <p className="text-gray-700">Si el contrato dice que el reajuste aplica en el mes de aniversario del contrato, no puede adelantarse ni atrasarse unilateralmente.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-gray-800">
                  <p className="font-bold mb-1">Reajustar sin cláusula.</p>
                  <p className="text-gray-700">Si el contrato no lo menciona, el aumento no tiene respaldo legal.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-gray-800">
                  <p className="font-bold mb-1">Usar porcentajes estimados o de medios.</p>
                  <p className="text-gray-700">El IPC que circula en noticias puede ser una proyección. El válido es el dato oficial del INE.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-gray-800">
                  <p className="font-bold mb-1">No avisar con anticipación.</p>
                  <p className="text-gray-700">Aunque la ley no establece un plazo mínimo de aviso para el reajuste, la práctica habitual es notificar con al menos 30 días de anticipación.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué pasa si no acepto el reajuste?</h2>
            <p className="text-gray-600 mb-6 leading-relaxed text-lg font-medium">Depende de si el reajuste está respaldado por el contrato o no.</p>
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8">
                <div className="flex items-start gap-4">
                  <Info className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-900 mb-1 text-lg">Si el reajuste está en el contrato:</p>
                    <p className="text-gray-600 leading-relaxed">Estás obligado a pagarlo. Negarte puede configurar incumplimiento contractual y el arrendador podría iniciar un proceso de desalojo por no pago.</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8">
                <div className="flex items-start gap-4">
                  <Info className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-900 mb-1 text-lg">Si el reajuste NO está en el contrato:</p>
                    <p className="text-gray-600 leading-relaxed">Tienes derecho a rechazarlo. Hazlo por escrito —correo electrónico o mensaje con registro— explicando que el contrato no contempla esa cláusula.</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8">
                <div className="flex items-start gap-4">
                  <Info className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-900 mb-1 text-lg">Si el cálculo es incorrecto:</p>
                    <p className="text-gray-600 leading-relaxed">Puedes pagar el monto que corresponde según el IPC correcto y notificar la diferencia por escrito. No es necesario pagar el monto equivocado.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Qué hacer si el reajuste está mal calculado?</h2>
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0 mt-0.5">1</div>
                <div className="text-gray-800">
                  <p className="text-lg font-bold text-gray-900 mb-1">Revisa tu contrato</p>
                  <p className="text-gray-700">Busca la cláusula de reajuste. Fíjate en el período exacto y el mecanismo de cálculo que establece.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0 mt-0.5">2</div>
                <div className="text-gray-800">
                  <p className="text-lg font-bold text-gray-900 mb-1">Verifica el IPC oficial</p>
                  <p className="text-gray-700">Entra a ine.gob.cl y obtén el IPC acumulado del período correspondiente. Haz el cálculo con la fórmula de arriba.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0 mt-0.5">3</div>
                <div className="text-gray-800">
                  <p className="text-lg font-bold text-gray-900 mb-1">Comunícate con el arrendador por escrito</p>
                  <p className="text-gray-700">Muchos errores son administrativos. Un correo señalando el cálculo correcto con el dato del INE suele resolver el problema sin necesidad de escalar.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0 mt-0.5">4</div>
                <div className="text-gray-800">
                  <p className="text-lg font-bold text-gray-900 mb-1">Guarda toda la comunicación</p>
                  <p className="text-gray-700">Si el conflicto escala, tener registro escrito de los intercambios es clave para cualquier proceso posterior.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                <div className="bg-gray-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-normal text-sm flex-shrink-0 mt-0.5">5</div>
                <div className="text-gray-800">
                  <p className="text-lg font-bold text-gray-900 mb-1">Busca asesoría legal</p>
                  <p className="text-gray-700">Si el arrendador insiste en el cobro incorrecto o amenaza con desalojo, es momento de consultar con un abogado especialista en arrendamiento. Un abogado puede evaluar si existe cobro indebido y qué acciones corresponden.</p>
                </div>
              </div>
            </div>
          </div>

          <InArticleCTA
            message="¿Te subieron el arriendo y no sabes si el cálculo es correcto? Un abogado puede revisar tu contrato y decirte si el reajuste corresponde."
            buttonText="Revisar mi reajuste con un abogado"
            category="Derecho Civil"
          />

          <div className="mb-12 mt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">¿Dónde obtener el IPC oficial en Chile?</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El IPC es publicado por el Instituto Nacional de Estadísticas (INE) en su sitio oficial. Ahí puedes consultar tanto el IPC mensual como el IPC acumulado por período.

              Para calcular correctamente el reajuste de arriendo, debes usar el IPC acumulado entre dos fechas:
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-8 mt-6 text-base">
                <li>La fecha de inicio del contrato (o del último reajuste)</li>
                <li>La fecha en que corresponde aplicar el nuevo valor</li>
              </ul>
              Este punto es clave, porque usar un período incorrecto puede generar un cálculo erróneo del arriendo.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Si no estás seguro de qué período corresponde, revisa tu contrato de arriendo. En muchos casos se indica expresamente cómo calcular el reajuste.
              Si el contrato no es claro, es recomendable consultar con un abogado para evitar cobros indebidos.
            </p>
            <p className="text-gray-600 font-bold mb-4 leading-relaxed">
              El IPC puede variar mes a mes, por lo que siempre se debe utilizar el valor oficial publicado por el INE para el período correspondiente.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Relación con otros problemas de arriendo</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Un reajuste mal aplicado puede derivar rápidamente en otros conflictos:</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="flex flex-col gap-4 bg-orange-50/50 p-6 rounded-xl border border-orange-100 h-full">
                <AlertCircle className="h-6 w-6 text-orange-500 flex-shrink-0" />
                <span className="text-gray-700 text-base leading-relaxed">Si el arrendatario no paga la diferencia que el arrendador considera válida, puede iniciarse un proceso de desalojo por no pago</span>
              </div>
              <div className="flex flex-col gap-4 bg-orange-50/50 p-6 rounded-xl border border-orange-100 h-full">
                <AlertCircle className="h-6 w-6 text-orange-500 flex-shrink-0" />
                <span className="text-gray-700 text-base leading-relaxed">Si el arrendador cobra montos sin respaldo contractual de forma reiterada, puede configurarse un cobro indebido</span>
              </div>
              <div className="flex flex-col gap-4 bg-orange-50/50 p-6 rounded-xl border border-orange-100 h-full">
                <AlertCircle className="h-6 w-6 text-orange-500 flex-shrink-0" />
                <span className="text-gray-700 text-base leading-relaxed">Los conflictos por reajuste suelen escalar cuando no hay comunicación escrita clara desde el inicio</span>
              </div>
            </div>
            <p className="text-gray-600 mb-10 leading-relaxed font-bold text-lg">
              Por eso entender bien el mecanismo desde el principio evita problemas mayores.
            </p>
          </div>

          <div className="mb-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Conclusión</h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              El reajuste de arriendo según IPC es un mecanismo legítimo y común en Chile, pero para que sea válido debe estar en el contrato, calcularse con el IPC oficial del período correcto y aplicarse en la fecha que corresponde.
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Si te llegó un aviso de aumento, lo primero es revisar el contrato. Si el cálculo no cuadra, tienes herramientas para cuestionarlo. Y si el conflicto no se resuelve entre las partes, un abogado especialista puede orientarte.
            </p>
          </div>

          <div className="text-center py-4 border-t border-b border-gray-100 my-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Artículo relacionado</p>
            <Link
              to="/blog/derecho-arrendamiento-chile-guia-completa-2026"
              className="inline-flex flex-wrap items-center justify-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-8 py-4 rounded-xl transition-all hover:bg-blue-100 text-sm sm:text-base"
            >
              👉 Guía legal: Todo sobre arriendos en Chile
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <InArticleCTA
            message="¿Tienes dudas sobre si el reajuste de tu arriendo es correcto? Consulta con un abogado de arriendo y aclara tu situación hoy."
            buttonText="Consultar sobre mi arriendo"
            category="Derecho Civil"
          />

          {/* FAQ */}
          <div className="mb-6 pt-6" data-faq-section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas frecuentes</h2>
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
          <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">
            ¿Te subieron el arriendo y no sabes si el cálculo es correcto?
          </h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            Habla con un abogado y entiende cuáles son tus opciones legales. Conectamos a personas con abogados especialistas en arrendamiento para revisar tu contrato de forma inmediata y profesional.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search?category=Derecho+Civil">
              <Button
                size="lg"
                onClick={() => {
                  window.gtag?.('event', 'click_consultar_abogado', {
                    article: window.location.pathname,
                    location: 'blog_cta_reajuste_arriendo_primary',
                  });
                }}
                className="bg-gray-900 hover:bg-green-900 text-white px-8 py-3 w-full sm:w-auto shadow-md"
              >
                Consultar con Abogado de Arriendo
              </Button>
            </Link>
            
          </div>
        </section>
      </div>

      <RelatedLawyers category="Derecho Civil" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-8 mb-8">
          <BlogShare 
            title="Reajuste de arriendo en Chile según IPC (2026): cuánto pueden subir y cómo calcularlo" 
            url="https://legalup.cl/blog/reajuste-arriendo-ipc-chile-2026" 
          />
        </div>
        
        <BlogNavigation 
          prevArticle={{
            id: "despido-injustificado-chile-2026",
            title: "Despido injustificado en Chile: qué hacer, cómo demandar y cuánto puedes ganar (Guía 2026)",
            excerpt: "Guía 2026 sobre el despido injustificado en Chile: qué es, cuándo se puede demandar, cuánto puedes ganar.",
            image: "/assets/despido-injustificado-chile-2026.png"
          }}
          nextArticle={{
            id: "no-devuelven-garantia-arriendo-chile-2026",
            title: "No me devuelven la garantía de arriendo en Chile: qué hacer y cómo recuperarla (Guía 2026)",
            excerpt: "Uno de los problemas más comunes al terminar un contrato de arriendo es que el arrendador no devuelve la garantía. Descubre cómo recuperar tu dinero paso a paso.",
            image: "/assets/no-devuelven-garantia-arriendo-chile-2026.png"
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
      <BlogConversionPopup category="Derecho Inmobiliario" topic="ipc" />
    </div>
  );
};

export default BlogArticle;
