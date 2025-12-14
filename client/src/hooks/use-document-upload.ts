import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth, getAuthToken } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  storagePath: string;
  docType: 'id' | 'proof_of_income' | 'employment_verification' | 'other';
  uploadedAt: string;
}

interface UseDocumentUploadOptions {
  applicationId?: string;
  onUploadComplete?: (doc: UploadedDocument) => void;
}

export function useDocumentUpload(options: UseDocumentUploadOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);

  const uploadDocument = async (
    file: File, 
    docType: UploadedDocument['docType'] = 'other'
  ): Promise<UploadedDocument | null> => {
    // Allow uploads for both authenticated and guest users
    if (!supabase) {
      toast({
        title: 'Upload Error',
        description: 'Storage service is not configured',
        variant: 'destructive',
      });
      return null;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 5MB',
        variant: 'destructive',
      });
      return null;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Only PDF, JPG, and PNG files are allowed',
        variant: 'destructive',
      });
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      // For guest users, store document in localStorage instead of Supabase
      if (!user) {
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onload = () => {
            const base64Data = reader.result as string;
            const doc: UploadedDocument = {
              id: `${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              type: file.type,
              size: file.size,
              url: base64Data,
              storagePath: '',
              docType,
              uploadedAt: new Date().toISOString(),
            };

            setUploadedDocs(prev => [...prev, doc]);
            setUploadProgress(100);

            toast({
              title: 'Document Uploaded',
              description: `${file.name} has been uploaded successfully`,
            });

            options.onUploadComplete?.(doc);
            setIsUploading(false);
            resolve(doc);
          };
          reader.readAsDataURL(file);
        });
      }

      // For authenticated users, upload to Supabase
      const filePath = `${user!.id}/${docType}_${timestamp}_${sanitizedName}`;

      const { data, error } = await supabase!.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: signedUrlData } = await supabase!.storage
        .from('documents')
        .createSignedUrl(data.path, 60 * 60 * 24 * 365);

      const doc: UploadedDocument = {
        id: `${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: signedUrlData?.signedUrl || data.path,
        storagePath: data.path,
        docType,
        uploadedAt: new Date().toISOString(),
      };

      setUploadedDocs(prev => [...prev, doc]);
      setUploadProgress(100);

      toast({
        title: 'Document Uploaded',
        description: `${file.name} has been uploaded successfully`,
      });

      options.onUploadComplete?.(doc);

      return doc;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const removeDocument = async (docId: string) => {
    const doc = uploadedDocs.find(d => d.id === docId);
    if (!doc || !supabase) return;

    try {
      if (doc.storagePath) {
        const { error } = await supabase.storage.from('documents').remove([doc.storagePath]);
        if (error) {
          console.warn('Storage removal warning:', error);
        }
      }

      setUploadedDocs(prev => prev.filter(d => d.id !== docId));

      toast({
        title: 'Document Removed',
        description: `${doc.name} has been removed`,
      });
    } catch (error: any) {
      console.error('Remove error:', error);
      setUploadedDocs(prev => prev.filter(d => d.id !== docId));
      toast({
        title: 'Document Removed',
        description: `${doc.name} has been removed locally`,
      });
    }
  };

  const getDocumentsByType = (docType: UploadedDocument['docType']) => {
    return uploadedDocs.filter(d => d.docType === docType);
  };

  const clearDocuments = () => {
    setUploadedDocs([]);
  };

  return {
    uploadDocument,
    removeDocument,
    getDocumentsByType,
    clearDocuments,
    uploadedDocs,
    isUploading,
    uploadProgress,
    setUploadedDocs,
  };
}
