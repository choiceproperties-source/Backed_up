import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Error: Missing DATABASE_URL environment variable');
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

async function seedProperties() {
  try {
    console.log('🌱 Starting data seeding...');
    await client.connect();

    // Read properties JSON
    const propertiesPath = path.join(__dirname, '../client/src/data/properties.json');
    const propertiesData = JSON.parse(fs.readFileSync(propertiesPath, 'utf-8'));

    // Transform properties for database
    const transformedProperties = propertiesData.map((prop: any) => ({
      id: uuidv4(),
      owner_id: null,
      title: prop.title,
      price: prop.price,
      address: prop.address,
      city: prop.city,
      state: prop.state,
      zip_code: prop.zip,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      square_feet: prop.sqft,
      description: prop.description,
      property_type: prop.type,
      images: JSON.stringify(prop.images),
      status: prop.status || 'available',
      pets_allowed: prop.pet_friendly || false,
      furnished: prop.furnished || false,
      amenities: JSON.stringify(prop.amenities || [])
    }));

    // Insert properties
    for (const prop of transformedProperties) {
      await client.query(
        `INSERT INTO properties (id, owner_id, title, price, address, city, state, zip_code, bedrooms, bathrooms, square_feet, description, property_type, images, status, pets_allowed, furnished, amenities)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (id) DO NOTHING`,
        [prop.id, prop.owner_id, prop.title, prop.price, prop.address, prop.city, prop.state, prop.zip_code, 
         prop.bedrooms, prop.bathrooms, prop.square_feet, prop.description, prop.property_type, prop.images, 
         prop.status, prop.pets_allowed, prop.furnished, prop.amenities]
      );
    }

    console.log(`✅ Successfully seeded ${transformedProperties.length} properties!`);
    await client.end();

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedProperties();
