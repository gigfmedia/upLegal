import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const BlogIndex = lazy(() => import('../pages/blog/index'));
const BlogArticle = lazy(() => import('../pages/blog/me-subieron-el-arriendo-que-hago-2026'));
const FiniquitoArticle = lazy(() => import('../pages/blog/como-calcular-tu-finiquito-chile-2026'));
const DerechoFamiliaArticle = lazy(() => import('../pages/blog/derecho-de-familia-chile-2026'));
const DerechoPenalArticle = lazy(() => import('../pages/blog/derecho-penal-chile-2026'));
const DesalojoArticle = lazy(() => import('../pages/blog/me-quieren-desalojar-que-hago-chile-2026'));
const JuicioDesalojoArticle = lazy(() => import('../pages/blog/cuanto-demora-juicio-desalojo-chile-2026'));
const CerraduraArticle = lazy(() => import('../pages/blog/arrendador-puede-cambiar-cerradura-chile-2026'));
const OrdenDesalojoArticle = lazy(() => import('../pages/blog/orden-desalojo-chile-2026'));
const DespidoSinMotivoArticle = lazy(() => import('../pages/blog/me-pueden-despedir-sin-motivo-chile-2026'));
const LeyDevuelvemeMiCasaArticle = lazy(() => import('../pages/blog/ley-devuelveme-mi-casa-chile-2026'));
const DeudaPensionArticle = lazy(() => import('../pages/blog/deuda-pension-alimentos-chile-2026'));
const DerechoArrendamientoArticle = lazy(() => import('../pages/blog/derecho-arrendamiento-chile-guia-completa-2026'));
const ContratoArriendoArticle = lazy(() => import('../pages/blog/contrato-de-arriendo-chile-2026'));
const CuantosMesesArriendoArticle = lazy(() => import('../pages/blog/cuantos-meses-debo-arriendo-para-que-me-desalojen-chile-2026'));
const NoDevuelvenGarantiaArticle = lazy(() => import('../pages/blog/no-devuelven-garantia-arriendo-chile-2026'));
const MePuedenDemandarArriendoArticle = lazy(() => import('../pages/blog/me-pueden-demandar-por-no-pagar-el-arriendo-chile-2026'));
const QuePasaSinContratoArticle = lazy(() => import('../pages/blog/que-pasa-si-no-tengo-contrato-de-arriendo-chile-2026'));
const ReajusteArriendoArticle = lazy(() => import('../pages/blog/reajuste-arriendo-ipc-chile-2026'));
const TacitaReconduccionArticle = lazy(() => import('../pages/blog/tacita-reconduccion-chile-2026'));
const DicomArriendoArticle = lazy(() => import('../pages/blog/dicom-deuda-arriendo-chile-2026'));
const DespidoInjustificadoArticle = lazy(() => import('../pages/blog/despido-injustificado-chile-2026'));
const AnosServicioArticle = lazy(() => import('../pages/blog/cuanto-me-corresponde-anos-de-servicio-chile-2026'));
const ComoDesalojarPropiedadArticle = lazy(() => import('../pages/blog/como-desalojar-a-una-persona-de-mi-propiedad-chile-2026'));
const ComoDemandarDespidoArticle = lazy(() => import('../pages/blog/como-demandar-por-despido-injustificado-chile-2026'));
const CuantoDuraJuicioLaboralArticle = lazy(() => import('../pages/blog/cuanto-dura-juicio-laboral-despido-injustificado-chile-2026'));
const MePuedenDespedirLicenciaMedicaArticle = lazy(() => import('../pages/blog/me-pueden-despedir-con-licencia-medica-chile-2026'));
const ReservaDeDerechosArticle = lazy(() => import('../pages/blog/reserva-de-derechos-finiquito-chile-2026'));
const AutodespidoArticle = lazy(() => import('../pages/blog/autodespido-chile-2026'));

export const BlogRoutes = () => (
  <Suspense fallback={
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  }>
    <Routes>
      <Route index element={<BlogIndex />} />
      <Route path="me-subieron-el-arriendo-que-hago-2026" element={<BlogArticle />} />
      <Route path="como-calcular-tu-finiquito-chile-2026" element={<FiniquitoArticle />} />
      <Route path="derecho-de-familia-chile-2026" element={<DerechoFamiliaArticle />} />
      <Route path="derecho-penal-chile-2026" element={<DerechoPenalArticle />} />
      <Route path="me-quieren-desalojar-que-hago-chile-2026" element={<DesalojoArticle />} />
      <Route path="cuanto-demora-juicio-desalojo-chile-2026" element={<JuicioDesalojoArticle />} />
      <Route path="arrendador-puede-cambiar-cerradura-chile-2026" element={<CerraduraArticle />} />
      <Route path="orden-desalojo-chile-2026" element={<OrdenDesalojoArticle />} />
      <Route path="me-pueden-despedir-sin-motivo-chile-2026" element={<DespidoSinMotivoArticle />} />
      <Route path="ley-devuelveme-mi-casa-chile-2026" element={<LeyDevuelvemeMiCasaArticle />} />
      <Route path="deuda-pension-alimentos-chile-2026" element={<DeudaPensionArticle />} />
      <Route path="derecho-arrendamiento-chile-guia-completa-2026" element={<DerechoArrendamientoArticle />} />
      <Route path="contrato-de-arriendo-chile-2026" element={<ContratoArriendoArticle />} />
      <Route path="cuantos-meses-debo-arriendo-para-que-me-desalojen-chile-2026" element={<CuantosMesesArriendoArticle />} />
      <Route path="no-devuelven-garantia-arriendo-chile-2026" element={<NoDevuelvenGarantiaArticle />} />
      <Route path="me-pueden-demandar-por-no-pagar-el-arriendo-chile-2026" element={<MePuedenDemandarArriendoArticle />} />
      <Route path="que-pasa-si-no-tengo-contrato-de-arriendo-chile-2026" element={<QuePasaSinContratoArticle />} />
      <Route path="reajuste-arriendo-ipc-chile-2026" element={<ReajusteArriendoArticle />} />
      <Route path="tacita-reconduccion-chile-2026" element={<TacitaReconduccionArticle />} />
      <Route path="dicom-deuda-arriendo-chile-2026" element={<DicomArriendoArticle />} />
      <Route path="despido-injustificado-chile-2026" element={<DespidoInjustificadoArticle />} />
      <Route path="cuanto-me-corresponde-anos-de-servicio-chile-2026" element={<AnosServicioArticle />} />

      <Route path="como-desalojar-a-una-persona-de-mi-propiedad-chile-2026" element={<ComoDesalojarPropiedadArticle />} />
      <Route path="como-demandar-por-despido-injustificado-chile-2026" element={<ComoDemandarDespidoArticle />} />
      <Route path="cuanto-dura-juicio-laboral-despido-injustificado-chile-2026" element={<CuantoDuraJuicioLaboralArticle />} />
      <Route path="me-pueden-despedir-con-licencia-medica-chile-2026" element={<MePuedenDespedirLicenciaMedicaArticle />} />
      <Route path="reserva-de-derechos-finiquito-chile-2026" element={<ReservaDeDerechosArticle />} />
      <Route path="autodespido-chile-2026" element={<AutodespidoArticle />} />
    </Routes>
  </Suspense>
);

export default BlogRoutes;
