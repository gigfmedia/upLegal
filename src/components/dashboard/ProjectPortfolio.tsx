import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus,
  Eye,
  Edit,
  Star,
  Calendar,
  DollarSign,
  Briefcase
} from "lucide-react";

export function ProjectPortfolio() {
  const [searchTerm, setSearchTerm] = useState("");

  const mockProjects = [
    {
      id: 1,
      title: "Corporate Formation & Compliance",
      client: "TechStart Inc.",
      category: "Corporate Law",
      description: "Complete corporate formation including bylaws, operating agreements, and regulatory compliance setup.",
      value: 15000,
      duration: "3 months",
      completedDate: "2024-11-15",
      rating: 5,
      testimonial: "Exceptional work on our corporate structure. Thorough and professional.",
      skills: ["Corporate Law", "Compliance", "Business Formation"],
      featured: true
    },
    {
      id: 2,
      title: "Employment Law Advisory",
      client: "GlobalTech Solutions",
      category: "Employment Law",
      description: "Comprehensive employment law review, policy development, and dispute resolution.",
      value: 22000,
      duration: "6 months",
      completedDate: "2024-10-20",
      rating: 4,
      testimonial: "Great expertise in employment matters. Helped us avoid several potential issues.",
      skills: ["Employment Law", "Policy Development", "Dispute Resolution"],
      featured: true
    },
    {
      id: 3,
      title: "Real Estate Transaction Review",
      client: "Metro Real Estate",
      category: "Real Estate Law",
      description: "Due diligence and contract review for commercial real estate acquisition.",
      value: 8500,
      duration: "1 month",
      completedDate: "2024-12-01",
      rating: 5,
      testimonial: "Meticulous attention to detail. Caught several issues that could have been costly.",
      skills: ["Real Estate Law", "Due Diligence", "Contract Review"],
      featured: false
    },
    {
      id: 4,
      title: "Family Law Mediation",
      client: "Sarah Wilson",
      category: "Family Law",
      description: "Divorce mediation and custody arrangement negotiations.",
      value: 3200,
      duration: "2 months",
      completedDate: "2024-09-30",
      rating: 5,
      testimonial: "Compassionate and professional during a difficult time. Highly recommend.",
      skills: ["Family Law", "Mediation", "Custody Law"],
      featured: false
    },
    {
      id: 5,
      title: "Intellectual Property Protection",
      client: "InnovateCorp",
      category: "IP Law",
      description: "Patent filing and trademark registration for tech startup.",
      value: 12000,
      duration: "4 months",
      completedDate: "2024-08-15",
      rating: 5,
      testimonial: "Secured our IP portfolio effectively. Great strategic advice.",
      skills: ["Patent Law", "Trademark", "IP Strategy"],
      featured: true
    }
  ];

  const filteredProjects = mockProjects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const featuredProjects = filteredProjects.filter(p => p.featured);
  const otherProjects = filteredProjects.filter(p => !p.featured);

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Proyectos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockProjects.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Proyectos Destacados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featuredProjects.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Valor del Portafolio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${mockProjects.reduce((sum, p) => sum + p.value, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Calificación Prom.</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {(mockProjects.reduce((sum, p) => sum + p.rating, 0) / mockProjects.length).toFixed(1)}
              <Star className="h-4 w-4 text-yellow-500 ml-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Portafolio de Proyectos</CardTitle>
              <CardDescription>Muestra tu mejor trabajo y gestiona tu portafolio</CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Proyecto
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar proyectos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Featured Projects */}
          {featuredProjects.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Star className="h-5 w-5 text-yellow-500 mr-2" />
                Proyectos Destacados
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {featuredProjects.map((project) => (
                  <Card key={project.id} className="border-2 border-yellow-200">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{project.title}</CardTitle>
                          <CardDescription>{project.client}</CardDescription>
                        </div>
                        <Badge variant="default">{project.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">{project.description}</p>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            ${project.value.toLocaleString()}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {project.duration}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < project.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-sm text-gray-600 ml-2">({project.rating}/5)</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {project.skills.map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                        
                        <blockquote className="text-sm italic text-gray-600 border-l-2 border-gray-200 pl-3">
                          "{project.testimonial}"
                        </blockquote>
                        
                        <div className="flex space-x-2 pt-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Other Projects */}
          {otherProjects.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Otros Proyectos
              </h3>
              <div className="space-y-4">
                {otherProjects.map((project) => (
                  <Card key={project.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{project.title}</h4>
                            <Badge variant="outline">{project.category}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{project.client}</p>
                          <p className="text-sm text-gray-700 mb-3">{project.description}</p>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              ${project.value.toLocaleString()}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {project.duration}
                            </span>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < project.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
