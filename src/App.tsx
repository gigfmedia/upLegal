
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import SearchResults from "./pages/SearchResults";
import LawyerDashboard from "./pages/LawyerDashboard";
import AttorneyDashboard from "./pages/AttorneyDashboard";
import NotFound from "./pages/NotFound";

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
    <>
      <LoadingIndicator />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/lawyer-dashboard" element={<LawyerDashboard />} />
        <Route path="/attorney-dashboard" element={<AttorneyDashboard />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
