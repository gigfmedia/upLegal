import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FileUploadProps {
  onUpload: (url: string) => void;
  accept?: string;
  maxSize?: number;
  bucket: string;
  folder?: string;
  userId?: string;
  currentImageUrl?: string;
}

export function FileUpload({
  onUpload,
  accept = 'image/*',
  maxSize = 2 * 1024 * 1024, // 2MB
  bucket,
  folder = '',
  userId,
  currentImageUrl
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para subir archivos",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${folder ? folder + '/' : ''}${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setPreviewUrl(publicUrl);
      onUpload(publicUrl);
      
      toast({
        title: "¡Éxito!",
        description: "Imagen subida correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al subir la imagen",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > maxSize) {
        toast({
          title: "Error",
          description: `El archivo es muy grande. Máximo ${maxSize / (1024 * 1024)}MB`,
          variant: "destructive"
        });
        return;
      }
      uploadFile(file);
    }
  }, [maxSize, uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { [accept]: [] },
    multiple: false,
    disabled: uploading
  });

  const removeImage = () => {
    setPreviewUrl(null);
    onUpload('');
  };

  return (
    <div className="space-y-4">
      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Vista previa"
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={removeImage}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
            ) : (
              <Image className="h-8 w-8 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium">
                {uploading ? 'Subiendo...' : 'Arrastra una imagen aquí'}
              </p>
              <p className="text-xs text-gray-500">
                o haz clic para seleccionar
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG hasta {maxSize / (1024 * 1024)}MB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}