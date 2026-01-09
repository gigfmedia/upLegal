import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
const AdminDashboard = lazy(() => import('./pages/admin/analytics')); // Using analytics as dashboard for now
const AdminReviewsPage = lazy(() => import('./pages/admin/reviews'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/analytics'));
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
const BookingPage = lazy(() => import('./pages/BookingPage'));
const BookingSuccessPage = lazy(() => import('./pages/BookingSuccessPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Consulta = lazy(() => import('./pages/Consulta'));
const ConsultaDetalle = lazy(() => import('./pages/ConsultaDetalle'));
const ConsultaConfirmacion = lazy(() => import('./pages/ConsultaConfirmacion'));

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

const AppContent = () => {
  const { isLoading } = useAuth();
  
  // Track page views
  usePageTracking();
  
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

              {/* Consultation Routes */}
              <Route path="/consulta" element={<Consulta />} />
              <Route path="/consulta/detalle" element={<ConsultaDetalle />} />
              <Route path="/consulta/confirmacion" element={<ConsultaConfirmacion />} />

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

              <Route
                path="/admin"
                element={
                  <RequireAdmin>
                    <AdminDashboard />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/reviews"
                element={
                  <RequireAdmin>
                    <AdminReviewsPage />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <RequireAdmin>
                    <AdminAnalyticsPage />
                  </RequireAdmin>
                }
              />
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
              <Route path="/lawyer/:id" element={({ match }) => {
                // Extract just the ID part in case it's a full URL
                const id = match.params.id.split('-').pop();
                return <Navigate to={`/abogado/abogado-${id}`} replace />;
              }} />
              
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
            <AppContent />
          </MessageProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </>
);

export default App;
