import { useEffect, useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import posthog from 'posthog-js';
import { useUpdateAIWorkspace, type AIWorkspace } from '@/hooks/useAIWorkspaces';

const PRACTICE_AREAS = [
  'Civil',
  'Laboral',
  'Familia',
  'Comercial',
  'Tributario',
  'Penal',
  'Administrativo',
  'Inmobiliario',
  'Consumidor',
  'Otro',
] as const;

type EditCaseModalProps = {
  caseToEdit: AIWorkspace | null;
  onOpenChange: (open: boolean) => void;
};

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

export function EditCaseModal({ caseToEdit, onOpenChange }: EditCaseModalProps) {
  const updateCase = useUpdateAIWorkspace();

  const [name, setName] = useState('');
  const [practiceArea, setPracticeArea] = useState<string>('');
  const [description, setDescription] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sincroniza el formulario cada vez que se abre con un caso distinto.
  useEffect(() => {
    if (caseToEdit) {
      setName(caseToEdit.name);
      setPracticeArea(caseToEdit.practice_area || '');
      setDescription(caseToEdit.description || '');
      setFieldError(null);
      setSubmitting(false);
    }
  }, [caseToEdit]);

  const open = caseToEdit !== null;

  const validate = (): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      setFieldError('El nombre del caso es obligatorio.');
      return false;
    }
    if (trimmed.length < 3) {
      setFieldError('El nombre debe tener al menos 3 caracteres.');
      return false;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setFieldError(`El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres.`);
      return false;
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setFieldError(`La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres.`);
      return false;
    }
    setFieldError(null);
    return true;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!caseToEdit) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const updated = await updateCase.mutateAsync({
        id: caseToEdit.id,
        name: name.trim(),
        practice_area: practiceArea || undefined,
        description: description || undefined,
      });

      toast.success('Caso actualizado', {
        description: `"${updated.name}" se guardó correctamente.`,
      });

      posthog.capture('ai_workspace_case_updated', {
        practice_area: practiceArea || null,
        source: 'ai_workspace',
      });

      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el caso.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) {
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar caso</DialogTitle>
          <DialogDescription>
            Actualiza el título, el área jurídica o la descripción del caso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-case-edit-name">
              Nombre del caso <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ai-case-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Despido Juan Pérez"
              maxLength={MAX_NAME_LENGTH}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? 'ai-case-edit-error' : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-case-edit-practice-area">Área jurídica</Label>
            <Select value={practiceArea || undefined} onValueChange={setPracticeArea}>
              <SelectTrigger id="ai-case-edit-practice-area" className="w-full">
                <SelectValue placeholder="Selecciona un área (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {PRACTICE_AREAS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-case-edit-description">Descripción</Label>
            <Textarea
              id="ai-case-edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Antecedentes del caso (opcional)"
              rows={4}
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
          </div>

          {fieldError && (
            <p
              id="ai-case-edit-error"
              role="alert"
              className="text-sm font-medium text-destructive"
            >
              {fieldError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
