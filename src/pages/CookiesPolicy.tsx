import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import { openCookiePreferences } from '@/lib/cookieConsent';

/**
 * Política de Cookies — lista solo proveedores reales encontrados en
 * auditoría de código (sin duraciones/nombres inventados).
 */
const CookiesPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const currentDate = new Date().toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 pt-32 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Política de Cookies - LegalUp.cl</title>
        <meta name="description" content="Política de cookies de LegalUp.cl" />
      </Helmet>

      <Header />

      <div className="max-w-7xl mx-auto">
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-left">
              POLÍTICA DE COOKIES — LegalUp.cl
            </CardTitle>
            <p className="text-left text-muted-foreground">
              Última actualización: {currentDate}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 text-justify">
            <p>
              En LegalUp.cl, “LegalUp” es la marca comercial y el nombre de la plataforma,
              operada por la sociedad LegalUp SpA. Esta Política explica qué cookies y
              tecnologías similares utilizamos, con qué finalidad y cómo puedes gestionar
              tu consentimiento.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">1. Qué son las cookies</h2>
            <p>
              Las cookies son pequeños archivos que se almacenan en tu dispositivo cuando
              visitas un sitio web. También utilizamos tecnologías similares como el
              almacenamiento local del navegador (localStorage), que usamos para recordar
              tu decisión de consentimiento.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">2. Qué tipos usamos</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Necesarias:</strong> imprescindibles para el funcionamiento básico.</li>
              <li><strong>Analíticas:</strong> nos ayudan a entender el uso y mejorar (requieren tu consentimiento).</li>
              <li><strong>Marketing:</strong> miden campañas y relevancia de contenido (requieren tu consentimiento).</li>
              <li><strong>Preferencias:</strong> recuerdan configuraciones no esenciales (requieren tu consentimiento).</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">3. Cookies necesarias</h2>
            <p>
              Necesarias para funciones esenciales como autenticación, seguridad y
              funcionamiento básico de la plataforma, incluyendo la sesión de Supabase.
              Siempre están activas y no se pueden desactivar desde el panel de
              preferencias, ya que sin ellas LegalUp no puede funcionar.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">4. Analítica</h2>
            <p>
              Solo se activan si aceptas las cookies analíticas en el banner o en las
              preferencias. Incluyen Google Analytics (métricas de navegación) y PostHog
              (analítica de producto), además de nuestro registro propio de páginas
              visitadas.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">5. Marketing</h2>
            <p>
              Solo se activan si aceptas las cookies de marketing. Incluyen TikTok Pixel
              (medición publicitaria). No se encontró ningún otro pixel publicitario en
              el navegador.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">6. Preferencias</h2>
            <p>
              Permiten recordar ciertas configuraciones no esenciales de la experiencia,
              como tu decisión de consentimiento de cookies (clave{' '}
              <code className="text-sm">legalup_cookie_consent</code> en localStorage).
              Solo se usan con tu aceptación.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">7. Proveedores utilizados</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-semibold">Proveedor</th>
                    <th className="py-2 pr-4 font-semibold">Categoría</th>
                    <th className="py-2 pr-4 font-semibold">Finalidad</th>
                    <th className="py-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Supabase (sesión)</td>
                    <td className="py-2 pr-4">Necesaria</td>
                    <td className="py-2 pr-4">Autenticación y seguridad</td>
                    <td className="py-2">Siempre activa</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Google Analytics</td>
                    <td className="py-2 pr-4">Analítica</td>
                    <td className="py-2 pr-4">Métricas de navegación</td>
                    <td className="py-2">Requiere consentimiento</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">PostHog</td>
                    <td className="py-2 pr-4">Analítica</td>
                    <td className="py-2 pr-4">Analítica de producto</td>
                    <td className="py-2">Requiere consentimiento</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">TikTok Pixel</td>
                    <td className="py-2 pr-4">Marketing</td>
                    <td className="py-2 pr-4">Medición publicitaria</td>
                    <td className="py-2">Requiere consentimiento</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground">
              Nota: las confirmaciones de compra también se miden desde nuestros
              servidores (sin cookies del navegador) al procesar pagos reales. Esa
              medición operativa no depende de tu decisión de cookies del navegador.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">8. Cómo cambiar o retirar tu consentimiento</h2>
            <p>
              Puedes cambiar tu decisión en cualquier momento desde{' '}
              <button
                type="button"
                onClick={openCookiePreferences}
                className="text-green-900 underline hover:text-green-600"
              >
                Configurar cookies
              </button>{' '}
              (también disponible en el pie de página). Al revocar una categoría,
              detenemos su captura hacia adelante.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">9. Vigencia y actualizaciones</h2>
            <p>
              Tu decisión se conserva en tu navegador. Si actualizamos esta Política o
              cambiamos las categorías (nueva versión del consentimiento), es posible que
              te pidamos decidir nuevamente. La fecha de última actualización se muestra
              al inicio del documento.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">10. Contacto</h2>
            <p>Sitio web: <a href="https://legalup.cl" className="text-primary hover:underline">LegalUp.cl</a></p>
            <p>Correo: <a href="mailto:contacto@legalup.cl" className="text-green-900 hover:text-green-600 underline">contacto@legalup.cl</a></p>
            {/* TODO(legal): completar RUT, domicilio y correo legal de LegalUp SpA. */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CookiesPolicy;
