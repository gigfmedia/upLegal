import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import ScrollToTop from '@/components/ScrollToTop';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

// UI Components
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import LegalAgent from '@/components/LegalAgent';

// Context Providers
import { AuthProvider } from '@/contexts/AuthContext/clean/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { MessageProvider } from '@/contexts/MessageProvider';
import { NotificationProvider } from '@/contexts/NotificationContext';

// Layouts
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import RequireLawyer from '@/components/auth/RequireLawyer';
import Footer from '@/components/Footer';

// Pages
import Index from './pages/Index';
import SearchResults from './pages/SearchResults';
import LawyerDashboard from './pages/LawyerDashboard';
import LawyerDashboardPage from './pages/lawyer/DashboardPage';
import AttorneyDashboard from './pages/AttorneyDashboard';
import PublicProfile from './pages/PublicProfile';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailure from './pages/PaymentFailure';
import PaymentCanceled from './pages/PaymentCanceled';
import NotFound from './pages/NotFound';
import UserDashboard from './pages/UserDashboard';
import DashboardProfile from './pages/DashboardProfile';
import DashboardSettings from './pages/DashboardSettings';
import DashboardConsultations from './pages/DashboardConsultations';
import DashboardAppointments from './pages/DashboardAppointments';
import DashboardPayments from './pages/DashboardPayments';
import DashboardMessages from './pages/DashboardMessages';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import EmailVerification from './pages/auth/EmailVerification';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import ServicesPage from './pages/lawyer/ServicesPage';
import ConsultasPage from './pages/lawyer/ConsultasPage';
import CitasPage from './pages/lawyer/CitasPage';
import EarningsPage from './pages/lawyer/EarningsPage';
import ProfilePage from './pages/lawyer/ProfilePage';
import AboutPage from './pages/AboutPage';
import HowItWorksPage from './pages/HowItWorksPage';
import PaymentSettings from './pages/PaymentSettings';
import DashboardFavorites from './pages/DashboardFavorites';
import ContactPage from './pages/ContactPage';

// Create a single QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
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
    return () => clearTimeout(timer);
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

const AppContent = () => {
  const { user, isLoading } = useAuth();
  
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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contacto" element={<ContactPage />} />
            <Route path="/como-funciona" element={<HowItWorksPage />} />
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
            
            {/* Legacy route for backward compatibility */}
            <Route path="/lawyer-dashboard" element={<Navigate to="/lawyer/dashboard" replace />} />
            <Route path="/attorney-dashboard" element={<AttorneyDashboard />} />
            <Route path="/lawyer/:id" element={<PublicProfile />} />
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
            
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/auth/verify" element={<EmailVerification />} />
            <Route path="/auth/confirm-email" element={<EmailVerification />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </TooltipProvider>
    </div>
  );
};

const App = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
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
  </BrowserRouter>
);

export default App;
