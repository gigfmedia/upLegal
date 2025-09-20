import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { User, Briefcase, X, Plus, XCircle } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";

const basicInfoSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Por favor ingresa un email válido"),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
});

const attorneyProfileSchema = z.object({
  specialties: z.array(z.string()).min(1, "Por favor selecciona al menos una especialidad"),
  hourlyRate: z.number().min(0, "La tarifa por hora debe ser positiva"),
  experience: z.number().min(0, "La experiencia debe ser positiva"),
  education: z.string().optional(),
  barNumber: z.string().optional(),
  languages: z.array(z.string()).optional(),
  availableForHire: z.boolean().default(true),
  zoomLink: z.string().optional(),
});

type BasicInfoData = z.infer<typeof basicInfoSchema>;
type AttorneyProfileData = z.infer<typeof attorneyProfileSchema>;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSave: (data: any) => void;
}

const legalSpecialties = [
  "Derecho Corporativo",
  "Derecho de Familia", 
  "Derecho Penal",
  "Derecho Inmobiliario",
  "Derecho Laboral",
  "Lesiones Personales",
  "Derecho de Inmigración",
  "Derecho de Quiebras",
  "Derecho Tributario",
  "Propiedad Intelectual",
  "Planificación Patrimonial",
  "Derecho Contractual"
];

const languages = [
  "Inglés",
  "Español", 
  "Francés",
  "Alemán",
  "Chino",
  "Japonés",
  "Portugués",
  "Ruso",
  "Árabe",
  "Italiano"
];

