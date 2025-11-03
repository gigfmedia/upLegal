import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProfessionalInfoStepProps {
  formData: {
    bio: string;
    specialties: string;
    hourlyRate: string;
    experienceYears: string;
  };
  onFormDataChange: (updates: {
    bio?: string;
    specialties?: string;
    hourlyRate?: string;
    experienceYears?: string;
  }) => void;
}

export default function ProfessionalInfoStep({ 
  formData, 
  onFormDataChange 
}: ProfessionalInfoStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="bio">Biografía profesional</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => onFormDataChange({ bio: e.target.value })}
          placeholder="Cuéntanos sobre tu experiencia y especialización"
          rows={4}
        />
      </div>
      
      <div>
        <Label htmlFor="specialties">Especialidades (separadas por comas)</Label>
        <Input
          id="specialties"
          value={formData.specialties}
          onChange={(e) => onFormDataChange({ specialties: e.target.value })}
          placeholder="Ej: Derecho Laboral, Derecho Civil, Familia"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hourlyRate">Tarifa por hora (CLP)</Label>
          <Input
            id="hourlyRate"
            type="number"
            value={formData.hourlyRate}
            onChange={(e) => onFormDataChange({ hourlyRate: e.target.value })}
            placeholder="Ej: 25000"
          />
        </div>
        
        <div>
          <Label htmlFor="experienceYears">Años de experiencia</Label>
          <Input
            id="experienceYears"
            type="number"
            value={formData.experienceYears}
            onChange={(e) => onFormDataChange({ experienceYears: e.target.value })}
            placeholder="Ej: 5"
          />
        </div>
      </div>
    </div>
  );
}
