import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface ImageKitUploadResponse {
  fileId: string;
  name: string;
  size: number;
  filePath: string;
  url: string;
  thumbnailUrl: string;
  height?: number;
  width?: number;
  type: string;
}

interface ImageKitTokenResponse {
  token: string;
  signature: string;
  expire: number;
  publicKey: string;
  urlEndpoint: string;
  category?: string;
}

interface UseImageKitUploadOptions {
  folder?: string;
  onUploadComplete?: (response: ImageKitUploadResponse) => void;
  maxSize?: number; // in MB
}

export function useImageKitUpload(options: UseImageKitUploadOptions = {}) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImage = async (
    file: File
  ): Promise<ImageKitUploadResponse | null> => {
    // Validation
    const maxSize = (options.maxSize || 10) * 1024 * 1024;
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
      // Step 1: Get upload token from backend
      const tokenResponse = await apiRequest('POST', '/api/imagekit/upload-token');
      const tokenData = (await tokenResponse.json()) as { data: ImageKitTokenResponse };
      
      if (!tokenData.data) {
        throw new Error('Failed to get upload token');
      }

      const { token, signature, expire, publicKey, urlEndpoint } = tokenData.data;

      // Step 2: Prepare FormData for ImageKit upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('publicKey', publicKey);
      formData.append('signature', signature);
      formData.append('expire', expire.toString());
      formData.append('token', token);
      
      if (options.folder) {
        formData.append('folder', options.folder);
      }

      // Track upload progress
      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise<ImageKitUploadResponse>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              
              const uploadResponse: ImageKitUploadResponse = {
                fileId: response.fileId || response.file_id,
                name: response.name,
                size: response.size,
                filePath: response.filePath || response.file_path,
                url: response.url,
                thumbnailUrl: response.thumbnailUrl || response.thumbnail_url,
                height: response.height,
                width: response.width,
                type: response.type,
              };

              options.onUploadComplete?.(uploadResponse);
              resolve(uploadResponse);
            } catch (error) {
              reject(new Error('Failed to parse upload response'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        xhr.open('POST', `${urlEndpoint}/api/upload`);
        xhr.send(formData);
      });

      const result = await uploadPromise;
      
      toast({
        title: 'Image Uploaded',
        description: `${file.name} has been uploaded successfully`,
      });

      return result;
    } catch (error: any) {
      console.error('ImageKit upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload image',
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
