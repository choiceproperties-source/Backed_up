-- ===================================================
-- Row Level Security (RLS) Policies for ChoiceProperties
-- Run this in the Supabase SQL Editor after creating tables
-- ===================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- USERS TABLE POLICIES
-- ===================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Public can view agent profiles (for property listings)
CREATE POLICY "Public can view agent profiles"
ON users FOR SELECT
USING (role = 'agent');

-- ===================================================
-- PROPERTIES TABLE POLICIES
-- ===================================================

-- Anyone can view active properties (public listings)
CREATE POLICY "Anyone can view active properties"
ON properties FOR SELECT
USING (status = 'active');

-- Agents/Owners can view all their own properties
CREATE POLICY "Owners can view own properties"
ON properties FOR SELECT
USING (auth.uid() = owner_id);

-- Agents/Owners can create properties
CREATE POLICY "Authenticated users can create properties"
ON properties FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Owners can update their own properties
CREATE POLICY "Owners can update own properties"
ON properties FOR UPDATE
USING (auth.uid() = owner_id);

-- Owners can delete their own properties
CREATE POLICY "Owners can delete own properties"
ON properties FOR DELETE
USING (auth.uid() = owner_id);

-- Admins can manage all properties
CREATE POLICY "Admins can manage all properties"
ON properties FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ===================================================
-- APPLICATIONS TABLE POLICIES
-- ===================================================

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
ON applications FOR SELECT
USING (auth.uid() = user_id);

-- Users can create applications
CREATE POLICY "Users can create applications"
ON applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending applications
CREATE POLICY "Users can update own pending applications"
ON applications FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Property owners/agents can view applications for their properties
CREATE POLICY "Owners can view applications for their properties"
ON applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM properties WHERE properties.id = applications.property_id AND properties.owner_id = auth.uid()
  )
);

-- Property owners/agents can update application status
CREATE POLICY "Owners can update application status"
ON applications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM properties WHERE properties.id = applications.property_id AND properties.owner_id = auth.uid()
  )
);

-- Admins can manage all applications
CREATE POLICY "Admins can manage all applications"
ON applications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ===================================================
-- INQUIRIES TABLE POLICIES
-- ===================================================

-- Anyone can create inquiries (contact forms)
CREATE POLICY "Anyone can create inquiries"
ON inquiries FOR INSERT
WITH CHECK (true);

-- Agents can view inquiries directed to them
CREATE POLICY "Agents can view own inquiries"
ON inquiries FOR SELECT
USING (auth.uid() = agent_id);

-- Agents can update inquiries directed to them
CREATE POLICY "Agents can update own inquiries"
ON inquiries FOR UPDATE
USING (auth.uid() = agent_id);

-- Admins can manage all inquiries
CREATE POLICY "Admins can manage all inquiries"
ON inquiries FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ===================================================
-- REQUIREMENTS TABLE POLICIES
-- ===================================================

-- Users can view their own requirements
CREATE POLICY "Users can view own requirements"
ON requirements FOR SELECT
USING (auth.uid() = user_id);

-- Users can create requirements
CREATE POLICY "Users can create requirements"
ON requirements FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own requirements
CREATE POLICY "Users can update own requirements"
ON requirements FOR UPDATE
USING (auth.uid() = user_id);

-- Agents and admins can view all requirements
CREATE POLICY "Agents can view all requirements"
ON requirements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'agent' OR role = 'admin')
  )
);

-- ===================================================
-- REVIEWS TABLE POLICIES
-- ===================================================

-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews"
ON reviews FOR SELECT
USING (true);

-- Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews"
ON reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON reviews FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
ON reviews FOR DELETE
USING (auth.uid() = user_id);

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews"
ON reviews FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ===================================================
-- FAVORITES TABLE POLICIES
-- ===================================================

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
ON favorites FOR SELECT
USING (auth.uid() = user_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
ON favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can remove own favorites"
ON favorites FOR DELETE
USING (auth.uid() = user_id);

-- ===================================================
-- SERVICE ROLE BYPASS (for backend API)
-- The service role key bypasses RLS automatically
-- ===================================================
