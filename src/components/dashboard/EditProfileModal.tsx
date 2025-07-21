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
import { User, Briefcase, X, Plus } from "lucide-react";

const basicInfoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
});

const attorneyProfileSchema = z.object({
  specialties: z.array(z.string()).min(1, "Please select at least one specialty"),
  hourlyRate: z.number().min(0, "Hourly rate must be positive"),
  experience: z.number().min(0, "Experience must be positive"),
  education: z.string().optional(),
  barNumber: z.string().optional(),
  languages: z.array(z.string()).optional(),
  availableForHire: z.boolean().default(true),
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
  "Corporate Law",
  "Family Law", 
  "Criminal Law",
  "Real Estate Law",
  "Employment Law",
  "Personal Injury",
  "Immigration Law",
  "Bankruptcy Law",
  "Tax Law",
  "Intellectual Property",
  "Estate Planning",
  "Contract Law"
];

const languages = [
  "English",
  "Spanish", 
  "French",
  "German",
  "Chinese",
  "Japanese",
  "Portuguese",
  "Russian",
  "Arabic",
  "Italian"
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

  const basicForm = useForm<BasicInfoData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.profile?.phone || "",
      location: user?.profile?.location || "",
      bio: user?.profile?.bio || "",
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
    },
  });

  const handleSpecialtyToggle = (specialty: string) => {
    const updated = selectedSpecialties.includes(specialty)
      ? selectedSpecialties.filter(s => s !== specialty)
      : [...selectedSpecialties, specialty];
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
    onSave({ type: "basic", data });
    toast({
      title: "Profile Updated",
      description: "Your basic information has been saved successfully.",
    });
  };

  const onAttorneySubmit = (data: AttorneyProfileData) => {
    onSave({ type: "attorney", data: { ...data, specialties: selectedSpecialties, languages: selectedLanguages } });
    toast({
      title: "Attorney Profile Updated", 
      description: "Your professional profile has been saved successfully.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and professional settings
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Basic Info
            </TabsTrigger>
            {user?.role === 'lawyer' && (
              <TabsTrigger value="attorney" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Attorney Profile
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="basic" className="mt-6">
            <Form {...basicForm}>
              <form onSubmit={basicForm.handleSubmit(onBasicSubmit)} className="space-y-6">
                {/* Profile Picture Section */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src="/placeholder.svg" alt={user?.name} />
                    <AvatarFallback className="bg-blue-600 text-white text-xl">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button type="button" variant="outline" size="sm">
                      Change Photo
                    </Button>
                    <p className="text-sm text-muted-foreground mt-1">
                      JPG, GIF or PNG. 2MB max.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={basicForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
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
                          <Input placeholder="Enter your email" {...field} />
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
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your phone number" {...field} />
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
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your location" {...field} />
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
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about yourself..."
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
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
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
                          <FormLabel>Hourly Rate ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter hourly rate"
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
                          <FormLabel>Years of Experience</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter years of experience"
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
                          <FormLabel>Education</FormLabel>
                          <FormControl>
                            <Input placeholder="Law school and degree" {...field} />
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
                          <FormLabel>Bar Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter bar number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Specialties */}
                  <div>
                    <FormLabel>Legal Specialties</FormLabel>
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
                      <p className="text-sm text-red-500 mt-1">Please select at least one specialty</p>
                    )}
                  </div>

                  {/* Languages */}
                  <div>
                    <FormLabel>Languages</FormLabel>
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
                          <FormLabel className="text-base">Available for hire</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Allow clients to contact you for new projects
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
                      Cancel
                    </Button>
                    <Button type="submit">Save Changes</Button>
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