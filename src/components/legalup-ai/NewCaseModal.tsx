import { useState, type FormEvent } from 'react';
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
import { useCreateAIWorkspace, type AIWorkspace } from '@/hooks/useAIWorkspaces';

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

type NewCaseModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (workspace: AIWorkspace) => void;
};

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

export function NewCaseModal({ open, onOpenChange, onCreated }: NewCaseModalProps) {
  const createCase = useCreateAIWorkspace();

  const [name, setName] = useState('');
  const [practiceArea, setPracticeArea] = useState<string>('');
  const [description, setDescription] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName('');
    setPracticeArea('');
    setDescription('');
    setFieldError(null);
  };

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
    if (!validate()) return;

    setSubmitting(true);
    try {
      const created = await createCase.mutateAsync({
        name: name.trim(),
        practice_area: practiceArea || undefined,
        description: description || undefined,
      });

      toast.success('Caso creado', {
        description: `"${created.name}" se guardó correctamente.`,
      });

      posthog.capture('ai_workspace_case_created', {
        practice_area: practiceArea || null,
        source: 'ai_workspace',
      });

      reset();
      onOpenChange(false);
      onCreated?.(created);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el caso.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) {
          reset();
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo caso</DialogTitle>
          <DialogDescription>
            Organiza tu trabajo con un nuevo caso en LegalUp AI.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-case-name">
              Nombre del caso <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ai-case-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Despido Juan Pérez"
              maxLength={MAX_NAME_LENGTH}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? 'ai-case-name-error' : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-case-practice-area">Área jurídica</Label>
            <Select value={practiceArea || undefined} onValueChange={setPracticeArea}>
              <SelectTrigger id="ai-case-practice-area" className="w-full">
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
            <Label htmlFor="ai-case-description">Descripción</Label>
            <Textarea
              id="ai-case-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Antecedentes del caso (opcional)"
              rows={4}
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
          </div>

          {fieldError && (
            <p
              id="ai-case-name-error"
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
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creando…' : 'Crear caso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
