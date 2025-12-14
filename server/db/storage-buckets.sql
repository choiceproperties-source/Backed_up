-- ===================================================
-- Supabase Storage Buckets Configuration
-- Run this in the Supabase SQL Editor
-- ===================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('property-images', 'property-images', true),
  ('profile-images', 'profile-images', true),
  ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- ===================================================
-- PROPERTY IMAGES BUCKET POLICIES
-- Public bucket - anyone can view, authenticated users can upload
-- ===================================================

-- Anyone can view property images
CREATE POLICY "Public can view property images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

-- Authenticated users can upload property images
CREATE POLICY "Authenticated users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-images' 
  AND auth.role() = 'authenticated'
);

-- Users can update their own property images
CREATE POLICY "Users can update own property images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own property images
CREATE POLICY "Users can delete own property images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===================================================
-- PROFILE IMAGES BUCKET POLICIES
-- Public bucket - anyone can view, users can manage their own
-- ===================================================

-- Anyone can view profile images
CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

-- Authenticated users can upload their profile image
CREATE POLICY "Users can upload own profile image"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own profile image
CREATE POLICY "Users can update own profile image"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own profile image
CREATE POLICY "Users can delete own profile image"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===================================================
-- DOCUMENTS BUCKET POLICIES
-- Private bucket - only owner and property agents can access
-- ===================================================

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload documents
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Agents can view documents for applications on their properties
CREATE POLICY "Agents can view application documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM applications a
    JOIN properties p ON a.property_id = p.id
    WHERE p.owner_id = auth.uid()
    AND a.user_id::text = (storage.foldername(name))[1]
  )
);

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);
