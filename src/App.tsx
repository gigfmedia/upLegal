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
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
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
import ServicesPage from './pages/lawyer/ServicesPage';
import ConsultasPage from './pages/lawyer/ConsultasPage';
import CitasPage from './pages/lawyer/CitasPage';
import EarningsPage from './pages/lawyer/EarningsPage';
import ProfilePage from './pages/lawyer/ProfilePage';

const queryClient = new QueryClient();

const LoadingIndicator = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location]);

  if (!isLoading && !isAuthLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <Progress value={undefined} className="h-1 rounded-none" />
    </div>
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
            </Route>
            
            {/* Legacy route for backward compatibility */}
            <Route path="/lawyer-dashboard" element={<Navigate to="/lawyer/dashboard" replace />} />
            <Route path="/attorney-dashboard" element={<AttorneyDashboard />} />
            <Route 
              path="/lawyer/:id" 
              element={
                <PublicProfile 
                  userData={{
                    name: "John Smith",
                    profile: {
                      rating: 4.9,
                      reviews: 127,
                      specialties: ["Corporate Law", "Contract Law", "Business Litigation"],
                      hourlyRate: 350,
                      location: "New York, NY",
                      bio: "Experienced corporate attorney with over 10 years of experience helping businesses navigate complex legal challenges."
                    },
                    stats: {
                      profileViews: 1247
                    }
                  }}
                />
              } 
            />
            <Route path="/profile" element={
              <RequireLawyer>
                <PublicProfile />
              </RequireLawyer>
            } />
            
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<UserDashboard />} />
              <Route path="profile" element={<DashboardProfile />} />
              <Route path="settings" element={<DashboardSettings />} />
              <Route path="consultations" element={<DashboardConsultations />} />
              <Route path="appointments" element={<DashboardAppointments />} />
              <Route path="payments" element={<DashboardPayments />} />
              <Route path="messages" element={<DashboardMessages />} />
              <Route path="notifications" element={<NotificationSettingsPage />} />
            </Route>
            
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </TooltipProvider>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MessageProvider>
        <NotificationProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </NotificationProvider>
      </MessageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
