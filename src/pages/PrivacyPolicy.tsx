import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';

const PrivacyPolicy = () => {
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
        <title>Política de Privacidad - LegalUp.cl</title>
        <meta name="description" content="Política de privacidad de LegalUp.cl" />
      </Helmet>
      
      <Header />
      
      <div className="max-w-7xl mx-auto">
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-left">
              POLÍTICA DE PRIVACIDAD — LegalUp.cl
            </CardTitle>
            <p className="text-left text-muted-foreground">
              Última actualización: {currentDate}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 text-justify">
            <p>
              En LegalUp.cl ("LegalUp", "nosotros"), valoramos y respetamos la privacidad de nuestros usuarios. 
              Esta Política de Privacidad explica cómo recopilamos, usamos, almacenamos y protegemos la información 
              personal de los usuarios que utilizan nuestra plataforma, ya sean personas que buscan asesoría legal 
              ("Usuarios") o abogados que ofrecen servicios ("Profesionales").
            </p>
            <p className="font-medium">
              Al utilizar LegalUp.cl aceptas esta Política de Privacidad.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">1. Información que recopilamos</h2>
            <p>Recopilamos la siguiente información:</p>
            
            <h3 className="font-medium mt-4">1.1. Información entregada voluntariamente</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Datos personales de Usuarios: nombre, correo electrónico, teléfono, información del caso u otros documentos que subas.</li>
              <li>Datos de Profesionales: nombre, correo electrónico, teléfono, información profesional, credenciales, experiencia, documentos que acrediten su profesión.</li>
              <li>Contenido generado en la plataforma: mensajes, documentos y archivos compartidos con los abogados o con el sistema.</li>
            </ul>

            <h3 className="font-medium mt-4">1.2. Información recopilada automáticamente</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Dirección IP</li>
              <li>Tipo de dispositivo</li>
              <li>Navegador utilizado</li>
              <li>Datos de uso (páginas visitadas, tiempo de navegación, acciones dentro de la plataforma)</li>
              <li>Cookies y tecnologías similares</li>
            </ul>

            <h3 className="font-medium mt-4">1.3. Información de pagos</h3>
            <p>
              Los pagos se procesan a través de proveedores externos (pasarelas de pago). LegalUp no almacena información 
              completa de tarjetas, pero sí recibimos datos básicos asociados a la transacción (estado, monto, fecha, ID de pago).
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">2. Cómo utilizamos la información</h2>
            <p>Utilizamos la información para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Crear y administrar cuentas de Usuarios y Profesionales.</li>
              <li>Conectar usuarios con abogados adecuados.</li>
              <li>Facilitar pagos, cobros y facturación.</li>
              <li>Personalizar y mejorar la experiencia dentro de la plataforma.</li>
              <li>Enviar notificaciones, actualizaciones y mensajes relevantes.</li>
              <li>Garantizar el cumplimiento de nuestros Términos de Servicio.</li>
              <li>Monitorear seguridad, prevenir fraudes y detectar actividades indebidas.</li>
              <li>Cumplir obligaciones legales en Chile.</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">3. Base legal para el tratamiento de datos</h2>
            <p>Tratamos tus datos conforme a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tu consentimiento cuando usas la plataforma o entregas información.</li>
              <li>La ejecución del contrato, para conectarte con abogados.</li>
              <li>El cumplimiento legal, cuando corresponda.</li>
              <li>Los intereses legítimos de mejorar y proteger nuestros servicios.</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">4. Compartir información</h2>
            <p>Podemos compartir información personal únicamente en estos casos:</p>
            
            <h3 className="font-medium mt-4">4.1. Con Abogados</h3>
            <p>Cuando un Usuario contrata o solicita servicios, se comparten únicamente los datos necesarios para que el Abogado pueda prestar la asesoría.</p>
            
            <h3 className="font-medium mt-4">4.2. Con proveedores externos</h3>
            <p>Por ejemplo:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Servicios de pago</li>
              <li>Hosting</li>
              <li>Análisis de datos</li>
              <li>Herramientas de soporte técnico</li>
            </ul>
            <p>Estos proveedores procesan datos bajo estricta confidencialidad.</p>
            
            <h3 className="font-medium mt-4">4.3. Requerimientos legales</h3>
            <p>Podemos compartir información si una autoridad competente lo exige conforme a la ley chilena.</p>
            
            <h3 className="font-medium mt-4">4.4. Prevención de fraude o seguridad</h3>
            <p>Si detectamos actividades maliciosas o intentos de abuso.</p>
            
            <p className="font-medium">LegalUp no vende información personal a terceros.</p>

            <h2 className="text-xl font-semibold mt-8 mb-4">5. Almacenamiento y seguridad</h2>
            <p>
              LegalUp implementa medidas de seguridad razonables para proteger la información de accesos no autorizados, 
              pérdida o modificación. Sin embargo, ningún sistema es 100% invulnerable. No garantizamos seguridad absoluta.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">6. Derechos de los usuarios</h2>
            <p>Los usuarios pueden, en cualquier momento:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Acceder a su información personal.</li>
              <li>Rectificar datos incorrectos o desactualizados.</li>
              <li>Solicitar la eliminación de su cuenta y datos (salvo obligaciones legales).</li>
              <li>Solicitar copia de la información entregada.</li>
              <li>Retirar su consentimiento, cuando este sea la base del tratamiento.</li>
            </ul>
            <p className="mt-2">Solicitudes: <a href="mailto:contacto@legalup.cl" className="text-blue-600 hover:underline">contacto@legalup.cl</a></p>

            <h2 className="text-xl font-semibold mt-8 mb-4">7. Cookies y tecnologías similares</h2>
            <p>Utilizamos cookies para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Recordar preferencias</li>
              <li>Medir el rendimiento de la plataforma</li>
              <li>Mejorar la experiencia del usuario</li>
              <li>Analítica y estadísticas de uso</li>
            </ul>
            <p className="mt-2">Puedes deshabilitar cookies desde tu navegador, pero algunas funciones pueden verse afectadas.</p>

            <h2 className="text-xl font-semibold mt-8 mb-4">8. Retención de datos</h2>
            <p>Conservamos la información:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Mientras la cuenta esté activa.</li>
              <li>Mientras existan obligaciones legales o contables.</li>
              <li>Mientras sea razonablemente necesario para fines operativos o de seguridad.</li>
            </ul>
            <p className="mt-2">Documentos y mensajes pueden ser eliminados al cerrar la cuenta, según la legislación aplicable.</p>

            <h2 className="text-xl font-semibold mt-8 mb-4">9. Privacidad entre Usuario y Abogado</h2>
            <p>LegalUp no participa en la relación abogado-cliente.</p>
            <p>Los Abogados son responsables de:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Manejar de forma confidencial la información entregada por los Usuarios.</li>
              <li>Cumplir normas éticas y profesionales aplicables a su ejercicio.</li>
            </ul>
            <p className="mt-2">
              LegalUp no revisa ni accede al contenido de esa comunicación, salvo casos estrictamente necesarios 
              por razones técnicas o de seguridad.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">10. Privacidad de menores</h2>
            <p>
              LegalUp no está dirigido a menores de 18 años.
              Si detectamos cuentas creadas por menores, procederemos a eliminarlas.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">11. Cambios a esta Política</h2>
            <p>
              Podemos actualizar esta Política de Privacidad en cualquier momento.
              La fecha de última actualización se mostrará al inicio del documento.
              Al continuar usando LegalUp después de los cambios, aceptas la nueva versión.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">12. Contacto</h2>
            <p>Para consultas o soporte:</p>
            <p>Sitio web: <a href="https://legalup.cl" className="text-primary hover:underline">LegalUp.cl</a></p>
            <p>Correo: <a href="mailto:contacto@legalup.cl" className="text-blue-600 hover:underline">contacto@legalup.cl</a></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
