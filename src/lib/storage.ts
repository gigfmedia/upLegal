import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Validar variables de entorno al cargar el módulo
const validateEnvVars = (): { url: string; anonKey: string } => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const errorMessage = '❌ Missing required Supabase environment variables';
    console.error(errorMessage, {
      VITE_SUPABASE_URL: url ? '✅ Presente' : '❌ Faltante',
      VITE_SUPABASE_ANON_KEY: anonKey ? '✅ Presente' : '❌ Faltante',
      NODE_ENV: import.meta.env.MODE,
    });
    throw new Error(errorMessage);
  }

  // Validar formato de la URL y la clave
  if (!url.startsWith('https://')) {
    throw new Error('❌ URL de Supabase inválida: debe comenzar con https://');
  }

  if (!anonKey.startsWith('eyJ')) {
    console.warn('⚠️  La clave anónima no parece tener un formato JWT estándar');
  }

  return { url, anonKey };
};

// Inicializar cliente de Supabase con configuración segura
let supabaseInstance: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (supabaseInstance) return supabaseInstance;

  try {
    const { url, anonKey } = validateEnvVars();
    
    supabaseInstance = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'uplegal-web/1.0.0',
        },
      },
    });

    return supabaseInstance;
  } catch (error) {
    console.error('❌ Error al inicializar Supabase:', error);
    throw new Error('No se pudo inicializar el cliente de Supabase');
  }
};

export const supabase = getSupabaseClient();

// Constantes para buckets
export const BUCKETS = {
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
} as const;

type BucketType = typeof BUCKETS[keyof typeof BUCKETS];

// Validar nombre del bucket
const validateBucket = (bucket: string): asserts bucket is BucketType => {
  if (!Object.values(BUCKETS).includes(bucket as BucketType)) {
    throw new Error(`Bucket no válido: ${bucket}. Buckets permitidos: ${Object.values(BUCKETS).join(', ')}`);
  }
};

// Validar ruta del archivo
const validatePath = (path: string): void => {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    throw new Error('La ruta del archivo es inválida');
  }
  // Prevenir directory traversal
  if (path.includes('../') || path.includes('..\\')) {
    throw new Error('La ruta del archivo contiene caracteres no permitidos');
  }
};

interface UploadOptions {
  cacheControl?: string;
  upsert?: boolean;
  contentType?: string;
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options: UploadOptions = {}
) {
  try {
    validateBucket(bucket);
    validatePath(path);

    if (!(file instanceof File)) {
      throw new Error('El archivo proporcionado no es una instancia de File');
    }

    const { cacheControl = '3600', upsert = false, contentType } = options;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: `public, max-age=${cacheControl}`,
        upsert,
        contentType: contentType || file.type,
      });

    if (error) {
      console.error(`Error al subir archivo a ${bucket}/${path}:`, error);
      throw new Error(`Error al subir el archivo: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error en uploadFile:', error);
    throw error;
  }
}

export async function getPublicUrl(bucket: string, path: string): Promise<string> {
  try {
    validateBucket(bucket);
    validatePath(path);

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    throw error;
  }
}

export async function deleteFile(bucket: string, path: string) {
  try {
    // Remove the bucket name from the path if it's included
    const cleanPath = path.startsWith(`${bucket}/`) ? path.replace(`${bucket}/`, '') : path;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([cleanPath]);
    
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    throw error;
  }
}

export async function updateUserAvatar(userId: string, file: File) {
  try {
    // 1. Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    
    // 2. Upload the file directly to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });
    
    if (uploadError) throw uploadError;
    
    // 3. Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    // 4. Update the profile using the RPC function
    const { data, error: updateError } = await supabase.rpc('update_user_avatar', {
      p_user_id: userId,
      p_avatar_url: publicUrl
    });
    
    if (updateError) {
      throw updateError;
    }
    
    return publicUrl;
  } catch (error) {
    throw error;
  }
}
