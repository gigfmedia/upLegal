
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  MessageSquare, 
  Calendar,
  MoreVertical,
  Star,
  Clock,
  CheckCircle
} from "lucide-react";

export function ClientManagement() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockClients = [
    {
      id: 1,
      name: "TechStart Inc.",
      email: "contact@techstart.com",
      avatar: "/placeholder.svg",
      status: "active",
      totalSpent: 15000,
      currentProject: "Corporate restructuring",
      rating: 5,
      lastContact: "2 hours ago",
      projectsCompleted: 3
    },
    {
      id: 2,
      name: "Sarah Wilson",
      email: "sarah.wilson@email.com",
      avatar: "",
      status: "active",
      totalSpent: 3200,
      currentProject: "Divorce proceedings",
      rating: 5,
      lastContact: "1 day ago",
      projectsCompleted: 1
    },
    {
      id: 3,
      name: "GlobalTech Solutions",
      email: "legal@globaltech.com",
      avatar: "/placeholder.svg",
      status: "completed",
      totalSpent: 22000,
      currentProject: null,
      rating: 4,
      lastContact: "1 week ago",
      projectsCompleted: 5
    },
    {
      id: 4,
      name: "Metro Real Estate",
      email: "info@metrore.com",
      avatar: "/placeholder.svg",
      status: "pending",
      totalSpent: 8500,
      currentProject: "Contract review",
      rating: 5,
      lastContact: "3 days ago",
      projectsCompleted: 2
    }
  ];

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'pending': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Client Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockClients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Proyectos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockClients.filter(c => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Calificación Prom.</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              4.8 <Star className="h-4 w-4 text-yellow-500 ml-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Retención de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
          </CardContent>
        </Card>
      </div>

      {/* Client Search and List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestión de Clientes</CardTitle>
              <CardDescription>Gestiona las relaciones con tus clientes y proyectos</CardDescription>
            </div>
            <Button>Agregar nuevo cliente</Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredClients.map((client) => (
              <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={client.avatar} alt={client.name} />
                    <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">{client.name}</h3>
                      <Badge variant={getStatusColor(client.status)}>
                        {getStatusIcon(client.status)}
                        <span className="ml-1">{client.status === 'active' ? 'activo' : client.status === 'completed' ? 'completado' : client.status === 'pending' ? 'pendiente' : client.status}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{client.email}</p>
                    {client.currentProject && (
                      <p className="text-sm text-blue-600">Actual: {client.currentProject}</p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm">
                      <p className="font-medium">${client.totalSpent.toLocaleString()}</p>
                      <p className="text-gray-600">{client.projectsCompleted} proyectos</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < client.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Último contacto: {client.lastContact}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
