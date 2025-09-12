
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { MessageProvider } from "@/contexts/MessageProvider";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import SearchResults from "./pages/SearchResults";
import LawyerDashboard from "./pages/LawyerDashboard";
import AttorneyDashboard from "./pages/AttorneyDashboard";
import PublicProfile from "./pages/PublicProfile";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import NotFound from "./pages/NotFound";
import UserDashboard from "./pages/UserDashboard";
import DashboardProfile from "./pages/DashboardProfile";
import DashboardSettings from "./pages/DashboardSettings";
import DashboardConsultations from './pages/DashboardConsultations';
import DashboardAppointments from './pages/DashboardAppointments';
import DashboardPayments from './pages/DashboardPayments';
import DashboardMessages from './pages/DashboardMessages';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import Footer from "./components/Footer";
import LegalAgent from "./components/LegalAgent";
import RequireLawyer from "@/components/auth/RequireLawyer";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const queryClient = new QueryClient();

const LoadingIndicator = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <Progress value={undefined} className="h-1 rounded-none" />
    </div>
  );
};

const AppContent = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TooltipProvider>
        <LoadingIndicator />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/lawyer-dashboard" element={<LawyerDashboard />} />
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
            
            {/* Dashboard routes with single layout wrapper */}
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
      <NotificationProvider>
        <MessageProvider>
          <BrowserRouter>
            <AppContent />
            <Toaster />
            <Sonner />
          </BrowserRouter>
        </MessageProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
