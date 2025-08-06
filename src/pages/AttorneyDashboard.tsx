import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Navigate, useNavigate } from "react-router-dom";
import { 
  User, 
  DollarSign, 
  Star, 
  TrendingUp,
  Clock,
  FileText,
  MessageSquare,
  Calendar,
  Eye,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Users,
  Briefcase,
} from "lucide-react";
import { ProfileOverview } from "@/components/dashboard/ProfileOverview";
import { EarningsStats } from "@/components/dashboard/EarningsStats";
import { ClientManagement } from "@/components/dashboard/ClientManagement";
import { ProjectPortfolio } from "@/components/dashboard/ProjectPortfolio";
import { ProfileCompletion } from "@/components/dashboard/ProfileCompletion";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { PublicProfileView } from "@/components/PublicProfileView";
import { PublicProfileTab } from "@/components/dashboard/PublicProfileTab";

const AttorneyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const handleTabNavigation = (tabValue: string) => {
    setActiveTab(tabValue);
  };

  if (!user || user.role !== 'lawyer') {
    return <Navigate to="/" replace />;
  }

  const handleAuthClick = () => {};

  // Mock data for dashboard
  const dashboardStats = {
    totalEarnings: 45250,
    monthlyEarnings: 8400,
    activeClients: 12,
    completedProjects: 89,
    profileViews: 1247,
    successRate: 95,
    responseTime: "< 2 hours",
    availability: "Disponible"
  };

  const recentActivity = [
    {
      type: "project_completed",
      client: "TechStart Inc.",
      amount: 2500,
      date: "2 hours ago",
      description: "Corporate formation consultation"
    },
    {
      type: "proposal_sent",
      client: "Sarah Wilson",
      date: "1 day ago",
      description: "Family law mediation services"
    },
    {
      type: "contract_signed",
      client: "GlobalTech Solutions",
      amount: 5000,
      date: "3 days ago",
      description: "Employment law advisory"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAuthClick={handleAuthClick} />
      
      <div className="pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4 mb-4 lg:mb-0">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="/placeholder.svg" alt={user.name} />
                  <AvatarFallback className="bg-blue-600 text-white text-xl">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                  <p className="text-gray-600">{user.profile?.specialties?.join(", ") || "Legal Professional"}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="text-sm text-gray-600">{user.profile?.rating || 4.8} ({user.profile?.reviews || 0} reseñas)</span>
                    </div>
                    <Badge variant={dashboardStats.availability === "Disponible" ? "default" : "secondary"}>
                      {dashboardStats.availability}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => navigate('/profile', { state: { user, stats: dashboardStats } })}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Perfil Público
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Mensajes
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ganancias Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${dashboardStats.totalEarnings.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+$8,400 este mes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.activeClients}</div>
                <p className="text-xs text-muted-foreground">+2 esta semana</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.successRate}%</div>
                <p className="text-xs text-muted-foreground">Sobre el promedio</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vistas del Perfil</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.profileViews}</div>
                <p className="text-xs text-muted-foreground">+156 esta semana</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="earnings">Ganancias</TabsTrigger>
              <TabsTrigger value="clients">Clientes</TabsTrigger>
              <TabsTrigger value="portfolio" data-tab="portfolio">Portafolio</TabsTrigger>
              <TabsTrigger value="profile">Perfil</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ProfileOverview 
                    user={user} 
                    stats={dashboardStats} 
                    recentActivity={recentActivity}
                  />
                </div>
                <div>
                  <ProfileCompletion user={user} onNavigateToTab={handleTabNavigation} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="earnings">
              <EarningsStats stats={dashboardStats} />
            </TabsContent>

            <TabsContent value="clients">
              <ClientManagement />
            </TabsContent>

            <TabsContent value="portfolio">
              <ProjectPortfolio />
            </TabsContent>

            <TabsContent value="profile">
              <ProfileSettings />
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </div>
  );
};

export default AttorneyDashboard;
