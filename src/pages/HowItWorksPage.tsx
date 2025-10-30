import { Search, User, MessageCircle, CheckCircle, Clock, ShieldCheck, FileText } from "lucide-react";
import Header from "@/components/Header";
import { Link } from "react-router-dom";

export default function HowItWorksPage() {
  const steps = [
    {
      icon: <Search className="h-6 w-6 text-blue-600" />,
      title: "1. Encuentra a tu abogado",
      description: "Busca entre nuestra red de abogados verificados y encuentra al profesional que mejor se adapte a tus necesidades legales."
    },
    {
      icon: <MessageCircle className="h-6 w-6 text-blue-600" />,
      title: "2. Contacta directamente",
      description: "Envía tu consulta inicial y programa una asesoría sin compromiso con el abogado de tu elección."
    },
    {
      icon: <FileText className="h-6 w-6 text-blue-600" />,
      title: "3. Recibe orientación",
      description: "Obtén asesoramiento legal claro y personalizado para entender tus opciones y próximos pasos."
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-blue-600" />,
      title: "4. Toma acción",
      description: "Con la información clara, decide cómo proceder con tu caso con la confianza de estar en buenas manos."
    }
  ];

  const features = [
    {
      icon: <ShieldCheck className="h-8 w-8 text-blue-600" />,
      title: "Abogados Verificados",
      description: "Todos nuestros profesionales pasan por un riguroso proceso de verificación de credenciales."
    },
    {
      icon: <Clock className="h-8 w-8 text-blue-600" />,
      title: "Respuesta Rápida",
      description: "Recibe respuestas de abogados en cuestión de horas, no días."
    },
    {
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      title: "Documentos Seguros",
      description: "Comparte documentos de forma segura a través de nuestra plataforma encriptada."
    }
  ];

  return (
    <div className="w-full">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">¿Cómo funciona LegalUp?</h1>
          <p className="text-lg text-gray-700 mb-12 max-w-3xl">
            Conectamos personas que necesitan asesoría legal con abogados expertos de manera simple, rápida y segura. 
            Sigue estos sencillos pasos para resolver tus asuntos legales con confianza.
          </p>
        </div>
      

        {/* Steps Section */}
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
              {steps.map((step, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition-shadow">
                  <div className="flex flex-col h-full">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                      {step.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Beneficios de usar LegalUp</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {features.map((feature, index) => (
                <div key={index} className="bg-white p-8 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para comenzar?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Encuentra al abogado ideal para tus necesidades y resuelve tus consultas legales de manera rápida y segura.
          </p>
          <Link 
            to="/search"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-11 rounded-md px-8 bg-white text-blue-600 hover:bg-gray-100"
          >
            Buscar abogados
          </Link>
        </div>
      </section>
    </div>
  );
}
