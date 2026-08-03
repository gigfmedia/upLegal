import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import posthog from 'posthog-js';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import type { Database } from '@/types/supabase';

export type AIWorkspace = Database['public']['Tables']['ai_workspaces']['Row'];

export type AIWorkspaceInput = {
  name: string;
  description?: string;
  practice_area?: string;
};

export type AIWorkspaceUpdate = Partial<AIWorkspaceInput> & { id: string };

export const AI_WORKSPACES_QUERY_KEY = ['ai-workspaces'] as const;

/**
 * Obtiene los workspaces (casos) del abogado autenticado.
 * La seguridad real la garantiza RLS: solo se devuelven filas con
 * lawyer_id = auth.uid().
 */
export function useAIWorkspaces() {
  const { user } = useAuth();
  const lawyerId = user?.id ?? null;

  const query = useQuery<AIWorkspace[]>({
    queryKey: [...AI_WORKSPACES_QUERY_KEY, lawyerId],
    enabled: !!lawyerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_workspaces')
        .select('*')
        .eq('lawyer_id', lawyerId!)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[LegalUpAI] Error cargando casos:', error);
        throw new Error('No se pudieron cargar tus casos. Inténtalo de nuevo.');
      }

      return (data ?? []) as AIWorkspace[];
    },
  });

  return { ...query, lawyerId };
}

/**
 * Obtiene un workspace específico del abogado. RLS garantiza que solo el
 * dueño puede leerlo; si no existe o pertenece a otro usuario, devuelve null.
 */
export function useAIWorkspace(id: string | undefined) {
  const { user } = useAuth();
  const lawyerId = user?.id ?? null;

  const query = useQuery<AIWorkspace | null>({
    queryKey: [...AI_WORKSPACES_QUERY_KEY, lawyerId, id],
    enabled: !!lawyerId && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_workspaces')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (error) {
        console.error('[LegalUpAI] Error cargando caso:', error);
        throw new Error('No se pudo cargar el caso.');
      }

      return (data ?? null) as AIWorkspace | null;
    },
  });

  return query;
}

/**
 * Crea un nuevo workspace. RLS verifica que lawyer_id = auth.uid().
 */
export function useCreateAIWorkspace() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<AIWorkspace, Error, AIWorkspaceInput>({
    mutationFn: async (input) => {
      if (!user?.id) {
        throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
      }

      const { data, error } = await supabase
        .from('ai_workspaces')
        .insert({
          lawyer_id: user.id,
          name: input.name,
          description: input.description?.trim() || null,
          practice_area: input.practice_area || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[LegalUpAI] Error creando caso:', error);
        throw new Error('No se pudo crear el caso. Inténtalo de nuevo.');
      }

      // Evento de activación: solo el primer caso del abogado.
      try {
        const { count } = await supabase
          .from('ai_workspaces')
          .select('id', { count: 'exact', head: true })
          .eq('lawyer_id', user.id);
        if (count === 1) {
          posthog.capture('ai_first_case_created', {
            practice_area: input.practice_area || null,
          });
        }
      } catch (error) {
        console.error('[LegalUpAI] ai_first_case_created failed', error);
      }

      return data as AIWorkspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_WORKSPACES_QUERY_KEY });
    },
  });
}

/**
 * Actualiza un workspace propio. `updated_at` lo mantiene el trigger.
 */
export function useUpdateAIWorkspace() {
  const queryClient = useQueryClient();

  return useMutation<AIWorkspace, Error, AIWorkspaceUpdate>({
    mutationFn: async ({ id, ...patch }) => {
      const { data, error } = await supabase
        .from('ai_workspaces')
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.description !== undefined && { description: patch.description?.trim() || null }),
          ...(patch.practice_area !== undefined && { practice_area: patch.practice_area || null }),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[LegalUpAI] Error actualizando caso:', error);
        throw new Error('No se pudo actualizar el caso. Inténtalo de nuevo.');
      }

      return data as AIWorkspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_WORKSPACES_QUERY_KEY });
    },
  });
}

/**
 * Elimina un workspace propio. RLS impide eliminar casos ajenos.
 */
export function useDeleteAIWorkspace() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.from('ai_workspaces').delete().eq('id', id);

      if (error) {
        console.error('[LegalUpAI] Error eliminando caso:', error);
        throw new Error('No se pudo eliminar el caso. Inténtalo de nuevo.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_WORKSPACES_QUERY_KEY });
    },
  });
}
