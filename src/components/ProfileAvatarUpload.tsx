import { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { useToast } from '@/hooks/use-toast';
import { updateUserAvatar } from '@/lib/storage';
import { cn } from '@/lib/utils';

export function ProfileAvatarUpload({ 
  avatarUrl, 
  onUpload,
  disabled = false 
}: { 
  avatarUrl: string | null; 
  onUpload: (url: string) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen');
      }

      if (!user?.id) {
        throw new Error('No se pudo identificar al usuario');
      }

      const file = event.target.files[0];
      
      // Validate file type
      // Allow any image type
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('La imagen no debe superar los 10MB');
      }

      // Use the storage utility to handle the upload
      const publicUrl = await updateUserAvatar(user.id, file);
      
      // Call the onUpload callback with the new URL
      onUpload(publicUrl);

      toast({
        title: '¡Éxito!',
        description: 'Tu foto de perfil ha sido actualizada',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo cargar la imagen. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Add a timestamp to force image refresh when URL changes
  const avatarUrlWithTimestamp = useMemo(() => {
    if (!avatarUrl) return null;
    // Only update timestamp when avatarUrl changes, not on every render
    return `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;
  }, [avatarUrl]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <div className="relative h-24 w-24">
          <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-100">
            {avatarUrlWithTimestamp ? (
              <>
                <img 
                  src={avatarUrlWithTimestamp} 
                  alt="Foto de perfil"
                  className={`w-full h-full object-cover transition-opacity duration-300 ${uploading ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => setUploading(false)}
                  onError={(e) => {
                    console.error('Error loading avatar image');
                    setUploading(false);
                  }}
                  loading="eager"
                  decoding="async"
                />
                {/* Loading spinner */}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                )}
              </>
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${disabled ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-700'} text-xl font-medium`}>
                {(() => {
                  try {
                    const name = user?.user_metadata?.name as string | undefined;
                    if (name) {
                      return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                    }
                    return user?.email?.charAt(0).toUpperCase() || 'U';
                  } catch (error) {
                    console.error('Error generating avatar fallback:', error);
                    return 'U';
                  }
                })()}
              </div>
            )}
          </div>
          
          {!disabled && (
            <label 
              htmlFor="avatar-upload"
              className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-100 transition-colors"
              title="Cambiar foto de perfil"
            >
              <Camera className="h-5 w-5 text-gray-700" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadAvatar}
                disabled={uploading || disabled}
              />
            </label>
          )}
        </div>
      </div>
      {!disabled && (
        <p className="text-sm text-muted-foreground text-center">
          Haz clic en la cámara para cambiar tu foto de perfil
        </p>
      )}
    </div>
  );
}
