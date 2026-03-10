import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfileAvatarUpload } from '@/components/ProfileAvatarUpload';

export interface PersonalInfoFormData {
  first_name: string;
  last_name: string;
  phone: string;
  location: string;
  avatar_url: string;
}

interface PersonalInfoStepProps {
  formData: PersonalInfoFormData;
  onFormDataChange: (updates: Partial<PersonalInfoFormData>) => void;
}

export default function PersonalInfoStep({ formData, onFormDataChange }: PersonalInfoStepProps) {

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <Label>Foto de perfil</Label>
        <ProfileAvatarUpload
          avatarUrl={formData.avatar_url}
          onUpload={(url) => onFormDataChange({ avatar_url: url })}
        />
        <p className="text-xs text-muted-foreground text-center">
          Sube una foto profesional (JPG, PNG, hasta 5 MB)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">Nombres</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => onFormDataChange({ first_name: e.target.value })}
            placeholder="Tu nombre"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name">Apellidos</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => onFormDataChange({ last_name: e.target.value })}
            placeholder="Tu apellido"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => onFormDataChange({ phone: e.target.value })}
          placeholder="+56 9 1234 5678"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Ciudad / Región</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => onFormDataChange({ location: e.target.value })}
          placeholder="Ej: Santiago, Región Metropolitana"
        />
      </div>

    </div>
  );
}
