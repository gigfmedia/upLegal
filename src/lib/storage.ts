import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

import { supabase } from '@/lib/supabaseClient';

// Re-export the client for compatibility
export { supabase };

// Helper to get the client (just returns the imported one)
export const getSupabaseClient = () => supabase;

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
    
    // Debug: Check session and userId
    const { data: { session } } = await supabase.auth.getSession();
    console.log(' Uploading avatar:', {
      userIdParam: userId,
      authUser: session?.user?.id,
      fileName,
      isAuthenticated: !!session
    });

    if (!session) {
      throw new Error('No active session found during upload');
    }

    // 2. Upload the file directly to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });
    
    if (uploadError) throw uploadError;
    
    // 3. Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    // 4. Update the profile directly
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (updateError) {
      throw updateError;
    }
    
    return publicUrl;
  } catch (error) {
    throw error;
  }
}
