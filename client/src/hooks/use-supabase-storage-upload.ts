import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface UseSupabaseStorageUploadOptions {
  bucket?: string;
  folder?: string;
  maxSize?: number; // in MB
}

interface UploadResponse {
  url: string;
  path: string;
  fullPath: string;
}

export function useSupabaseStorageUpload(options: UseSupabaseStorageUploadOptions = {}) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const bucket = options.bucket || 'property-images';
  const folder = options.folder || 'properties';
  const maxSize = (options.maxSize || 10) * 1024 * 1024;

  const uploadImage = async (file: File): Promise<UploadResponse | null> => {
    // Validation
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: `Maximum file size is ${options.maxSize || 10}MB`,
        variant: 'destructive',
      });
      return null;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Only JPG, PNG, WebP, and GIF files are allowed',
        variant: 'destructive',
      });
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Read file as base64
      const reader = new FileReader();
      
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Extract base64 part
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload via backend endpoint (uses service role key)
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: {
            name: file.name,
            type: file.type,
            data: fileData,
          },
          folder,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      if (!result.url) {
        throw new Error('Failed to get public URL');
      }

      setUploadProgress(100);
      toast({
        title: 'Image Uploaded',
        description: `${file.name} has been uploaded successfully`,
      });

      return {
        url: result.url,
        path: result.path,
        fullPath: `${bucket}/${result.path}`,
      };
    } catch (error: any) {
      console.error('[SUPABASE STORAGE] Upload error:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        errorType: error?.constructor?.name,
      });

      toast({
        title: 'Upload Failed',
        description: error?.message || 'Failed to upload image',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    uploadImage,
    isUploading,
    uploadProgress,
  };
}
