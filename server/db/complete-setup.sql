-- ===================================================
-- CHOICE PROPERTIES - COMPLETE SUPABASE SETUP
-- ===================================================
-- Run this entire file in Supabase SQL Editor to set up:
-- 1. All tables (7 tables)
-- 2. All indexes
-- 3. User sync trigger
-- 4. RLS policies (22 policies)
-- 5. Storage buckets (3 buckets)
-- ===================================================

-- ===================================================
-- PART 1: CREATE TABLES
-- ===================================================

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',
  profile_image TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties Table
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  price DECIMAL(12, 2),
  bedrooms INT,
  bathrooms DECIMAL(3, 1),
  square_feet INT,
  property_type TEXT,
  amenities JSONB,
  images JSONB,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  furnished BOOLEAN DEFAULT FALSE,
  pets_allowed BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications Table
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  step INT DEFAULT 0,
  personal_info JSONB,
  rental_history JSONB,
  employment JSONB,
  "references" JSONB,
  disclosures JSONB,
  documents JSONB,
  status TEXT DEFAULT 'pending',
  application_fee DECIMAL(8, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Inquiries Table
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT,
  message TEXT,
  inquiry_type TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property Requirements Form Submissions
CREATE TABLE IF NOT EXISTS public.requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  budget_min DECIMAL(10, 2),
  budget_max DECIMAL(10, 2),
  bedrooms INT,
  bathrooms DECIMAL(3, 1),
  property_type JSONB,
  locations JSONB,
  amenities JSONB,
  pets JSONB,
  lease_term TEXT,
  move_in_date DATE,
  additional_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites Table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- ===================================================
-- PART 2: CREATE INDEXES
-- ===================================================

CREATE INDEX IF NOT EXISTS idx_properties_owner ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_applications_user ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_property ON public.applications(property_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_agent ON public.inquiries(agent_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_property ON public.inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_property ON public.reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);

-- ===================================================
-- PART 3: USER SYNC TRIGGER
-- Automatically creates user record when someone signs up via Supabase Auth
-- ===================================================

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, password_hash, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    '',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', full_name),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- ===================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- ===================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- PART 5: RLS POLICIES
-- ===================================================

-- ----- USERS TABLE POLICIES -----

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
ON public.users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Public can view agent profiles" ON public.users;
CREATE POLICY "Public can view agent profiles"
ON public.users FOR SELECT
USING (role = 'agent');

-- ----- PROPERTIES TABLE POLICIES -----

DROP POLICY IF EXISTS "Anyone can view active properties" ON public.properties;
CREATE POLICY "Anyone can view active properties"
ON public.properties FOR SELECT
USING (status = 'active');

DROP POLICY IF EXISTS "Owners can view own properties" ON public.properties;
CREATE POLICY "Owners can view own properties"
ON public.properties FOR SELECT
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Authenticated users can create properties" ON public.properties;
CREATE POLICY "Authenticated users can create properties"
ON public.properties FOR INSERT
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update own properties" ON public.properties;
CREATE POLICY "Owners can update own properties"
ON public.properties FOR UPDATE
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete own properties" ON public.properties;
CREATE POLICY "Owners can delete own properties"
ON public.properties FOR DELETE
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Admins can manage all properties" ON public.properties;
CREATE POLICY "Admins can manage all properties"
ON public.properties FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ----- APPLICATIONS TABLE POLICIES -----

DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
CREATE POLICY "Users can view own applications"
ON public.applications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create applications" ON public.applications;
CREATE POLICY "Users can create applications"
ON public.applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending applications" ON public.applications;
CREATE POLICY "Users can update own pending applications"
ON public.applications FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Owners can view applications for their properties" ON public.applications;
CREATE POLICY "Owners can view applications for their properties"
ON public.applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties WHERE properties.id = applications.property_id AND properties.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can update application status" ON public.applications;
CREATE POLICY "Owners can update application status"
ON public.applications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.properties WHERE properties.id = applications.property_id AND properties.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage all applications" ON public.applications;
CREATE POLICY "Admins can manage all applications"
ON public.applications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ----- INQUIRIES TABLE POLICIES -----

DROP POLICY IF EXISTS "Anyone can create inquiries" ON public.inquiries;
CREATE POLICY "Anyone can create inquiries"
ON public.inquiries FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Agents can view own inquiries" ON public.inquiries;
CREATE POLICY "Agents can view own inquiries"
ON public.inquiries FOR SELECT
USING (auth.uid() = agent_id);

DROP POLICY IF EXISTS "Agents can update own inquiries" ON public.inquiries;
CREATE POLICY "Agents can update own inquiries"
ON public.inquiries FOR UPDATE
USING (auth.uid() = agent_id);

DROP POLICY IF EXISTS "Admins can manage all inquiries" ON public.inquiries;
CREATE POLICY "Admins can manage all inquiries"
ON public.inquiries FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ----- REQUIREMENTS TABLE POLICIES -----

DROP POLICY IF EXISTS "Users can view own requirements" ON public.requirements;
CREATE POLICY "Users can view own requirements"
ON public.requirements FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create requirements" ON public.requirements;
CREATE POLICY "Users can create requirements"
ON public.requirements FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own requirements" ON public.requirements;
CREATE POLICY "Users can update own requirements"
ON public.requirements FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Agents can view all requirements" ON public.requirements;
CREATE POLICY "Agents can view all requirements"
ON public.requirements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'agent' OR role = 'admin')
  )
);

-- ----- REVIEWS TABLE POLICIES -----

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews"
ON public.reviews FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
CREATE POLICY "Authenticated users can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews"
ON public.reviews FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews"
ON public.reviews FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;
CREATE POLICY "Admins can manage all reviews"
ON public.reviews FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ----- FAVORITES TABLE POLICIES -----

DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
CREATE POLICY "Users can view own favorites"
ON public.favorites FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites;
CREATE POLICY "Users can add favorites"
ON public.favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own favorites" ON public.favorites;
CREATE POLICY "Users can remove own favorites"
ON public.favorites FOR DELETE
USING (auth.uid() = user_id);

-- ===================================================
-- PART 6: STORAGE BUCKETS
-- ===================================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('property-images', 'property-images', true),
  ('profile-images', 'profile-images', true),
  ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Property images policies
DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;
CREATE POLICY "Public can view property images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
CREATE POLICY "Authenticated users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-images' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Users can update own property images" ON storage.objects;
CREATE POLICY "Users can update own property images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own property images" ON storage.objects;
CREATE POLICY "Users can delete own property images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Profile images policies
DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;
CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "Users can upload own profile image" ON storage.objects;
CREATE POLICY "Users can upload own profile image"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own profile image" ON storage.objects;
CREATE POLICY "Users can update own profile image"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own profile image" ON storage.objects;
CREATE POLICY "Users can delete own profile image"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Documents policies
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Agents can view application documents" ON storage.objects;
CREATE POLICY "Agents can view application documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.properties p ON a.property_id = p.id
    WHERE p.owner_id = auth.uid()
    AND a.user_id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ===================================================
-- SETUP COMPLETE!
-- ===================================================
-- After running this SQL, your Supabase database will have:
-- - 7 tables with proper relationships
-- - 10 indexes for performance
-- - User sync trigger for auth.users -> public.users
-- - 22+ RLS policies for security
-- - 3 storage buckets with policies
-- ===================================================
