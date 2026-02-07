import { CheckCircle, ShieldCheck, Eye, Heart, Zap, Scale } from "lucide-react";
import Header from "@/components/Header";
import { lazy, Suspense } from 'react';

export default function AboutPage() {
  return (
    <div className="w-full">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Acerca de LegalUp</h1>
          <p className="text-lg text-gray-700 mb-12 max-w-3xl">
            Bienvenido a LegalUp, tu puente digital con el mundo del asesoramiento legal profesional. Creamos esta plataforma para personas que buscan soluciones confiables, rápidas y transparentes, con acceso a abogados verificados de distintas especialidades y tarifas, para que puedas elegir la opción que mejor se adapte a tu necesidad.
          </p>
          
          {/* Mission Section */}
          <section className="mb-16 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Nuestra misión</h2>
            <p className="text-gray-700 text-lg leading-relaxed">
              Empoderarte con acceso directo y transparente a abogados capacitados, sin complicaciones ni barreras.
              Creemos que el asesoramiento legal no debe ser un lujo, sino un derecho, por eso conectamos a las personas con abogados de distintas especialidades y tarifas, para que cada quien elija la opción que mejor se ajuste a su necesidad.
            </p>
          </section>

          {/* What We Do Section */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">¿Qué hacemos?</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <Scale className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Conexión Especializada</h3>
                <p className="text-gray-600 text-sm">Conectamos usuarios con abogados especializados según el área legal requerida.</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Proceso Simplificado</h3>
                <p className="text-gray-600 text-sm">Simplificamos la contratación legal con una interfaz clara y amigable.</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Comunicación Directa</h3>
                <p className="text-gray-600 text-sm">Facilitamos la comunicación y seguimiento entre cliente y profesional.</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Confianza Garantizada</h3>
                <p className="text-gray-600 text-sm">Promovemos la confianza mediante perfiles verificados y reseñas reales.</p>
              </div>
            </div>
          </section>

          {/* Values Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuestros valores</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Suspense fallback={
                <div className="bg-white p-6 rounded-xl border border-gray-100 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              }>
                <div className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                    <ShieldCheck className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Confianza</h3>
                  <p className="text-gray-600 text-sm">
                    Validamos la idoneidad de todos los profesionales para garantizar tu tranquilidad.
                  </p>
                </div>
              </Suspense>

              <Suspense fallback={
                <div className="bg-white p-6 rounded-xl border border-gray-100 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              }>
                <div className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                    <Eye className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Transparencia</h3>
                  <p className="text-gray-600 text-sm">
                    Mostramos con claridad tarifas, tiempos y alcance de cada servicio.
                  </p>
                </div>
              </Suspense>

              <Suspense fallback={
                <div className="bg-white p-6 rounded-xl border border-gray-100 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              }>
                <div className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                    <Heart className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Empatía</h3>
                  <p className="text-gray-600 text-sm">
                    Entendemos tu situación y trabajamos con el mayor respeto y profesionalismo.
                  </p>
                </div>
              </Suspense>

              <Suspense fallback={
                <div className="bg-white p-6 rounded-xl border border-gray-100 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              }>
                <div className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Innovación</h3>
                  <p className="text-gray-600 text-sm">
                    Utilizamos tecnología para hacer el acceso a servicios legales más eficiente.
                  </p>
                </div>
              </Suspense>
            </div>
          </section>
        </div>
      </section>

      {/* CTA Section - Full Width */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para resolver tus asuntos legales?
          </h2>
          <p className="text-xl mb-8 text-white">
            Encuentra al abogado ideal para tus necesidades y resuelve tus consultas de manera rápida y segura.
          </p>
          <a 
              href="/search"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-11 rounded-md px-8 bg-white text-blue-600 hover:bg-gray-100"
            >
              Buscar abogados
            </a>
        </div>
      </section>
    </div>
  );
}