export function EditProfileModal({ isOpen, onClose, user, onSave }: EditProfileModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    user?.profile?.specialties || []
  );
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    user?.profile?.languages || []
  );
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.profile?.avatarUrl || '');
  const [newSpecialty, setNewSpecialty] = useState('');

  const basicForm = useForm<BasicInfoData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.profile?.phone || "",
      location: user?.profile?.location || "",
      bio: user?.profile?.bio || "",
      avatarUrl: user?.profile?.avatarUrl || "",
    },
  });

  const attorneyForm = useForm<AttorneyProfileData>({
    resolver: zodResolver(attorneyProfileSchema),
    defaultValues: {
      specialties: user?.profile?.specialties || [],
      hourlyRate: user?.profile?.hourlyRate || 0,
      experience: user?.profile?.experience || 0,
      education: user?.profile?.education || "",
      barNumber: user?.profile?.barNumber || "",
      languages: user?.profile?.languages || [],
      availableForHire: user?.profile?.availableForHire ?? true,
      zoomLink: user?.profile?.zoomLink || "",
    },
  });

  const handleSpecialtyToggle = (specialty: string) => {
    const updated = selectedSpecialties.includes(specialty)
      ? selectedSpecialties.filter(s => s !== specialty)
      : [...selectedSpecialties, specialty];
    setSelectedSpecialties(updated);
    attorneyForm.setValue("specialties", updated);
  };

  const handleAddSpecialty = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSpecialty.trim() && !selectedSpecialties.includes(newSpecialty.trim())) {
      const updated = [...selectedSpecialties, newSpecialty.trim()];
      setSelectedSpecialties(updated);
      attorneyForm.setValue("specialties", updated);
      setNewSpecialty('');
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    const updated = selectedSpecialties.filter(s => s !== specialty);
    setSelectedSpecialties(updated);
    attorneyForm.setValue("specialties", updated);
  };

  const handleLanguageToggle = (language: string) => {
    const updated = selectedLanguages.includes(language)
      ? selectedLanguages.filter(l => l !== language)
      : [...selectedLanguages, language];
    setSelectedLanguages(updated);
    attorneyForm.setValue("languages", updated);
  };

  const onBasicSubmit = (data: BasicInfoData) => {
    const profileData = {
      display_name: data.name,
      phone: data.phone,
      location: data.location,
      bio: data.bio,
      avatar_url: avatarUrl
    };
    onSave({ type: "basic", data: profileData });
  };

  const onAttorneySubmit = (data: AttorneyProfileData) => {
    const profileData = {
      specialties: selectedSpecialties,
      hourly_rate_clp: data.hourlyRate,
      experience_years: data.experience,
      education: data.education,
      bar_number: data.barNumber,
      languages: selectedLanguages,
      available_for_hire: data.availableForHire,
      zoom_link: data.zoomLink
    };
    onSave({ type: "attorney", data: profileData });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Actualiza tu información de perfil y configuración profesional
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Información Básica
            </TabsTrigger>
            {user?.role === 'lawyer' && (
              <TabsTrigger value="attorney" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Perfil de Abogado
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="basic" className="mt-6">
            <Form {...basicForm}>
              <form onSubmit={basicForm.handleSubmit(onBasicSubmit)} className="space-y-6">
                {/* Profile Picture Section */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Foto de Perfil</label>
                  <FileUpload
                    onUpload={setAvatarUrl}
                    bucket="avatars"
                    userId={user?.id}
                    currentImageUrl={avatarUrl}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={basicForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ingresa tu nombre completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={basicForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Ingresa tu email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={basicForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="Ingresa tu número de teléfono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={basicForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ubicación</FormLabel>
                        <FormControl>
                          <Input placeholder="Ingresa tu ubicación" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={basicForm.control}
                  name="bio"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biografía</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Cuéntanos sobre ti..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar cambios</Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {user?.role === 'lawyer' && (
            <TabsContent value="attorney" className="mt-6">
              <Form {...attorneyForm}>
                <form onSubmit={attorneyForm.handleSubmit(onAttorneySubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={attorneyForm.control}
                      name="hourlyRate"
                      render={({ field }) => (
                         <FormItem>
                           <FormLabel>Tarifa por hora (CLP)</FormLabel>
                           <FormControl>
                             <Input
                               type="number"
                               placeholder="Ingresa tu tarifa por hora en CLP"
                               {...field}
                               onChange={(e) => field.onChange(Number(e.target.value))}
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                      )}
                    />

                    <FormField
                      control={attorneyForm.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Años de experiencia</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ingresa tus años de experiencia"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={attorneyForm.control}
                      name="education"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Educación</FormLabel>
                          <FormControl>
                            <Input placeholder="Universidad y título" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={attorneyForm.control}
                      name="barNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de colegiatura</FormLabel>
                          <FormControl>
                            <Input placeholder="Ingresa tu número de colegiatura" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={attorneyForm.control}
                    name="specialties"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especialidades</FormLabel>
                        
                        {/* Selected Specialties as Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {selectedSpecialties.map((specialty) => (
                            <Badge 
                              key={specialty} 
                              variant="secondary" 
                              className="flex items-center gap-1 px-3 py-1 text-sm"
                            >
                              {specialty}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleRemoveSpecialty(specialty);
                                }}
                                className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>

                        {/* Add New Specialty */}
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Agregar especialidad"
                            value={newSpecialty}
                            onChange={(e) => setNewSpecialty(e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            type="button" 
                            variant="outline"
                            size="sm"
                            onClick={handleAddSpecialty}
                            disabled={!newSpecialty.trim()}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar
                          </Button>
                        </div>

                        {/* Common Specialties Suggestions */}
                        <div className="mt-3">
                          <p className="text-sm text-muted-foreground mb-2">Sugerencias:</p>
                          <div className="flex flex-wrap gap-2">
                            {legalSpecialties
                              .filter(s => !selectedSpecialties.includes(s))
                              .map((specialty) => (
                                <Badge 
                                  key={specialty}
                                  variant="outline"
                                  className="cursor-pointer hover:bg-gray-100"
                                  onClick={() => handleSpecialtyToggle(specialty)}
                                >
                                  {specialty}
                                </Badge>
                              ))
                            }
                          </div>
                        </div>
                        
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={attorneyForm.control}
                    name="zoomLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Enlace personal de Zoom</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://us04web.zoom.us/j/123456789?pwd=..." 
                            {...field} 
                          />
                        </FormControl>
                        <div className="text-sm text-muted-foreground">
                          Configura tu enlace personal de Zoom para las videollamadas con clientes
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                   {/* Verification Documents */}
                   <div>
                     <FormLabel>Documentos de Validación</FormLabel>
                     <div className="mt-2 space-y-2">
                       <div className="text-sm text-muted-foreground mb-2">
                         Sube tus documentos profesionales para verificar tu identidad como abogado
                       </div>
                       <FileUpload
                         onUpload={(url) => {
                           const currentDocs = user?.profile?.verification_documents || [];
                           const newDocs = [...currentDocs, { 
                             name: 'Documento de validación', 
                             url, 
                             uploadedAt: new Date().toISOString() 
                           }];
                           onSave({ 
                             type: "attorney", 
                             data: { verification_documents: newDocs } 
                           });
                         }}
                         bucket="documents"
                         userId={user?.id}
                         accept="image/*,.pdf,.doc,.docx"
                         maxSize={10 * 1024 * 1024} // 10MB
                       />
                       {user?.profile?.verification_documents?.length > 0 && (
                         <div className="mt-3">
                           <p className="text-sm font-medium mb-2">Documentos subidos:</p>
                           <div className="space-y-1">
                             {user.profile.verification_documents.map((doc: any, index: number) => (
                               <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                 <span>{doc.name}</span>
                                 <Button
                                   type="button"
                                   variant="outline"
                                   size="sm"
                                   onClick={() => {
                                     const updatedDocs = user.profile.verification_documents.filter((_: any, i: number) => i !== index);
                                     onSave({ 
                                       type: "attorney", 
                                       data: { verification_documents: updatedDocs } 
                                     });
                                   }}
                                 >
                                   <X className="h-3 w-3" />
                                 </Button>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                   </div>

                  {/* Specialties */}
                  <div>
                    <FormLabel>Especialidades Legales</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {legalSpecialties.map((specialty) => (
                        <Badge
                          key={specialty}
                          variant={selectedSpecialties.includes(specialty) ? "default" : "outline"}
                          className="cursor-pointer justify-center py-2"
                          onClick={() => handleSpecialtyToggle(specialty)}
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                    {selectedSpecialties.length === 0 && (
                      <p className="text-sm text-red-500 mt-1">Por favor selecciona al menos una especialidad</p>
                    )}
                  </div>

                  {/* Languages */}
                  <div>
                    <FormLabel>Idiomas</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      {languages.map((language) => (
                        <Badge
                          key={language}
                          variant={selectedLanguages.includes(language) ? "default" : "outline"}
                          className="cursor-pointer justify-center py-2"
                          onClick={() => handleLanguageToggle(language)}
                        >
                          {language}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <FormField
                    control={attorneyForm.control}
                    name="availableForHire"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Disponible para contratación</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Permite que los clientes te contacten para nuevos proyectos
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancelar
                    </Button>
                    <Button type="submit">Guardar cambios</Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
