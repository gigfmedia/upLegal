import Header from "@/components/Header";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function AsesoriaLegalOnlinePage() {
  const steps = [
    {
      title: "1. Elige una especialidad",
      description: "Laboral, familia, civil, penal, consumidor y más."
    },
    {
      title: "2. Agenda día y hora",
      description: "Selecciona el abogado y el horario que más te acomode."
    },
    {
      title: "3. Habla con un abogado online",
      description: "Recibe orientación clara por videollamada."
    }
  ];

  const reasons = [
    "Abogados verificados por RUT en Poder Judicial",
    "Pago seguro con MercadoPago",
    "Plataforma chilena",
    "Agenda online inmediata",
    "Atención 100% remota"
  ];

  const areas = [
    "Derecho Laboral",
    "Derecho de Familia",
    "Derecho Civil",
    "Derecho Penal",
    "Derecho Comercial",
    "Derecho del Consumidor",
    "Deudas y cobranza",
    "Y más..."
  ];

  const faqs = [
    {
      question: "¿La asesoría legal online es válida en Chile?",
      answer:
        "Sí. La orientación legal entregada por abogados habilitados es completamente válida, incluso si se realiza por videollamada."
    },
    {
      question: "¿Puedo elegir al abogado?",
      answer: "Sí. Puedes revisar el perfil del abogado y elegir libremente con quién agendar."
    },
    {
      question: "¿Qué pasa si no puedo asistir a la cita?",
      answer:
        "La reprogramación de una asesoría depende de la disponibilidad del abogado. Si necesitas cambiar tu cita, podrás coordinarlo directamente con el abogado luego de agendar."
    },
    {
      question: "¿LegalUp es un estudio jurídico?",
      answer:
        "No. LegalUp es una plataforma que conecta personas con abogados independientes, facilitando el agendamiento y el pago de asesorías legales."
    }
  ];

  return (
    <div className="w-full bg-white">
      <Header />

      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16"> 
        <div className="w-full max-w-7xl mx-auto px-4 text-center space-y-6">
          <h1 className="text-4xl font-bold text-gray-900">
            Asesoría legal online en Chile
          </h1>
          <p className="text-lg text-gray-700">
            Habla con un abogado verificado por videollamada.
          </p>
          <p className="text-lg text-gray-700">
            Paga solo por tu consulta, sin contratos ni costos ocultos.
          </p>
          <Link
            to="/search"
            className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          >
            Agendar asesoría ahora
          </Link>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 space-y-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            ¿Necesitas orientación legal hoy?
          </h2>
          <p className="text-lg text-gray-700">
            En LegalUp conectamos personas con abogados reales y verificados en Chile para resolver dudas legales de forma rápida, segura y online.
          </p>
          <div className="grid gap-4 text-lg font-bold text-gray-700">
            <p>Sin ir a oficinas. Sin llamadas eternas. Sin pagar de más.</p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            ¿Cómo funciona LegalUp?
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.title}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            ¿Por qué usar LegalUp?
          </h2>
          <div className="grid gap-4 text-lg text-gray-700 md:grid-cols-2">
            {reasons.map((reason) => (
              <p key={reason} className="bg-gray-50 border border-gray-100 rounded-xl px-6 py-4 flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" /> {reason}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Áreas legales disponibles
          </h2>
          <div className="grid gap-4 md:grid-cols-2 text-lg text-gray-700">
            {areas.map((area) => (
              <p key={area} className="bg-white border border-gray-100 rounded-xl px-6 py-4 shadow-sm">
                {area}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">
            ¿Cuánto cuesta una asesoría legal online?
          </h2>
          <p className="text-lg text-gray-700">
            El precio depende del abogado y del tipo de consulta.
          </p>
          <p className="text-lg text-gray-700">
            Antes de pagar verás el valor final, sin sorpresas.
          </p>
          <p className="text-lg text-gray-700">
            Pagas solo por la asesoría que agendas.
          </p>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Preguntas frecuentes
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {faq.question}
                </h3>
                <p className="text-gray-700 text-base">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">
            Habla con un abogado hoy mismo
          </h2>
          <p className="text-lg text-gray-700">
            Resuelve tus dudas legales de forma clara, rápida y segura.
          </p>
          <Link
            to="/search"
            className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-full shadow-lg transition-colors"
          >
            Agendar asesoría ahora
          </Link>
        </div>
      </section>
    </div>
  );
}
