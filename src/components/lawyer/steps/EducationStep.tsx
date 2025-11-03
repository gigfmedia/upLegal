import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

interface EducationStepProps {
  formData: {
    education: string;
    languages: string;
    barNumber: string;
    rut: string;
    pjud_verified: boolean;
  };
  isVerifyingRut: boolean;
  rutError: string | null;
  onFormDataChange: (updates: any) => void;
  onVerifyRut: () => Promise<boolean>;
}

export default function EducationStep({ 
  formData, 
  isVerifyingRut, 
  rutError, 
  onFormDataChange,
  onVerifyRut 
}: EducationStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="education">Formación académica</Label>
        <Textarea
          id="education"
          value={formData.education}
          onChange={(e) => onFormDataChange({ education: e.target.value })}
          placeholder="Ej: Licenciado en Derecho, Universidad de Chile"
          rows={3}
        />
      </div>
      
      <div>
        <Label htmlFor="languages">Idiomas (separados por comas)</Label>
        <Input
          id="languages"
          value={formData.languages}
          onChange={(e) => onFormDataChange({ languages: e.target.value })}
          placeholder="Ej: Español, Inglés, Francés"
        />
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="barNumber">Número de colegiado</Label>
          <Input
            id="barNumber"
            value={formData.barNumber}
            onChange={(e) => onFormDataChange({ barNumber: e.target.value })}
            placeholder="Número de colegiado"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="rut">RUT</Label>
          <div className="flex gap-2">
            <Input
              id="rut"
              value={formData.rut}
              onChange={(e) => onFormDataChange({ 
                rut: e.target.value, 
                pjud_verified: false 
              })}
              placeholder="12.345.678-9"
              disabled={formData.pjud_verified}
              className={formData.pjud_verified ? 'pr-10' : ''}
            />
            <Button 
              type="button" 
              onClick={onVerifyRut}
              disabled={!formData.rut || formData.pjud_verified || isVerifyingRut}
              className="whitespace-nowrap"
              variant={formData.pjud_verified ? 'outline' : 'default'}
            >
              {isVerifyingRut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : formData.pjud_verified ? (
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                'Verificar'
              )}
            </Button>
          </div>
          {rutError && (
            <p className="text-sm text-red-500">{rutError}</p>
          )}
          {formData.pjud_verified && (
            <p className="text-sm text-green-600">RUT verificado correctamente</p>
          )}
        </div>
      </div>
    </div>
  );
}
