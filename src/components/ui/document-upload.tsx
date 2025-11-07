import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, X, Loader2, Image as ImageIcon, File } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface DocumentUploadProps {
  onUpload: (url: string, fileName: string) => void;
  accept?: string[];
  maxSize?: number;
  bucket: string;
  folder?: string;
  userId?: string;
  currentDocumentUrl?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  fileName?: string;
}

export function DocumentUpload({
  onUpload,
  accept = ['application/pdf', 'image/jpeg', 'image/png'],
  maxSize = 5 * 1024 * 1024, // 5MB
  bucket,
  folder = 'documents',
  userId,
  fileName,
  currentDocumentUrl,
  disabled = false,
  label = 'Documento',
  description = 'Sube tu documento o arrástralo aquí'
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentDocumentUrl || null);
  const { toast } = useToast();
  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5" />;
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

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
      // Eliminar el documento anterior si existe
      if (currentDocumentUrl) {
        const oldFileName = currentDocumentUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from(bucket)
            .remove([`${userId}/${folder}/${oldFileName}`]);
        }
      }

      // Subir el nuevo documento
      // Usar el nombre original del archivo
      const safeFileName = file.name.replace(/[^\w\d.-]/g, '_'); // Reemplazar caracteres especiales
      const newFileName = `${userId}/${folder}/${safeFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(newFileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(newFileName);

      setPreviewUrl(publicUrl);
      setFileName(file.name);
      onUpload(publicUrl, file.name);
      
      toast({
        title: "¡Éxito!",
        description: `${label} subido correctamente`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Error al subir el ${label.toLowerCase()}`,
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
    accept: accept.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    multiple: false,
    disabled: uploading || disabled
  });

  const removeDocument = async () => {
    if (currentDocumentUrl) {
      try {
        const oldFileName = currentDocumentUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from(bucket)
            .remove([`${userId}/${folder}/${oldFileName}`]);
        }
      } catch (error) {
        console.error('Error al eliminar el documento:', error);
      }
    }
    
    setPreviewUrl(null);
    setFileName('');
    onUpload('', '');
    
    toast({
      title: "Documento eliminado",
      description: `El ${label.toLowerCase()} se ha eliminado correctamente`,
    });
  };

  const fileType = accept.includes('application/pdf') ? 'PDF' : 'imagen';
  const acceptTypes = accept.map(type => type.split('/').pop()?.toUpperCase()).join(', ');

  return (
    <div className="space-y-2">
      
      {previewUrl ? (
        <div className="border rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getFileIcon(accept[0])}
              <span className="text-sm font-medium truncate max-w-[200px]">
                {fileName || 'Archivo.pdf'}
              </span>
            </div>
            <div className="flex space-x-2">
              <a 
                href={disabled ? '#' : previewUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`p-0 w-200 text-center p-1 rounded-md text-xs ${
                  disabled 
                    ? 'text-muted-foreground cursor-not-allowed' 
                    : 'text-primary hover:bg-accent hover:text-primary'
                }`}
                onClick={(e) => disabled && e.preventDefault()}
                aria-disabled={disabled}
              >
                Ver documento
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0"
                onClick={removeDocument}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isDragActive && !disabled ? 'border-primary bg-primary/5' : 'border-gray-300'}
            ${!disabled && !uploading ? 'hover:border-gray-400' : ''}
            ${uploading || disabled ? 'opacity-70' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium">
                {uploading ? 'Subiendo...' : `Sube tu ${label.toLowerCase()}`}
              </p>
              <p className="text-xs text-muted-foreground">
                o arrástralo aquí
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {acceptTypes} (máx. {maxSize / (1024 * 1024)}MB)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
