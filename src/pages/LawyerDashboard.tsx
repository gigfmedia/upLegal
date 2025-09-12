
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Navigate } from "react-router-dom";
import { 
  User, 
  DollarSign, 
  MapPin, 
  FileText, 
  Star, 
  Calendar,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  Clock
} from "lucide-react";

const LawyerDashboard = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    specialties: user?.profile?.specialties || [],
    hourlyRate: user?.profile?.hourly_rate_clp || 0,
    location: user?.profile?.location || '',
    bio: user?.profile?.bio || '',
  });
  const [newSpecialty, setNewSpecialty] = useState('');
  const [success, setSuccess] = useState('');

  if (!user || user.role !== 'lawyer') {
    return <Navigate to="/" replace />;
  }

  const specialtyOptions = [
    'Derecho Corporativo',
    'Defensa Penal',
    'Derecho Migratorio',
    'Derecho de Familia',
    'Accidentes y Lesiones',
    'Derecho Inmobiliario',
    'Derecho Laboral',
    'Propiedad Intelectual',
    'Derecho Tributario',
    'Derecho de Quiebras',
  ];

  const handleSave = async () => {
    try {
      await updateProfile({
        specialties: formData.specialties,
        hourly_rate_clp: formData.hourlyRate,
        location: formData.location,
        bio: formData.bio
      });
      setIsEditing(false);
      setSuccess('¡Perfil actualizado exitosamente!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const addSpecialty = () => {
    if (newSpecialty && !formData.specialties.includes(newSpecialty)) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty]
      }));
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  const handleAuthClick = () => {};

  // Mock stats data
  const stats = {
    totalClients: 24,
    monthlyEarnings: 8400,
    pendingRequests: 5,
    completedCases: 89,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAuthClick={handleAuthClick} />
      
      <div className="pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Panel de Abogado</h1>
            <p className="text-gray-600 mt-2">Administra tu perfil y hace seguimiento de tu práctica</p>
          </div>

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground">+3 del mes pasado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.monthlyEarnings.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+12% del mes pasado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Solicitudes Pendientes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingRequests}</div>
                <p className="text-xs text-muted-foreground">2 urgentes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Casos Completados</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedCases}</div>
                <p className="text-xs text-muted-foreground">95% tasa de éxito</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Management */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Perfil Profesional</CardTitle>
                      <CardDescription>
                        Actualiza tu información de perfil para atraer más clientes
                      </CardDescription>
                    </div>
                    <Button
                      variant={isEditing ? "outline" : "default"}
                      onClick={() => {
                        if (isEditing) {
                          setFormData({
                            specialties: user?.profile?.specialties || [],
                            hourlyRate: user?.profile?.hourly_rate_clp || 0,
                            location: user?.profile?.location || '',
                            bio: user?.profile?.bio || '',
                          });
                        }
                        setIsEditing(!isEditing);
                      }}
                    >
                      {isEditing ? 'Cancelar' : 'Editar Perfil'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">Tarifa por Hora (CLP)</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: Number(e.target.value) }))}
                        disabled={!isEditing}
                        placeholder="ej., 50000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Ubicación</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="ej., Santiago, Chile"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Especialidades Legales</Label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.specialties.map((specialty) => (
                        <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                          {specialty}
                          {isEditing && (
                            <button
                              onClick={() => removeSpecialty(specialty)}
                              className="ml-1 text-gray-500 hover:text-gray-700"
                            >
                              ×
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                    {isEditing && (
                      <div className="flex gap-2">
                        <Select value={newSpecialty} onValueChange={setNewSpecialty}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Agregar una especialidad" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {specialtyOptions.filter(s => !formData.specialties.includes(s)).map((specialty) => (
                              <SelectItem key={specialty} value={specialty}>
                                {specialty}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={addSpecialty} disabled={!newSpecialty}>
                          Agregar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Biografía Profesional</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Describe tu experiencia, expertise y lo que te hace único..."
                      className="min-h-[120px]"
                    />
                  </div>

                  {isEditing && (
                    <div className="flex gap-2">
                      <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                        Guardar Cambios
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="mr-2 h-4 w-4" />
                    Agendar Consulta
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Mensajes Clientes
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Crear Expediente
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estado del Perfil</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Progreso del Perfil</span>
                      <span className="text-sm font-medium">
                        {user.profile?.specialties?.length && user.profile?.hourly_rate_clp && user.profile?.location && user.profile?.bio ? '100%' : '75%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: user.profile?.specialties?.length && user.profile?.hourly_rate_clp && user.profile?.location && user.profile?.bio ? '100%' : '75%' 
                        }}
                      ></div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      {user.profile?.verified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="text-gray-600">
                        {user.profile?.verified ? 'Perfil Verificado' : 'Verificación Pendiente'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LawyerDashboard;
