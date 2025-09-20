import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Navigate, useLocation, useNavigate, Outlet } from "react-router-dom";
import { User, FileText, Briefcase, LayoutDashboard } from "lucide-react";

const LawyerDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Define tab types
  type TabType = 'profile' | 'services' | 'experience' | 'dashboard';
  
  // Set active tab based on URL
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // Update active tab when URL changes
  useEffect(() => {
    if (location.pathname.includes('profile')) {
      setActiveTab('profile');
    } else if (location.pathname.includes('services')) {
      setActiveTab('services');
    } else if (location.pathname.includes('experience')) {
      setActiveTab('experience');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);
  
  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    navigate(`/lawyer-dashboard/${tab === 'dashboard' ? '' : tab}`);
  };

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="flex space-x-2 border-b mb-6">
          <button
            className={`py-2 px-4 font-medium flex items-center ${activeTab === 'profile' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => handleTabChange('profile')}
          >
            <User className="h-4 w-4 mr-2" />
            Perfil
          </button>
          <button
            className={`py-2 px-4 font-medium flex items-center ${activeTab === 'services' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => handleTabChange('services')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Servicios
          </button>
          <button
            className={`py-2 px-4 font-medium flex items-center ${activeTab === 'experience' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => handleTabChange('experience')}
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Experiencia
          </button>
          <button
            className={`py-2 px-4 font-medium flex items-center ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => handleTabChange('dashboard')}
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Panel
          </button>
        </div>
        
        {/* Nested routes will be rendered here */}
        <Outlet />
      </div>
    </div>
  );
};

export default LawyerDashboard;
