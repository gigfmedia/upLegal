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
const RebajaPensionArticle = lazy(() => import('../pages/blog/rebaja-pension-alimentos-chile-2026'));
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
const DivorcioMutuoAcuerdoArticle = lazy(() => import('../pages/blog/divorcio-de-mutuo-acuerdo-chile-2026'));
const QuePasaSiNoFirmoFiniquitoArticle = lazy(() => import('../pages/blog/que-pasa-si-no-firmo-el-finiquito-chile-2026'));
const DesalojoFamiliarArticle = lazy(() => import('../pages/blog/como-desalojar-a-un-familiar-de-mi-casa-chile-2026'));
const AumentoPensionArticle = lazy(() => import('../pages/blog/aumento-pension-alimentos-chile-2026'));
const RegimenVisitaArticle = lazy(() => import('../pages/blog/regimen-de-visitas-chile-2026'));
const CuidadoPersonalArticle = lazy(() => import('../pages/blog/cuidado-personal-hijos-chile-2026'));
const MediacionFamiliarArticle = lazy(() => import('../pages/blog/mediacion-familiar-chile-2026'));
const DivorcioUnilateralArticle = lazy(() => import('../pages/blog/divorcio-unilateral-chile-2026'));
const CompensacionEconomicaArticle = lazy(() => import('../pages/blog/compensacion-economica-divorcio-chile-2026'));
import CeseConvivenciaArticle from '../pages/blog/cese-de-convivencia-chile-2026';
const LiquidacionSociedadConyugalArticle = lazy(() => import('../pages/blog/liquidacion-sociedad-conyugal-chile-2026'));
const AcuerdoCompletoYSuficienteArticle = lazy(() => import('../pages/blog/acuerdo-completo-y-suficiente-chile-2026'));
const LiquidacionBienesComunesArticle = lazy(() => import('../pages/blog/liquidacion-de-bienes-divorcio-chile-2026'));
const ViolenciaIntrafamiliarArticle = lazy(() => import('../pages/blog/violencia-intrafamiliar-chile-2026'));
const IncumplimientoRegimenVisitaArticle = lazy(() => import('../pages/blog/incumplimiento-regimen-visitas-chile-2026'));
const PensionAlimentosMayoresArticle = lazy(() => import('../pages/blog/pension-alimentos-mayores-18-chile-2026'));
const AutorizacionSalirPaisArticle = lazy(() => import('../pages/blog/autorizacion-salir-pais-menores-chile-2026'));
const ReconocimientoPaternidadArticle = lazy(() => import('../pages/blog/reconocimiento-paternidad-chile-2026'));
const ImpunacionPaternidadArticle = lazy(() => import('../pages/blog/impugnacion-paternidad-chile-2026'));
const ConstanciaPorAmenazasArticle = lazy(() => import('../pages/blog/constancia-por-amenazas-chile-2026'));
const EstafaArticle = lazy(() => import('../pages/blog/estafa-chile-2026'));



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
      <Route path="rebaja-pension-alimentos-chile-2026" element={<RebajaPensionArticle />} />
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
      <Route path="divorcio-de-mutuo-acuerdo-chile-2026" element={<DivorcioMutuoAcuerdoArticle />} />
      <Route path="que-pasa-si-no-firmo-el-finiquito-chile-2026" element={<QuePasaSiNoFirmoFiniquitoArticle />} />
      <Route path="como-desalojar-a-un-familiar-de-mi-casa-chile-2026" element={<DesalojoFamiliarArticle />} />
      <Route path="aumento-pension-alimentos-chile-2026" element={<AumentoPensionArticle />} />
      <Route path="regimen-de-visitas-chile-2026" element={<RegimenVisitaArticle />} />
      <Route path="cuidado-personal-hijos-chile-2026" element={<CuidadoPersonalArticle />} />
      <Route path="mediacion-familiar-chile-2026" element={<MediacionFamiliarArticle />} />
      <Route path="divorcio-unilateral-chile-2026" element={<DivorcioUnilateralArticle />} />
      <Route path="compensacion-economica-divorcio-chile-2026" element={<CompensacionEconomicaArticle />} />
      <Route path="cese-de-convivencia-chile-2026" element={<CeseConvivenciaArticle />} />
      <Route path="liquidacion-sociedad-conyugal-chile-2026" element={<LiquidacionSociedadConyugalArticle />} />
      <Route path="acuerdo-completo-y-suficiente-chile-2026" element={<AcuerdoCompletoYSuficienteArticle />} />
      <Route path="liquidacion-bienes-divorcio-chile-2026" element={<LiquidacionBienesComunesArticle />} />
      <Route path="violencia-intrafamiliar-chile-2026" element={<ViolenciaIntrafamiliarArticle />} />
      <Route path="incumplimiento-regimen-visitas-chile-2026" element={<IncumplimientoRegimenVisitaArticle />} />
      <Route path="pension-alimentos-mayores-18-chile-2026" element={<PensionAlimentosMayoresArticle />} />
      <Route path="autorizacion-salir-pais-menores-chile-2026" element={<AutorizacionSalirPaisArticle />} />
      <Route path="reconocimiento-paternidad-chile-2026" element={<ReconocimientoPaternidadArticle />} />
      <Route path="impugnacion-paternidad-chile-2026" element={<ImpunacionPaternidadArticle />} />
      <Route path="constancia-por-amenazas-en-chile-2026" element={<ConstanciaPorAmenazasArticle />} />
      <Route path="estafa-chile-2026" element={<EstafaArticle />} />

    </Routes>
  </Suspense>
);

export default BlogRoutes;
