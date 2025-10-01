import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type EducationSectionProps = {
  isEditing: boolean;
  education: string;
  university: string;
  studyStartYear?: string | number | null;
  studyEndYear?: string | number | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
};

export const EducationSection: React.FC<EducationSectionProps> = ({
  isEditing,
  education,
  university,
  studyStartYear,
  studyEndYear,
  onInputChange,
}) => {
  if (!isEditing) {
    return (
      <div className="space-y-2">
        <Label>Título Profesional</Label>
        <div className="p-2 border rounded-md bg-gray-50">
          <p className="text-sm">
            {education || 'No especificado'}
            {university && (
              <span className="block text-muted-foreground">
                {university}
              </span>
            )}
            {(studyStartYear || studyEndYear) && (
              <span className="block text-muted-foreground text-sm">
                {studyStartYear} - {studyEndYear || 'Presente'}
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="education">Título Profesional</Label>
        <Input
          id="education"
          name="education"
          value={education || ''}
          onChange={onInputChange}
          placeholder="Ej: Abogado, Licenciado en Derecho"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="university">Universidad</Label>
        <select
          id="university"
          name="university"
          value={university || ''}
          onChange={onInputChange}
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
        <div className="space-y-2">
          <Label htmlFor="study_start_year">Año de ingreso</Label>
          <Input
            id="study_start_year"
            name="study_start_year"
            type="number"
            min="1950"
            max={new Date().getFullYear()}
            value={studyStartYear || ''}
            onChange={onInputChange}
            placeholder="Año de inicio"
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="study_end_year">Año de egreso</Label>
          <Input
            id="study_end_year"
            name="study_end_year"
            type="number"
            min="1950"
            max={new Date().getFullYear() + 10}
            value={studyEndYear || ''}
            onChange={onInputChange}
            placeholder="Año de egreso"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};
