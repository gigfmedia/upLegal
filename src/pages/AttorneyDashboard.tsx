import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Navigate } from "react-router-dom";
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
  Linkedin
} from "lucide-react";
import { ProfileOverview } from "@/components/dashboard/ProfileOverview";
import { EarningsStats } from "@/components/dashboard/EarningsStats";
import { ClientManagement } from "@/components/dashboard/ClientManagement";
import { ProjectPortfolio } from "@/components/dashboard/ProjectPortfolio";
import { ProfileCompletion } from "@/components/dashboard/ProfileCompletion";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { PublicProfileView } from "@/components/PublicProfileView";
import { LinkedInIntegration } from "@/components/linkedin/LinkedInIntegration";
import { LinkedInProfileSync } from "@/components/linkedin/LinkedInProfileSync";

const AttorneyDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [showPublicProfile, setShowPublicProfile] = useState(false);

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
    availability: "Available"
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
                      <span className="text-sm text-gray-600">{user.profile?.rating || 4.8} ({user.profile?.reviews || 0} reviews)</span>
                    </div>
                    <Badge variant={dashboardStats.availability === "Available" ? "default" : "secondary"}>
                      {dashboardStats.availability}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => setShowPublicProfile(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Public Profile
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${dashboardStats.totalEarnings.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+$8,400 this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.activeClients}</div>
                <p className="text-xs text-muted-foreground">+2 this week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.successRate}%</div>
                <p className="text-xs text-muted-foreground">Above average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.profileViews}</div>
                <p className="text-xs text-muted-foreground">+156 this week</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="linkedin">
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </TabsTrigger>
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
                  <ProfileCompletion user={user} />
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

            <TabsContent value="linkedin" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LinkedInIntegration userId={user.id} />
                <LinkedInProfileSync />
              </div>
            </TabsContent>
          </Tabs>

          {/* Public Profile Modal */}
          <PublicProfileView 
            isOpen={showPublicProfile}
            onClose={() => setShowPublicProfile(false)}
            user={user}
            stats={dashboardStats}
          />
        </div>
      </div>
    </div>
  );
};

export default AttorneyDashboard;
