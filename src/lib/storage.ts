import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

export const AVATAR_BUCKET = 'avatars';

export async function uploadFile(bucket: string, path: string, file: File) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
}

export async function getPublicUrl(bucket: string, path: string) {
  try {
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
