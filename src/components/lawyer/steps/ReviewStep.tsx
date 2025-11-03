import { CheckCircle, XCircle } from 'lucide-react';

interface ReviewStepProps {
  formData: {
    bio: string;
    specialties: string;
    hourlyRate: string;
    experienceYears: string;
    education: string;
    barNumber: string;
    languages: string;
    rut: string;
    pjud_verified: boolean;
  };
}

export default function ReviewStep({ formData }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium">Biografía profesional</h3>
        <p className="text-muted-foreground">{formData.bio || 'No proporcionada'}</p>
      </div>
      
      <div>
        <h3 className="font-medium">Especialidades</h3>
        <p className="text-muted-foreground">
          {formData.specialties ? 
            formData.specialties.split(',').map(s => s.trim()).filter(Boolean).join(', ') : 
            'No especificadas'}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium">Tarifa por hora</h3>
          <p className="text-muted-foreground">
            {formData.hourlyRate ? `$${parseInt(formData.hourlyRate).toLocaleString('es-CL')} CLP` : 'No especificada'}
          </p>
        </div>
        
        <div>
          <h3 className="font-medium">Años de experiencia</h3>
          <p className="text-muted-foreground">
            {formData.experienceYears || 'No especificados'}
          </p>
        </div>
      </div>
      
      <div>
        <h3 className="font-medium">Formación académica</h3>
        <p className="text-muted-foreground">{formData.education || 'No proporcionada'}</p>
      </div>
      
      <div>
        <h3 className="font-medium">Idiomas</h3>
        <p className="text-muted-foreground">
          {formData.languages ? 
            formData.languages.split(',').map(s => s.trim()).filter(Boolean).join(', ') : 
            'No especificados'}
        </p>
      </div>
      
      <div>
        <h3 className="font-medium">Número de colegiado</h3>
        <p className="text-muted-foreground">{formData.barNumber || 'No proporcionado'}</p>
      </div>
      
      <div>
        <h3 className="font-medium">RUT</h3>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground">{formData.rut || 'No proporcionado'}</p>
          {formData.pjud_verified ? (
            <span className="inline-flex items-center text-sm text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" /> Verificado
            </span>
          ) : (
            <span className="inline-flex items-center text-sm text-yellow-600">
              <XCircle className="h-4 w-4 mr-1" /> No verificado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
