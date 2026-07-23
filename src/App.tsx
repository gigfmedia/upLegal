import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate, useParams } from 'react-router-dom';
import ScrollToTop from '@/components/ScrollToTop';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { logError } from '@/utils/errorLogger';

// UI Components
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import RouteHandler from '@/components/RouteHandler';

// Context Providers
import { AuthProvider } from '@/contexts/AuthContext/clean/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import { supabase } from '@/lib/supabaseClient';

// Layouts (lazy load these as they're not needed for home page)
const DashboardLayout = lazy(() => import('@/components/dashboard/DashboardLayout'));
const RequireLawyer = lazy(() => import('@/components/auth/RequireLawyer'));
const RequireAdmin = lazy(() => import('@/components/auth/RequireAdmin'));
import Footer from '@/components/Footer';

// Pages
import Index from './pages/Index';

// LegalUp Empresas pages
const LegalUpEmpresas = lazy(() => import('./pages/LegalUpEmpresas'));
const CompanyRegister = lazy(() => import('./pages/empresa/CompanyRegister'));
const EmpresaLayout = lazy(() => import('./pages/empresa/EmpresaLayout'));
const DashboardHome = lazy(() => import('./pages/empresa/DashboardHome'));
const RequestsList = lazy(() => import('./pages/empresa/RequestsList'));
const NewRequest = lazy(() => import('./pages/empresa/NewRequest'));
const RequestDetail = lazy(() => import('./pages/empresa/RequestDetail'));
const Billing = lazy(() => import('./pages/empresa/Billing'));
const Settings = lazy(() => import('./pages/empresa/Settings'));
const LegalCenter = lazy(() => import('./pages/empresa/LegalCenter'));
const Budgets = lazy(() => import('./pages/empresa/Budgets'));
const Lawyers = lazy(() => import('./pages/empresa/Lawyers'));
const Services = lazy(() => import('./pages/empresa/Services'));
const ActivityLog = lazy(() => import('./pages/empresa/ActivityLog'));
const AdminEmpresasPage = lazy(() => import('./pages/admin/EmpresasPage'));
const AdminCompanyDetail = lazy(() => import('./pages/admin/CompanyDetail'));
const AdminRequestsAssignment = lazy(() => import('./pages/admin/RequestsAssignment'));
// const LawyerEmpresasRequests = lazy(() => import('./pages/lawyer/EmpresasRequestsPage'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const LawyerDashboard = lazy(() => import('./pages/LawyerDashboard'));
const LawyerDashboardPage = lazy(() => import('./pages/lawyer/DashboardPage'));
const AttorneyDashboard = lazy(() => import('./pages/AttorneyDashboard'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentFailure = lazy(() => import('./pages/PaymentFailure'));
const PaymentPending = lazy(() => import('./pages/PaymentPending'));
const PaymentCanceled = lazy(() => import('./pages/PaymentCanceled'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const DashboardProfile = lazy(() => import('./pages/DashboardProfile'));
const DashboardSettings = lazy(() => import('./pages/DashboardSettings'));
const DashboardConsultations = lazy(() => import('./pages/DashboardConsultations'));
const DashboardAppointments = lazy(() => import('./pages/DashboardAppointments'));
const DashboardPayments = lazy(() => import('./pages/DashboardPayments'));
const DashboardMessages = lazy(() => import('./pages/DashboardMessages'));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'));
// Admin pages
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminNotifications = lazy(() => import('./pages/admin/notifications'));
const AdminReviewsPage = lazy(() => import('./pages/admin/reviews'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/analytics'));
const LawyerProfilesPage = lazy(() => import('./pages/admin/lawyer-profiles'));
const TestAnalytics = lazy(() => import('./pages/TestAnalytics'));
const EmailVerification = lazy(() => import('./pages/auth/EmailVerification'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const ProfileSetupPage = lazy(() => import('./pages/ProfileSetupPage'));
const LawyerOnboardingPage = lazy(() => import('./pages/LawyerOnboardingPage'));
const ServicesPage = lazy(() => import('./pages/lawyer/ServicesPage'));
const ConsultasPage = lazy(() => import('./pages/lawyer/ConsultasPage'));
const CitasPage = lazy(() => import('./pages/lawyer/CitasPage'));
const EarningsPage = lazy(() => import('./pages/lawyer/EarningsPage'));
const ProfilePage = lazy(() => import('./pages/lawyer/ProfilePage'));
const JobsPage = lazy(() => import('./pages/lawyer/JobsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const PaymentSettings = lazy(() => import('./pages/PaymentSettings'));
const DashboardFavorites = lazy(() => import('./pages/DashboardFavorites'));
const DashboardServices = lazy(() => import('./pages/DashboardServices'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));
const AcceptInvite = lazy(() => import('./pages/auth/AcceptInvite'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const BookingSuccessPage = lazy(() => import('./pages/BookingSuccessPage'));
const CheckoutResume = lazy(() => import('./pages/CheckoutResume'));
const QuoteRequestsPage = lazy(() => import('./pages/lawyer/QuoteRequestsPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const LegalAgent = lazy(() => import('@/components/LegalAgent'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const CAELanding = lazy(() => import('./pages/CAELanding'));
const CategoryLanding = lazy(() => import('./pages/CategoryLanding'));
const LegalUpAI = lazy(() => import('./pages/LegalUpAI'));
const DivorcioUnilateralLanding = lazy(() => import('./pages/DivorcioUnilateralLanding'));
const PensionAlimentosLanding = lazy(() => import('./pages/PensionAlimentosLanding'));
const FiniquitoLanding = lazy(() => import('./pages/FiniquitoLanding'));
const DespidoInjustificadoLanding = lazy(() => import('./pages/DespidoInjustificadoLanding'));
const ArriendoLanding = lazy(() => import('./pages/ArriendoLanding'));
const PenalLanding = lazy(() => import('./pages/PenalLanding'));
const FamiliaLanding = lazy(() => import('./pages/FamiliaLanding'));

// Blog routes
const BlogRoutes = lazy(() => import('@/components/BlogRoutes'));

const CategoryRoutes = () => (
  <Routes>
    <Route path="/abogados-laborales" element={<CategoryLanding />} />
    <Route path="/abogados-divorcio" element={<CategoryLanding />} />
    <Route path="/abogados-arriendo" element={<CategoryLanding />} />
    <Route path="/abogados-penales" element={<CategoryLanding />} />
  </Routes>
);

// Create a single QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      onError: (error) => {
        logError({
          type: 'react_query_error',
          message: error instanceof Error ? error.message : 'Unknown React Query error',
          details: {
            error: error instanceof Error ? {
              name: error.name,
              stack: error.stack,
            } : error,
          },
        });
      },
    },
    mutations: {
      onError: (error) => {
        logError({
          type: 'react_mutation_error',
          message: error instanceof Error ? error.message : 'Unknown mutation error',
          details: {
            error: error instanceof Error ? {
              name: error.name,
              stack: error.stack,
            } : error,
          },
        });
      },
    },
  },
});

// Payment configuration will be added here in the future

const LoadingIndicator = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);

    // Setup global error handlers
    const cleanup = setupGlobalErrorHandlers();

    return () => {
      clearTimeout(timer);
      cleanup?.();
    };
  }, [location]);

  // Only show loading indicator if not in the middle of auth check
  if (isAuthLoading) return null;

  return (
    <>
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 h-1 z-50">
          <Progress value={0} className="h-1" />
        </div>
      )}
    </>
  );
};

// Global error handlers
const setupGlobalErrorHandlers = () => {
  // Handle uncaught errors
  const handleError = (error: ErrorEvent | string) => {
    const message = typeof error === 'string' ? error : error.message;

    // Check for "Failed to load module script" which often happens on stale chunks
    if (message?.includes('Failed to load module script') ||
      message?.includes('Expected a JavaScript-or-Wasm module script')) {
      console.warn('Stale chunk detected via error event, reloading...');
      window.location.reload();
      return;
    }

    logError({
      type: 'uncaught_error',
      message: message,
      details: typeof error === 'object' ? {
        filename: error.filename,
        lineno: error.lineno,
        colno: error.colno,
      } : {},
    });
  };

  // Handle unhandled promise rejections
  const handleRejection = (event: PromiseRejectionEvent) => {
    // If it's a chunk load error (stale JS after deploy), reload the page
    const msg = event.reason?.message || '';
    const isChunkError =
      msg.includes('Loading chunk') ||
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Failed to load module script') ||
      msg.includes('Expected a JavaScript-or-Wasm module script');

    if (isChunkError) {
      console.warn('Stale chunk detected via rejection, reloading...');
      window.location.reload();
      return;
    }

    logError({
      type: 'unhandled_rejection',
      message: msg || 'Unhandled promise rejection',
      details: {
        reason: event.reason,
      },
    });
  };

  const isPageBlank = () => {
    const root = document.getElementById('root');
    if (!root) return true;
    return root.innerHTML.trim() === '' || root.innerText.trim() === '';
  };

  // When the user comes back to the tab after a new deploy, stale chunks
  // will fail silently showing a white screen. This forces a reload.
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Check if any script requests fail; vite sets a well-known pattern
      // A lightweight check: if the page has been idle for > 30 min, reload.
      const lastActivity = Number(sessionStorage.getItem('_legalup_last_active') || Date.now());
      const idleMs = Date.now() - lastActivity;
      if (idleMs > 30 * 60 * 1000) {
        if (isPageBlank()) {
          console.warn('Stale idle session and blank page detected, reloading...');
          window.location.reload();
        }
      }
    } else {
      sessionStorage.setItem('_legalup_last_active', String(Date.now()));
    }
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

// Component to handle lawyer redirects
const LawyerRedirect = () => {
  const { id } = useParams();
  // Extract just the ID part in case it's a full URL
  const lawyerId = id?.split('-').pop();
  return <Navigate to={`/abogado/abogado-${lawyerId}`} replace />;
};

import { NotificationProvider } from '@/contexts/NotificationContext';
import { MessageProvider } from '@/contexts/MessageProvider';

const AppContent = () => {
  const { isLoading } = useAuth();
  const navigate = useNavigate();

  // Track page views
  usePageTracking();

  const hashHandledRef = useRef(false);

  useEffect(() => {
    const handleSupabaseHash = async () => {
      if (hashHandledRef.current) return;
      if (typeof window === 'undefined') return;

      console.log('[AuthHash] Current URL:', window.location.href);
      console.log('[AuthHash] Search:', window.location.search);
      console.log('[AuthHash] Hash:', window.location.hash);

      const rawHash = window.location.hash;
      const rawSearch = window.location.search;

      const hashParams = rawHash?.length > 1 ? new URLSearchParams(rawHash.slice(1)) : new URLSearchParams();
      const searchParams = rawSearch?.length > 0 ? new URLSearchParams(rawSearch) : new URLSearchParams();

      const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
      const type = hashParams.get('type') || searchParams.get('type');
      const emailParam = hashParams.get('email') || hashParams.get('user_email') || searchParams.get('email') || searchParams.get('user_email');

      console.log('[AuthHash] Parsed - type:', type, 'email:', emailParam, 'hasAccessToken:', !!accessToken, 'hasRefreshToken:', !!refreshToken);

      if (!accessToken && !refreshToken) {
        console.log('[AuthHash] No tokens found in hash or search params, checking existing session');
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[AuthHash] Session already exists, user:', session.user.email, 'role:', session.user.user_metadata?.role);
          if (type === 'invite' || hashParams.get('type') === 'invite' || searchParams.get('type') === 'invite') {
            const query = new URLSearchParams({ type: 'invite' });
            if (emailParam) query.set('email', emailParam);
            navigate(`/auth/accept-invite?${query.toString()}`);
            return;
          }
        }
        return;
      }

      hashHandledRef.current = true;

      try {
        if (accessToken && refreshToken) {
          console.log('[AuthHash] Setting session from tokens');
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            console.error('[AuthHash] Error estableciendo sesión:', setSessionError);
          } else {
            console.log('[AuthHash] Session set successfully');
          }
        } else if (accessToken) {
          const { data, error } = await supabase.auth.getSession();
          console.log('[AuthHash] getSession after token:', { session: !!data?.session, error });
        }
      } catch (error) {
        console.error('[AuthHash] Error processing Supabase session:', error);
      }

      const cleanUrl = window.location.pathname + (type || emailParam ? '' : window.location.search);
      window.history.replaceState(null, '', cleanUrl);

      if (type === 'invite') {
        console.log('[AuthHash] Invite detected, navigating to accept-invite');
        const query = new URLSearchParams({ type: 'invite' });
        if (emailParam) {
          query.set('email', emailParam);
        }
        navigate(`/auth/accept-invite?${query.toString()}`);
      } else if (type) {
        console.log('[AuthHash] Auth type detected:', type, 'navigating to callback');
        navigate('/auth/callback');
      } else {
        console.log('[AuthHash] No auth type, navigating to callback');
        navigate('/auth/callback');
      }
    };

    handleSupabaseHash();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <TooltipProvider>
        <ScrollToTop />
        <LoadingIndicator />
        <main className="flex-1">
          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>
          <Suspense fallback={null}>
            <LegalAgent />
          </Suspense>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
            </div>
          }>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contacto" element={<ContactPage />} />
              <Route path="/como-funciona" element={<HowItWorksPage />} />
              <Route path="/terminos" element={<TermsOfService />} />
              <Route path="/privacidad" element={<PrivacyPolicy />} />

              {/* Booking Routes */}
              <Route path="/booking/failure" element={<PaymentFailure />} />
              <Route path="/booking/pending" element={<PaymentPending />} />
              <Route path="/booking/success" element={<BookingSuccessPage />} />
              <Route path="/booking/:lawyerId" element={<BookingPage />} />
              <Route path="/checkout/:bookingId" element={<CheckoutResume />} />


              {/* Blog Routes */}
              <Route path="/blog/*" element={<BlogRoutes />} />

              {/* SEO Category Routes */}
              <Route path="/abogados-laborales" element={<CategoryLanding category="laboral" />} />
              <Route path="/abogados-divorcio" element={<CategoryLanding category="divorcio" />} />
              <Route path="/abogados-arriendo" element={<CategoryLanding category="arriendo" />} />
              <Route path="/abogados-penales" element={<CategoryLanding category="penal" />} />

              <Route path="/cae" element={<CAELanding />} />
              <Route path="/legalup-ai" element={<LegalUpAI />} />
              <Route path="/legalup-empresas" element={<LegalUpEmpresas />} />
              <Route path="/empresa/registro" element={<CompanyRegister />} />
              <Route path="/abogado-divorcio-unilateral" element={<DivorcioUnilateralLanding />} />
              <Route path="/abogado-pension-alimentos" element={<PensionAlimentosLanding />} />
              <Route path="/abogado-finiquito" element={<FiniquitoLanding />} />
              <Route path="/abogado-despido-injustificado" element={<DespidoInjustificadoLanding />} />
              <Route path="/abogado-arriendo" element={<ArriendoLanding />} />
              <Route path="/abogado-penal" element={<PenalLanding />} />
              <Route path="/abogado-familia" element={<FamiliaLanding />} />
              <Route path="/review" element={<ReviewPage />} />


              {/* New lawyer dashboard routes */}
              <Route path="/lawyer" element={
                <div data-role="lawyer">
                  <DashboardLayout />
                </div>
              }>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<LawyerDashboardPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="profile" element={<ProfilePage />} />
                {/* <Route path="consultas" element={<ConsultasPage />} /> */}
                <Route path="citas" element={<CitasPage />} />
                {/* <Route path="consultations" element={<Navigate to="/lawyer/consultas" replace />} /> */}
                <Route path="appointments" element={<Navigate to="/lawyer/citas" replace />} />
                <Route path="earnings" element={<EarningsPage />} />
                <Route path="favorites" element={<DashboardFavorites />} />
                <Route path="jobs" element={<JobsPage />} />
                {/* <Route path="empresas" element={<LawyerEmpresasRequests />} /> */}
              </Route>

              {/* Lawyer onboarding wizard — standalone, no sidebar */}
              <Route path="/lawyer/onboarding" element={<LawyerOnboardingPage />} />

              <Route path="/admin">
                <Route
                  index
                  element={
                    <RequireAdmin>
                      <AdminDashboard />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="dashboard"
                  element={
                    <RequireAdmin>
                      <Navigate to="/admin" replace />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="notifications"
                  element={
                    <RequireAdmin>
                      <AdminNotifications />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="reviews"
                  element={
                    <RequireAdmin>
                      <AdminReviewsPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <RequireAdmin>
                      <AdminAnalyticsPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="lawyer-profiles"
                  element={
                    <RequireAdmin>
                      <LawyerProfilesPage />
                    </RequireAdmin>
                  }
                />
              </Route>
              <Route path="/test-analytics" element={
                <TestAnalytics />
              } />

              {/* Legacy route for backward compatibility */}
              <Route path="/lawyer-dashboard" element={<Navigate to="/lawyer/dashboard" replace />} />
              <Route path="/attorney-dashboard" element={<AttorneyDashboard />} />
              {/* Main route for lawyer profiles */}
              <Route path="/abogado">
                {/* Route for SEO-friendly URLs: /abogado/name-lastname-uuid */}
                <Route
                  path=":slug"
                  element={<PublicProfile />}
                />

                {/* Catch-all route for /abogado/* that isn't a valid profile URL */}
                <Route
                  path="*"
                  element={
                    <RouteHandler>
                      <PublicProfile />
                    </RouteHandler>
                  }
                />
              </Route>

              {/* Legacy route for backward compatibility */}
              <Route path="/lawyer/:id" element={<LawyerRedirect />} />

              {/* 404 Not Found Page - must be last */}
              <Route path="*" element={<NotFound />} />
              <Route path="/profile" element={
                <RequireLawyer>
                  <PublicProfile />
                </RequireLawyer>
              } />
              {/* Company Dashboard Routes */}
              <Route path="/empresa" element={
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
                  </div>
                }>
                  <EmpresaLayout />
                </Suspense>
              }>
                <Route index element={<DashboardHome />} />
                <Route path="solicitudes" element={<RequestsList />} />
                <Route path="solicitudes/nueva" element={<NewRequest />} />
                <Route path="solicitudes/:id" element={<RequestDetail />} />
                <Route path="centro-legal" element={<LegalCenter />} />
                <Route path="presupuestos" element={<Budgets />} />
                <Route path="abogados" element={<Lawyers />} />
                <Route path="servicios" element={<Services />} />
                <Route path="auditoria" element={<ActivityLog />} />
                <Route path="facturacion" element={<Billing />} />
                <Route path="configuracion" element={<Settings />} />
              </Route>

              {/* Dashboard and Protected Routes wrapped in Suspense and Providers */}
              <Route path="/dashboard" element={
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
                  </div>
                }>
                  <NotificationProvider>
                    <MessageProvider>
                      <DashboardLayout />
                    </MessageProvider>
                  </NotificationProvider>
                </Suspense>
              }>
                <Route index element={<UserDashboard />} />
                <Route path="profile" element={<DashboardProfile />} />
                <Route path="profile/setup" element={<ProfileSetupPage />} />
                <Route path="settings" element={<DashboardSettings />} />
                <Route path="consultations" element={<DashboardConsultations />} />
                <Route path="appointments" element={<DashboardAppointments />} />
                <Route path="services" element={<DashboardServices />} />
                <Route path="payments" element={<DashboardPayments />} />
                <Route path="messages" element={<DashboardMessages />} />
                <Route path="favorites" element={<DashboardFavorites />} />
                <Route path="notifications" element={<NotificationSettingsPage />} />
                <Route path="payment-settings" element={<PaymentSettings />} />
              </Route>

              <Route path="/lawyer" element={
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
                  </div>
                }>
                  <NotificationProvider>
                    <MessageProvider>
                      <RequireLawyer>
                        <DashboardLayout />
                      </RequireLawyer>
                    </MessageProvider>
                  </NotificationProvider>
                </Suspense>
              }>
                <Route path="dashboard" element={<LawyerDashboardPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="consultas" element={<ConsultasPage />} />
                <Route path="citas" element={<CitasPage />} />
                <Route path="jobs" element={<JobsPage />} />
                <Route path="earnings" element={<EarningsPage />} />
                <Route path="favorites" element={<DashboardFavorites />} />
                <Route path="quotes/:quoteRequestId" element={<QuoteRequestsPage />} />
                {/* <Route path="empresas" element={<LawyerEmpresasRequests />} /> */}
              </Route>

              <Route path="/admin" element={
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
                  </div>
                }>
                  <NotificationProvider>
                    <MessageProvider>
                      <RequireAdmin>
                        <DashboardLayout />
                      </RequireAdmin>
                    </MessageProvider>
                  </NotificationProvider>
                </Suspense>
              }>
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="reviews" element={<AdminReviewsPage />} />
                <Route path="lawyer-profiles" element={<LawyerProfilesPage />} />
                <Route path="empresas" element={<AdminEmpresasPage />} />
                <Route path="empresas/:id" element={<AdminCompanyDetail />} />
                <Route path="solicitudes" element={<AdminRequestsAssignment />} />
              </Route>

              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failure" element={<PaymentFailure />} />
              <Route path="/payment-canceled" element={<PaymentCanceled />} />
              <Route path="/verify-email" element={<EmailVerification />} />
              <Route path="/auth/verify" element={<EmailVerification />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/accept-invite" element={<AcceptInvite />} />
              <Route path="/auth/confirm-email" element={<EmailVerification />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        {!location.pathname.startsWith('/empresa') && <Footer />}
      </TooltipProvider>
    </div>
  );
};

const GoogleAnalytics = lazy(() => import('@/components/GoogleAnalytics'));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
