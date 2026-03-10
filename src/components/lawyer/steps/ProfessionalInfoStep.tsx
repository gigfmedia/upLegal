import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, X, Check } from 'lucide-react';

const SPECIALIZATIONS = [
  'Derecho Laboral', 'Derecho Civil', 'Derecho de Familia', 'Derecho Penal',
  'Derecho Comercial', 'Derecho Tributario', 'Derecho Inmobiliario',
  'Derecho de Propiedad Intelectual', 'Derecho Ambiental', 'Derecho Bancario',
  'Derecho de Consumidor', 'Derecho Migratorio', 'Derecho Internacional',
  'Derecho Constitucional', 'Derecho Administrativo', 'Derecho de Salud',
  'Derecho de Tecnología', 'Derecho Deportivo',
];

const LANGUAGES = ['Español', 'Inglés', 'Francés', 'Alemán', 'Portugués', 'Italiano', 'Chino', 'Japonés'];

export interface ProfessionalInfoFormData {
  bio: string;
  specialties: string[];
  experience_years: string;
  hourly_rate_clp: string;
  contact_fee_clp: string;
  languages: string[];
  education: string;
  university: string;
  study_start_year: string;
  study_end_year: string;
  certifications: string;
  bar_association_number: string;
  rut: string;
  pjud_verified: boolean;
}

interface ProfessionalInfoStepProps {
  formData: ProfessionalInfoFormData;
  onFormDataChange: (updates: Partial<ProfessionalInfoFormData>) => void;
  isVerifyingRut: boolean;
  rutError: string | null;
  onVerifyRut: () => Promise<boolean>;
}

