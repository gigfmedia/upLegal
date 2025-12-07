import { useState, useRef, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Types for the avatar upload response
interface UploadResponse {
  path: string;
  fullPath: string;
  url: string;
}

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  onUpload: (url: string) => void;
}

export function AvatarUpload({ userId, currentAvatarUrl, onUpload }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona una imagen',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      const file = event.target.files[0];
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no soportado. Usa JPG, PNG o WebP');
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('La imagen es demasiado grande. El tamaño máximo es 2MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // 1. Delete existing avatar files
      if (currentAvatarUrl) {
        try {
          const { data: fileList, error: listError } = await supabase.storage
            .from('avatars')
            .list(userId);
            
          if (listError) throw listError;
          
          if (fileList && fileList.length > 0) {
            const filesToRemove = fileList.map((x: { name: string }) => `${userId}/${x.name}`);
            const { error: removeError } = await supabase.storage
              .from('avatars')
              .remove(filesToRemove);
              
            if (removeError) throw removeError;
          }
        } catch (error) {
          console.error('Error removing old avatar:', error);
          // Continue with upload even if deletion fails
        }
      }
      
      // 2. Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Error al subir la imagen. Por favor, inténtalo de nuevo.');
      }

      // 3. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error('No se pudo obtener la URL de la imagen');
      }
      
      // Add cache busting parameter
      const uploadTimestamp = Date.now();
      const publicUrlWithCache = `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}t=${uploadTimestamp}`;

      // 4. First, check if the profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error fetching profile:', fetchError);
        throw new Error('Error al verificar el perfil existente.');
      }

      // 5. Update or insert the profile
      const updateData = {
        user_id: userId,
        avatar_url: publicUrlWithCache,
        updated_at: new Date().toISOString()
      };

      let updateError;
      
      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', userId);
        updateError = error;
      } else {
        // Insert new profile
        const { error } = await supabase
          .from('profiles')
          .insert([{ ...updateData, created_at: new Date().toISOString() }]);
        updateError = error;
      }

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error('Error al actualizar el perfil. Por favor, inténtalo de nuevo.');
      }
      
      // 6. Update auth user metadata
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting current user:', userError);
        throw new Error('Error al obtener la información del usuario');
      }
      
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          ...currentUser?.user_metadata,
          avatar_url: publicUrlWithCache,
          updated_at: new Date().toISOString()
        }
      });

      if (authError) {
        console.error('Auth update error:', authError);
        throw new Error('Error al actualizar la información de autenticación');
      }
      
      // 9. Refresh the session to update user data
      await supabase.auth.refreshSession();
      
      // 10. Call the onUpload callback with the new URL and force update with a timestamp
      onUpload(publicUrlWithCache);
      
      // 11. Show success message
      toast({
        title: '¡Éxito!',
        description: 'Tu foto de perfil se ha actualizado correctamente.',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      
      // Show error message to user
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Ocurrió un error al subir la imagen',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
      <input
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleUpload}
        className="hidden"
        id="avatar-upload"
        disabled={isUploading}
        ref={fileInputRef}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-md hover:bg-primary/90 transition-colors"
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
