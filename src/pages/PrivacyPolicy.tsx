import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const lastUpdated = '31 de octubre de 2026';

  return (
    <div className="min-h-screen bg-gray-50 py-8 pt-32 px-4 sm:px-6 lg:px-8">
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
              Última actualización: {lastUpdated}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 text-justify">
            <p>
              En LegalUp.cl, “LegalUp” es la marca comercial y el nombre de la plataforma,
              operada por la sociedad LegalUp SpA (“nosotros”, responsable del tratamiento).
              Valoramos y respetamos la privacidad de nuestros usuarios.{" "}
              {/* TODO(legal): completar RUT, domicilio y correo legal de LegalUp SpA como responsable del tratamiento. */}
              Esta Política de Privacidad explica cómo recopilamos, usamos, almacenamos y protegemos la información
              personal de los usuarios que utilizan nuestra plataforma, ya sean personas que buscan asesoría legal
              ("Usuarios") o abogados que ofrecen servicios ("Profesionales"). También explica cómo tratamos el
              contenido que envías a las funciones de inteligencia artificial y cómo se realizan las transferencias
              internacionales necesarias para operar el servicio.
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
              <li>Contenido que envías a las funciones de inteligencia artificial, como consultas, instrucciones, documentos o extractos, y las respuestas que generas a partir de ellas.</li>
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
              Los pagos se procesan a través de proveedores externos (pasarelas de pago). LegalUp SpA no almacena información
              completa de tarjetas, pero sí recibimos datos básicos asociados a la transacción (estado, monto, fecha, ID de pago).
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">1.4. Responsable del tratamiento</h2>
            <p>
              El responsable del tratamiento de los datos personales recogidos a través de la plataforma LegalUp es
              LegalUp SpA.
              {/* TODO(legal): agregar RUT, domicilio y correo de contacto del responsable cuando se confirmen. */}
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">2. Cómo utilizamos la información</h2>
            <p>Utilizamos la información para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Crear y administrar cuentas de Usuarios y Profesionales.</li>
              <li>Conectar usuarios con abogados adecuados.</li>
              <li>Facilitar pagos, cobros y facturación.</li>
              <li>Personalizar y mejorar la experiencia dentro de la plataforma.</li>
              <li>Prestar funciones asistidas por inteligencia artificial sobre el contenido que decides enviar, como análisis de documentos, consultas, investigación jurídica y redacción.</li>
              <li>Enviar notificaciones, actualizaciones y mensajes relevantes.</li>
              <li>Garantizar el cumplimiento de nuestros Términos de Servicio.</li>
              <li>Monitorear seguridad, prevenir fraudes y detectar actividades indebidas.</li>
              <li>Cumplir obligaciones legales en Chile.</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">3. Base legal para el tratamiento de datos</h2>
            <p>
              Tratamos tus datos conforme a la Ley 19.628 sobre Protección de la Vida Privada y, cuando entre en vigencia,
              la Ley 21.719 que moderniza la regulación de datos personales. Según corresponda, tratamos tus datos con base en:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tu consentimiento cuando usas la plataforma o entregas información.</li>
              <li>Tu consentimiento, cuando corresponda, para el tratamiento de datos sensibles y para el uso de funciones de inteligencia artificial que impliquen el envío de contenido a proveedores externos.</li>
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
              <li>Servicios de pago.</li>
              <li>Hosting, base de datos y almacenamiento (Supabase).</li>
              <li>Enrutamiento y proveedores de modelos de inteligencia artificial (OpenRouter y el proveedor del modelo).</li>
              <li>Análisis de datos.</li>
              <li>Herramientas de soporte técnico.</li>
            </ul>
            <p>Estos proveedores procesan datos por cuenta de LegalUp y conforme a obligaciones contractuales de confidencialidad y seguridad, cuando corresponda.</p>
            
            <h3 className="font-medium mt-4">4.3. Requerimientos legales</h3>
            <p>Podemos compartir información si una autoridad competente lo exige conforme a la ley chilena.</p>
            
            <h3 className="font-medium mt-4">4.4. Prevención de fraude o seguridad</h3>
            <p>Si detectamos actividades maliciosas o intentos de abuso.</p>

            <h3 className="font-medium mt-4">4.5. Integración con Google Calendar (abogados)</h3>
            <p>La conexión con Google Calendar es opcional y solo está disponible para abogados que la activen explícitamente. Al conectarla, LegalUp solicita acceso limitado para: (i) consultar únicamente si existen horarios ocupados al ofrecer disponibilidad, sin leer el título ni el contenido de tus eventos; y (ii) crear en tu calendario los eventos de las citas agendadas en la plataforma, incluyendo el enlace de Google Meet. Para mantener la integración guardamos de forma segura los tokens de acceso otorgados por Google. Puedes desconectar la integración en cualquier momento desde la sección Integraciones, lo que revoca el acceso y elimina los tokens almacenados. Los datos de tu calendario no se utilizan con fines publicitarios ni para entrenar modelos de inteligencia artificial ajenos a tu caso.</p>

            <h3 className="font-medium mt-4">4.6. Inicio de sesión con Google</h3>
            <p>Si eliges crear tu cuenta o iniciar sesión con Google, recibimos de Google únicamente los datos básicos necesarios para autenticarte: tu nombre, dirección de correo electrónico e imagen de perfil. Estos datos se utilizan exclusivamente para crear y administrar tu cuenta de LegalUp y no se comparten con terceros con fines publicitarios. Iniciar sesión con Google NO otorga a LegalUp acceso a tu calendario, correo, Drive ni contactos; el acceso a Google Calendar es una integración separada y opcional descrita en la sección 4.5, que requiere tu autorización explícita adicional. Puedes eliminar tu cuenta y los datos asociados en cualquier momento según lo descrito en la sección 6.</p>
            
            <h3 className="font-medium mt-4">4.7. Funciones de inteligencia artificial</h3>
            <p>
              Algunas funciones de LegalUp usan inteligencia artificial para analizar documentos, responder consultas,
              apoyar la investigación jurídica y generar borradores. Cuando usas estas funciones, el contenido que decides
              enviar (por ejemplo, consultas, instrucciones, documentos o extractos) se transmite a OpenRouter, un servicio
              de enrutamiento de modelos, para que lo procese el proveedor del modelo configurado. Actualmente usamos el
              modelo openai/gpt-4o-mini a través de OpenRouter. Podemos cambiar de modelo o proveedor para mantener o
              mejorar el servicio; actualizaremos esta Política cuando el cambio sea relevante.
            </p>
            <p>
              Configuramos las solicitudes de inteligencia artificial para exigir retención cero (Zero Data Retention o ZDR)
              y denegar la recopilación de datos. Según la documentación de OpenRouter, ZDR implica que el proveedor no
              conserva el prompt ni la respuesta después de completar la solicitud, salvo las excepciones limitadas que el
              propio proveedor informe, por ejemplo, obligaciones legales o medidas de seguridad. No habilitamos el registro
              privado de prompts y respuestas en OpenRouter. No podemos garantizar el comportamiento de terceros más allá de
              la configuración aplicada y de sus compromisos contractuales.
            </p>
            <p>
              LegalUp no utiliza el contenido de tus casos o documentos para entrenar modelos de inteligencia artificial.
              La configuración de OpenRouter exige que el proveedor no recopile esos datos y, conforme a las condiciones del
              proveedor, no los use para entrenamiento. Esta exclusión no impide que LegalUp conserve el contenido en sus
              propios sistemas para prestar el servicio, cumplir obligaciones legales o atender fines de seguridad, conforme
              a la sección 8.
            </p>
            <p>
              La retención cero se aplica al procesamiento del proveedor de inferencia; no implica que LegalUp elimine de
              inmediato el contenido de sus sistemas, copias de seguridad o registros. Te pedimos enviar solo los datos
              necesarios para la función que estás usando y contar con la autorización correspondiente cuando incluyas datos
              de terceros o datos sensibles.
            </p>

            <h3 className="font-medium mt-4">4.8. Transferencias internacionales</h3>
            <p>
              Para operar la plataforma, tus datos pueden ser tratados fuera de Chile. La base de datos y el almacenamiento
              de producción de LegalUp están alojados en Supabase, en la región us-west-1 (Northern California, Estados
              Unidos). OpenRouter y el proveedor del modelo pueden estar ubicados en Estados Unidos u otros países.
            </p>
            <p>
              Estas transferencias se realizan para ejecutar el contrato, con tu consentimiento cuando corresponda y con
              medidas contractuales y técnicas razonables, incluida la configuración de retención cero para las solicitudes
              de inteligencia artificial. Cuando la normativa aplicable exija garantías adicionales, procuraremos
              implementarlas. Puedes solicitar más información sobre los proveedores y las transferencias a
              contacto@legalup.cl.
            </p>

            <p className="font-medium">LegalUp SpA no vende información personal a terceros.</p>

            <h2 className="text-xl font-semibold mt-8 mb-4">5. Almacenamiento y seguridad</h2>
            <p>
              El almacenamiento principal de la plataforma se realiza en Supabase, en la región us-west-1 (Estados Unidos).
              LegalUp SpA implementa medidas de seguridad razonables para proteger la información de accesos no autorizados,
              pérdida o modificación, como controles de acceso y cifrado en tránsito. Sin embargo, ningún sistema es 100%
              invulnerable. No garantizamos seguridad absoluta.
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
            <p className="mt-2">
              Cuando la Ley 21.719 entre en vigencia, podrás ejercer también los derechos que ella reconozca.
            </p>
            <p className="mt-2">Solicitudes: <a href="mailto:contacto@legalup.cl" className="text-green-900 hover:text-green-600 underline">contacto@legalup.cl</a></p>

            <h2 className="text-xl font-semibold mt-8 mb-4">7. Cookies y tecnologías similares</h2>
            <p>Utilizamos cookies para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Recordar preferencias</li>
              <li>Medir el rendimiento de la plataforma</li>
              <li>Mejorar la experiencia del usuario</li>
              <li>Analítica y estadísticas de uso</li>
            </ul>
            <p className="mt-2">Puedes deshabilitar cookies desde tu navegador, pero algunas funciones pueden verse afectadas.</p>
            <p className="mt-2">
              Las cookies necesarias para el funcionamiento (autenticación, seguridad y
              sesión) siempre están activas. Las cookies opcionales de analítica,
              marketing y preferencias solo se activan con tu consentimiento, que puedes
              otorgar, rechazar o modificar en cualquier momento desde{' '}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('legalup:open-cookie-preferences'))}
                className="text-green-900 underline hover:text-green-600"
              >
                Configurar cookies
              </button>{' '}
              o en nuestra <a href="/cookies" className="text-green-900 hover:text-green-600 underline">Política de Cookies</a>.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">8. Retención de datos</h2>
            <p>Conservamos la información:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Mientras la cuenta esté activa.</li>
              <li>Mientras existan obligaciones legales o contables.</li>
              <li>Mientras sea razonablemente necesario para fines operativos o de seguridad.</li>
            </ul>
            <p className="mt-2">Documentos y mensajes pueden ser eliminados al cerrar la cuenta, según la legislación aplicable.</p>
            <p className="mt-2">
              El contenido enviado a funciones de inteligencia artificial se conserva en LegalUp conforme a los criterios
              anteriores. La retención cero descrita en la sección 4.7 se refiere al proveedor de inferencia y no elimina las
              copias que LegalUp mantenga para prestar el servicio, cumplir obligaciones legales o proteger la plataforma.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">9. Privacidad entre Usuario y Abogado</h2>
            <p>LegalUp SpA, a través de la plataforma LegalUp, no participa en la relación abogado-cliente.</p>
            <p>Los Abogados son responsables de:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Manejar de forma confidencial la información entregada por los Usuarios.</li>
              <li>Cumplir normas éticas y profesionales aplicables a su ejercicio.</li>
            </ul>
            <p className="mt-2">
              LegalUp SpA no revisa ni accede al contenido de esa comunicación, salvo casos estrictamente necesarios
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
              Si los cambios son materiales, podremos solicitar que aceptes nuevamente esta Política.
              El uso continuado de LegalUp después de la entrada en vigencia de los cambios implica su aceptación,
              sin perjuicio de la nueva aceptación cuando corresponda.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">12. Contacto</h2>
            <p>
              El responsable de esta plataforma es LegalUp SpA.
              {/* TODO(legal): completar RUT, domicilio y correo legal de LegalUp SpA. */}
            </p>
            <p>Para consultas o soporte:</p>
            <p>Sitio web: <a href="https://legalup.cl" className="text-primary hover:underline">LegalUp.cl</a></p>
            <p>Correo: <a href="mailto:contacto@legalup.cl" className="text-green-900 hover:text-green-600 underline">contacto@legalup.cl</a></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