export default function ProfessionalInfoStep({
  formData,
  onFormDataChange,
  isVerifyingRut,
  rutError,
  onVerifyRut,
}: ProfessionalInfoStepProps) {
  const toggleSpecialty = (spec: string) => {
    const current = formData.specialties || [];
    const updated = current.includes(spec)
      ? current.filter((s) => s !== spec)
      : [...current, spec];
    onFormDataChange({ specialties: updated });
  };

  const toggleLanguage = (lang: string) => {
    const current = formData.languages || [];
    const updated = current.includes(lang)
      ? current.filter((l) => l !== lang)
      : [...current, lang];
    onFormDataChange({ languages: updated });
  };

  return (
    <div className="space-y-6">
      {/* Bio */}
      <div className="space-y-1.5">
        <Label htmlFor="bio">Biografía profesional</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => onFormDataChange({ bio: e.target.value })}
          placeholder="Cuéntanos sobre tu experiencia y especialización…"
          rows={4}
        />
      </div>

      {/* Specialties */}
      <div className="space-y-2">
        <Label>Especialidades</Label>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.map((spec) => {
            const selected = (formData.specialties || []).includes(spec);
            return (
              <button
                key={spec}
                type="button"
                onClick={() => toggleSpecialty(spec)}
                className={`px-3 py-1.5 rounded-md text-sm border transition-colors flex items-center gap-1.5 ${
                  selected
                    ? 'bg-primary text-white border-black'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-accent'
                }`}
              >
                {spec}
                {selected && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Experience & Rates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="experience_years">Años de experiencia</Label>
          <Input
            id="experience_years"
            type="number"
            min="0"
            value={formData.experience_years}
            onChange={(e) => onFormDataChange({ experience_years: e.target.value })}
            placeholder="Ej: 5"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hourly_rate_clp">Tarifa por hora (CLP)</Label>
          <Input
            id="hourly_rate_clp"
            type="number"
            min="0"
            value={formData.hourly_rate_clp}
            onChange={(e) => onFormDataChange({ hourly_rate_clp: e.target.value })}
            placeholder="Ej: 25000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact_fee_clp">Tarifa consulta (CLP)</Label>
          <Input
            id="contact_fee_clp"
            type="number"
            min="0"
            value={formData.contact_fee_clp}
            onChange={(e) => onFormDataChange({ contact_fee_clp: e.target.value })}
            placeholder="Ej: 15000"
          />
        </div>
      </div>

      {/* Languages */}
      <div className="space-y-2">
        <Label>Idiomas</Label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => {
            const selected = (formData.languages || []).includes(lang);
            return (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  selected
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-accent'
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Education */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Formación académica</Label>
        <div className="space-y-1.5">
          <Label htmlFor="education">Título</Label>
          <Input
            id="education"
            value={formData.education}
            onChange={(e) => onFormDataChange({ education: e.target.value })}
            placeholder="Ej: Licenciado en Derecho"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="university">Universidad</Label>
          <select
            id="university"
            value={formData.university}
            onChange={(e) => onFormDataChange({ university: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Selecciona tu universidad</option>
            <option value="Universidad de Chile">Universidad de Chile</option>
            <option value="Pontificia Universidad Católica de Chile">Pontificia Universidad Católica de Chile</option>
            <option value="Universidad de Concepción">Universidad de Concepción</option>
            <option value="Universidad de Valparaíso">Universidad de Valparaíso</option>
            <option value="Universidad Católica de Valparaíso">Universidad Católica de Valparaíso</option>
            <option value="Universidad de Santiago de Chile">Universidad de Santiago de Chile</option>
            <option value="Universidad Diego Portales">Universidad Diego Portales</option>
            <option value="Universidad Adolfo Ibáñez">Universidad Adolfo Ibáñez</option>
            <option value="Universidad de Talca">Universidad de Talca</option>
            <option value="Universidad Austral de Chile">Universidad Austral de Chile</option>
            <option value="Universidad Católica del Norte">Universidad Católica del Norte</option>
            <option value="Universidad de La Frontera">Universidad de La Frontera</option>
            <option value="Universidad Católica de la Santísima Concepción">Universidad Católica de la Santísima Concepción</option>
            <option value="Universidad de Los Andes">Universidad de Los Andes</option>
            <option value="Universidad del Desarrollo">Universidad del Desarrollo</option>
            <option value="Universidad Finis Terrae">Universidad Finis Terrae</option>
            <option value="Universidad Andrés Bello">Universidad Andrés Bello</option>
            <option value="Universidad Alberto Hurtado">Universidad Alberto Hurtado</option>
            <option value="Universidad de Los Lagos">Universidad de Los Lagos</option>
            <option value="Universidad de Antofagasta">Universidad de Antofagasta</option>
            <option value="Otra universidad">Otra universidad (especificar en la biografía)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="study_start_year">Año inicio</Label>
            <Input
              id="study_start_year"
              type="number"
              value={formData.study_start_year}
              onChange={(e) => onFormDataChange({ study_start_year: e.target.value })}
              placeholder="Ej: 2010"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="study_end_year">Año término</Label>
            <Input
              id="study_end_year"
              type="number"
              value={formData.study_end_year}
              onChange={(e) => onFormDataChange({ study_end_year: e.target.value })}
              placeholder="Ej: 2015"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="certifications">Certificaciones / Cursos adicionales</Label>
          <Textarea
            id="certifications"
            value={formData.certifications}
            onChange={(e) => onFormDataChange({ certifications: e.target.value })}
            placeholder="Diplomado en Derecho Tributario, UC Chile…"
            rows={2}
          />
        </div>
      </div>

      {/* Bar & RUT */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Credenciales</Label>

        <div className="space-y-1.5">
          <Label htmlFor="rut">RUT (verificación PJUD)</Label>
          <div className="flex gap-2">
            <Input
              id="rut"
              value={formData.rut}
              onChange={(e) =>
                onFormDataChange({ rut: e.target.value, pjud_verified: false })
              }
              placeholder="12.345.678-9"
              disabled={formData.pjud_verified}
            />
            <Button
              type="button"
              onClick={onVerifyRut}
              disabled={!formData.rut || formData.pjud_verified || isVerifyingRut}
              variant={formData.pjud_verified ? 'outline' : 'default'}
              className="whitespace-nowrap"
            >
              {isVerifyingRut ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : formData.pjud_verified ? (
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              ) : null}
              {isVerifyingRut ? 'Verificando…' : formData.pjud_verified ? 'Verificado' : 'Verificar'}
            </Button>
          </div>
          {rutError && <p className="text-sm text-red-500">{rutError}</p>}
          {formData.pjud_verified && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> RUT verificado en el PJUD correctamente
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
