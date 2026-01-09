import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';

const TermsOfService = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const currentDate = new Date().toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 pt-24 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Términos de Servicio - LegalUp.cl</title>
        <meta name="description" content="Términos y condiciones de uso de LegalUp.cl" />
      </Helmet>
      
      <Header />
      
      <div className="max-w-7xl mx-auto">
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-left">
              TÉRMINOS DE SERVICIO — LegalUp.cl
            </CardTitle>
            <p className="text-left text-muted-foreground">
              Última actualización: {currentDate}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 text-justify">
            <p>
              Bienvenido a LegalUp.cl ("LegalUp", "la Plataforma", "nosotros"). 
              Estos Términos de Servicio regulan el acceso y uso de la Plataforma 
              por parte de usuarios clientes, abogados, y cualquier persona que interactúe con nuestros servicios.
            </p>
            <p className="font-medium">
              Al usar LegalUp.cl, aceptas estos Términos. Si no estás de acuerdo, no utilices la Plataforma.
            </p>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Naturaleza del servicio</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>LegalUp.cl es una plataforma tecnológica de intermediación que conecta a personas que requieren servicios legales ("Usuarios") con abogados independientes ("Profesionales" o "Abogados").</li>
                <li>LegalUp no es un estudio jurídico, no presta servicios legales y no actúa como representación legal de los Usuarios.</li>
                <li>Cada Abogado es responsable de su ejercicio profesional, cumplimiento normativo y resultados de su asesoría.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Registro y cuentas</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Para utilizar ciertos servicios, deberás crear una cuenta proporcionando información veraz y actualizada.</li>
                <li>Debes tener al menos 18 años.</li>
                <li>Eres responsable de la confidencialidad de tus credenciales.</li>
                <li>LegalUp puede suspender o eliminar cuentas que incumplan estos Términos o presenten actividad sospechosa.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Relación entre Usuarios y Abogados</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Los servicios legales son contratados directamente entre el Usuario y el Abogado.</li>
                <li>LegalUp no participa en la relación profesional, en la confección de documentos, ni en decisiones jurídicas.</li>
                <li>LegalUp no garantiza resultados, tiempos de respuesta, calidad de servicio ni la veracidad de la información entregada por los Abogados.</li>
                <li>Los Abogados aceptan que son plenamente responsables por:
                  <ul className="list-[circle] pl-6 mt-2 space-y-1">
                    <li>La calidad y precisión del servicio legal.</li>
                    <li>El cumplimiento ético y profesional según las normas del Colegio de Abogados o regulaciones aplicables.</li>
                    <li>La protección de datos y documentos entregados por los Usuarios.</li>
                  </ul>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Pagos y comisiones</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>LegalUp podrá cobrar una comisión por los servicios de intermediación, derivación o gestión de clientes que realice, respecto de cada cliente o caso generado directa o indirectamente a través de LegalUp, independiente del medio de contacto, pago o formalización utilizado.</li>
                <li>El precio del servicio profesional es definido libremente por cada Abogado.</li>
                <li>La comisión de LegalUp será retenida, descontada o facturada al Abogado, según corresponda, conforme al mecanismo de pago utilizado en cada caso.</li>
                <li>LegalUp no se responsabiliza por retrasos, fallas o errores imputables a bancos, proveedores externos o pasarelas de pago.</li>
                <li>No se permiten transacciones realizadas con el objeto de eludir o evadir el pago de la comisión correspondiente a LegalUp respecto de clientes o casos derivados por la Plataforma.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Conducta y uso adecuado</h2>
              <p className="mb-2">Está prohibido:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Utilizar la Plataforma para actividades ilícitas.</li>
                <li>Proporcionar información falsa.</li>
                <li>Realizar hostigamiento o comportamientos abusivos.</li>
                <li>Interferir con el funcionamiento técnico de la Plataforma.</li>
                <li>Intentar contactar a profesionales o usuarios para fines ajenos a los servicios legales ofrecidos.</li>
              </ul>
              <p className="mt-3">LegalUp puede suspender o eliminar cuentas que infrinjan estas reglas.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Contenido del usuario</h2>
              <p>
                Los usuarios pueden subir documentos y enviar información al Abogado. Al hacerlo, garantizan que:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Tienen derecho a compartir dicho contenido.</li>
                <li>No infringe derechos de terceros.</li>
              </ul>
              <p className="mt-3">
                LegalUp no revisa ni valida el contenido suministrado por los Usuarios o Abogados.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Privacidad y manejo de datos</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>El uso de LegalUp implica la recopilación y tratamiento de datos personales conforme a nuestra Política de Privacidad.</li>
                <li>Recomendamos leerla atentamente.</li>
                <li>LegalUp implementa medidas razonables de seguridad, pero no garantiza protección absoluta contra amenazas externas.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Limitación de responsabilidad</h2>
              <p>LegalUp no es responsable por:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>El desempeño, calidad o resultado de los servicios legales.</li>
                <li>Daños directos o indirectos derivados de la relación entre Usuario y Abogado.</li>
                <li>Pérdida de información por causas externas, errores de terceros o fallas tecnológicas.</li>
                <li>Contenido entregado o publicado por Usuarios o Abogados.</li>
              </ul>
              <p className="mt-3">
                La Plataforma se entrega "tal cual", sin garantías explícitas o implícitas.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Modificaciones de la Plataforma y los Términos</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>LegalUp puede actualizar, modificar o descontinuar cualquier funcionalidad sin aviso previo.</li>
                <li>También podremos actualizar estos Términos. Continuar usando la Plataforma después de dichos cambios implica aceptación.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Terminación del servicio</h2>
              <p>LegalUp puede suspender o eliminar cuentas por:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Incumplimiento de estos Términos.</li>
                <li>Uso indebido de la Plataforma.</li>
                <li>Razones técnicas, legales o de seguridad.</li>
              </ul>
              <p className="mt-3">
                Los Usuarios pueden solicitar la eliminación de su cuenta en cualquier momento.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Legislación aplicable y resolución de conflictos</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Estos Términos se rigen por las leyes de la República de Chile.</li>
                <li>Cualquier disputa que surja en relación con el uso de la Plataforma será sometida a los tribunales competentes de Santiago, Chile.</li>
              </ul>
            </section>

            <h2 className="text-xl font-semibold mb-3">12. Contacto</h2>
            <p>Para consultas o soporte:</p>
            <p>Sitio web: <a href="https://legalup.cl" className="text-primary hover:underline">LegalUp.cl</a></p>
            <p>Correo: <a href="mailto:juan.fercommerce@gmail.com" className="text-blue-600 hover:underline">contacto@legalup.cl</a></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
