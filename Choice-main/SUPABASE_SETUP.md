# Supabase Setup Instructions

## 1. Create Supabase Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Properties table
CREATE TABLE properties (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms DECIMAL NOT NULL,
  sqft INTEGER NOT NULL,
  year_built INTEGER NOT NULL,
  description TEXT NOT NULL,
  features TEXT[] NOT NULL,
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  images TEXT[] NOT NULL,
  featured BOOLEAN DEFAULT FALSE,
  listing_type TEXT NOT NULL,
  application_fee INTEGER,
  property_tax_annual INTEGER,
  hoa_fee_monthly INTEGER,
  status TEXT DEFAULT 'available',
  pet_friendly BOOLEAN DEFAULT FALSE,
  furnished BOOLEAN DEFAULT FALSE,
  amenities TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Applications table
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  user_id UUID NOT NULL REFERENCES users(id),
  personal_info JSONB NOT NULL,
  rental_history JSONB,
  employment JSONB,
  reference_info JSONB,
  disclosures JSONB,
  documents JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Reviews table
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Favorites table
CREATE TABLE favorites (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  property_id TEXT NOT NULL REFERENCES properties(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Inquiries table
CREATE TABLE inquiries (
  id TEXT PRIMARY KEY,
  property_id TEXT,
  agent_id TEXT,
  sender_email TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "All can view properties" ON properties FOR SELECT USING (TRUE);
CREATE POLICY "Users can view own applications" ON applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own applications" ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "All can view reviews" ON reviews FOR SELECT USING (TRUE);
CREATE POLICY "Users can manage own favorites" ON favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "All can view inquiries" ON inquiries FOR SELECT USING (TRUE);
```

## 2. Seed Admin User (Optional)

In Supabase Auth Settings, manually create an admin user with:
- Email: `admin@choiceproperties.com`
- Password: `admin123`

## 3. Environment Variables

Add to your `.env.local` or Replit secrets:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 4. Next Steps

The auth system now uses Supabase Auth! Components will be gradually migrated to use the database.

### Data Migration Needed:
- Migrate properties from JSON to database
- Migrate existing applications to Supabase
- Set up RLS policies for data access
