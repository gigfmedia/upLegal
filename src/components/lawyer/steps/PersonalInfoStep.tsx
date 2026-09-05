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
  /** Email shown read-only; captured at Register and not editable here */
  email?: string | null;
}

export default function PersonalInfoStep({ formData, onFormDataChange, email }: PersonalInfoStepProps) {
  const displayName = [formData.first_name, formData.last_name].filter(Boolean).join(' ') || '—';

  return (
    <div className="space-y-6">
      {/* Identidad ya registrada — solo lectura */}
      <div className="rounded-lg border bg-gray-50 px-4 py-3 space-y-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cuenta registrada</p>
        <p className="text-sm font-semibold text-gray-900">{displayName}</p>
        {email && <p className="text-sm text-gray-600">{email}</p>}
        <p className="text-xs text-gray-500">Nombre y correo ya registrados — no es necesario ingresarlos nuevamente.</p>
      </div>

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
