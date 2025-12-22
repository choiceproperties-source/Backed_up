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
      // Get Supabase config from backend
      const configResponse = await fetch('/api/config');
      const config = await configResponse.json();
      
      if (!config.supabaseUrl || !config.anonKey) {
        throw new Error('Failed to get Supabase configuration');
      }

      // Initialize Supabase client
      const supabase = createClient(config.supabaseUrl, config.anonKey);

      // Generate unique file path
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const fileName = `${timestamp}-${randomId}-${file.name}`;
      const filePath = `${folder}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(error.message || 'Upload failed');
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      setUploadProgress(100);
      toast({
        title: 'Image Uploaded',
        description: `${file.name} has been uploaded successfully`,
      });

      return {
        url: publicUrlData.publicUrl,
        path: filePath,
        fullPath: `${bucket}/${filePath}`,
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
