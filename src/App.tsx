import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate, useParams } from 'react-router-dom';
import ScrollToTop from '@/components/ScrollToTop';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { EmailTestComponent } from '@/components/EmailTestComponent';
import ErrorBoundary from '@/components/ErrorBoundary';
import { logError } from '@/utils/errorLogger';

// UI Components
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import LegalAgent from '@/components/LegalAgent';
import RouteHandler from '@/components/RouteHandler';

// Context Providers
import { AuthProvider } from '@/contexts/AuthContext/clean/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { MessageProvider } from '@/contexts/MessageProvider';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import { supabase } from '@/lib/supabaseClient';

// Layouts (keep these eager as they're used frequently)
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import RequireLawyer from '@/components/auth/RequireLawyer';
import RequireAdmin from '@/components/auth/RequireAdmin';
import Footer from '@/components/Footer';

// Lazy load all pages for code splitting
const Index = lazy(() => import('./pages/Index'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const LawyerDashboard = lazy(() => import('./pages/LawyerDashboard'));
const LawyerDashboardPage = lazy(() => import('./pages/lawyer/DashboardPage'));
const AttorneyDashboard = lazy(() => import('./pages/AttorneyDashboard'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentFailure = lazy(() => import('./pages/PaymentFailure'));
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
const ServicesPage = lazy(() => import('./pages/lawyer/ServicesPage'));
const ConsultasPage = lazy(() => import('./pages/lawyer/ConsultasPage'));
const CitasPage = lazy(() => import('./pages/lawyer/CitasPage'));
const EarningsPage = lazy(() => import('./pages/lawyer/EarningsPage'));
const ProfilePage = lazy(() => import('./pages/lawyer/ProfilePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const AsesoriaLegalOnlinePage = lazy(() => import('./pages/AsesoriaLegalOnline'));
const PaymentSettings = lazy(() => import('./pages/PaymentSettings'));
const DashboardFavorites = lazy(() => import('./pages/DashboardFavorites'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));
const AcceptInvite = lazy(() => import('./pages/auth/AcceptInvite'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const BookingSuccessPage = lazy(() => import('./pages/BookingSuccessPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Consulta = lazy(() => import('./pages/Consulta'));
const ConsultaDetalle = lazy(() => import('./pages/ConsultaDetalle'));
const ConsultaConfirmacion = lazy(() => import('./pages/ConsultaConfirmacion'));
// Blog pages
const BlogIndex = lazy(() => import('./pages/blog/index'));
const BlogArticle = lazy(() => import('./pages/blog/me-subieron-el-arriendo-que-hago-2026'));
const FiniquitoArticle = lazy(() => import('./pages/blog/como-calcular-tu-finiquito-chile-2026'));
const DerechoFamiliaArticle = lazy(() => import('./pages/blog/derecho-de-familia-chile-2026'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));

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
  const handleError = (event: ErrorEvent) => {
    logError({
      type: 'uncaught_error',
      message: event.message,
      details: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  };

  // Handle unhandled promise rejections
  const handleRejection = (event: PromiseRejectionEvent) => {
    logError({
      type: 'unhandled_rejection',
      message: event.reason?.message || 'Unhandled promise rejection',
      details: {
        reason: event.reason,
      },
    });
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
};

// Component to handle lawyer redirects
const LawyerRedirect = () => {
  const { id } = useParams();
  // Extract just the ID part in case it's a full URL
  const lawyerId = id?.split('-').pop();
  return <Navigate to={`/abogado/abogado-${lawyerId}`} replace />;
};

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

      const rawHash = window.location.hash;
      if (!rawHash || rawHash.length <= 1 || !rawHash.includes('access_token')) {
        return;
      }

      const params = new URLSearchParams(rawHash.slice(1));
      const type = params.get('type');
      const emailParam = params.get('email') || params.get('user_email');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      hashHandledRef.current = true;

      try {
        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            console.error('Error estableciendo la sesión desde la invitación:', setSessionError);
          }
        } else {
          await supabase.auth.getSession();
        }
      } catch (error) {
        console.error('Error processing Supabase session from hash:', error);
      }

      const cleanUrl = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', cleanUrl);

      if (type === 'invite') {
        const query = new URLSearchParams({ type: 'invite' });
        if (emailParam) {
          query.set('email', emailParam);
        }
        navigate(`/auth/accept-invite?${query.toString()}`);
      } else {
        navigate('/auth/callback');
      }
    };

    handleSupabaseHash();
  }, [navigate]);
  
  // Only show loading state for the initial auth check
  const [initialAuthCheck, setInitialAuthCheck] = useState(true);
  
  useEffect(() => {
    if (!isLoading) {
      setInitialAuthCheck(false);
    }
  }, [isLoading]);
  
  if (initialAuthCheck) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <TooltipProvider>
        <ScrollToTop />
        <LoadingIndicator />
        <main className="flex-1">
          <LegalAgent />
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contacto" element={<ContactPage />} />
              <Route path="/como-funciona" element={<HowItWorksPage />} />
              <Route path="/asesoria-legal-online" element={<AsesoriaLegalOnlinePage />} />
              <Route path="/terminos" element={<TermsOfService />} />
              <Route path="/privacidad" element={<PrivacyPolicy />} />
              
              {/* Booking Routes */}
              <Route path="/booking/:lawyerId" element={<BookingPage />} />
              <Route path="/booking/success" element={<BookingSuccessPage />} />

              {/* Consultation Routes - Temporarily disabled */}
              <Route path="/consulta" element={<Consulta />} />
              <Route path="/consulta/detalle" element={<ConsultaDetalle />} />
              <Route path="/consulta/confirmacion" element={<ConsultaConfirmacion />} />
              
              {/* Blog Routes */}
              <Route path="/blog" element={<BlogIndex />} />
              <Route path="/blog/me-subieron-el-arriendo-que-hago-2026" element={<BlogArticle />} />
              <Route path="/blog/como-calcular-tu-finiquito-chile-2026" element={<FiniquitoArticle />} />
              <Route path="/blog/derecho-de-familia-chile-2026" element={<DerechoFamiliaArticle />} />
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
                <Route path="consultas" element={<ConsultasPage />} />
                <Route path="citas" element={<CitasPage />} />
                <Route path="consultations" element={<Navigate to="/lawyer/consultas" replace />} />
                <Route path="appointments" element={<Navigate to="/lawyer/citas" replace />} />
                <Route path="earnings" element={<EarningsPage />} />
                <Route path="favorites" element={<DashboardFavorites />} />
              </Route>

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
              
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<UserDashboard />} />
                <Route path="profile" element={<DashboardProfile />} />
                <Route path="profile/setup" element={
                  <RequireLawyer>
                    <ProfileSetupPage />
                  </RequireLawyer>
                } />
                <Route path="settings" element={<DashboardSettings />} />
                <Route path="consultations" element={<DashboardConsultations />} />
                <Route path="appointments" element={<DashboardAppointments />} />
                <Route path="payments" element={<DashboardPayments />} />
                <Route path="payment-settings" element={<PaymentSettings />} />
                <Route path="messages" element={<DashboardMessages />} />
                <Route path="favorites" element={<DashboardFavorites />} />
                <Route path="notifications" element={<NotificationSettingsPage />} />
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
              <Route path="test-email" element={
            <div className="container mx-auto p-4">
              <h1 className="text-2xl font-bold mb-4">Prueba de Envío de Correo</h1>
              <EmailTestComponent />
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
          </Suspense>
        </main>
        <Footer />
      </TooltipProvider>
    </div>
  );
};

import GoogleAnalytics from '@/components/GoogleAnalytics';

const App = () => (
  <>
    <GoogleAnalytics />
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <MessageProvider>
            <Toaster />
            <Sonner />
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </MessageProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </>
);

export default App;
