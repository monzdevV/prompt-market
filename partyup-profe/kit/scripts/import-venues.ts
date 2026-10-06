/**
 * PARTYUP Venue Import Script
 * ============================
 * Reads the GeoJSON file and bulk-upserts venues into Supabase.
 *
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/import-venues.ts
 *
 * Requires the service role key (not the anon key) to bypass RLS.
 * Idempotent: safe to run multiple times (upserts by osm_id).
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BATCH_SIZE = 500;
const GEOJSON_PATH = path.resolve(__dirname, '../assets/discotecas/discotecas.geojson');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ============================================
// PROPERTY EXTRACTION
// ============================================

/** Keys that map directly to dedicated columns in the venues table. */
const DEDICATED_KEYS = new Set([
  '@id', 'name', 'amenity',
  'addr:city', 'addr:street', 'addr:housenumber', 'addr:postcode',
  'phone', 'contact:phone',
  'email', 'contact:email',
  'website', 'contact:website',
  'opening_hours',
  'wheelchair',
  'outdoor_seating', 'indoor_seating', 'air_conditioning',
  'smoking', 'live_music', 'min_age', 'cuisine',
  'contact:facebook', 'contact:instagram', 'contact:twitter',
  'contact:tiktok', 'contact:threads',
]);

function parseBoolean(value: unknown): boolean | null {
  if (value === 'yes' || value === true) return true;
  if (value === 'no' || value === false) return false;
  return null;
}

interface VenueRow {
  osm_id: string;
  name: string;
  amenity: string | null;
  latitude: number;
  longitude: number;
  address_city: string | null;
  address_street: string | null;
  address_housenumber: string | null;
  address_postcode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  opening_hours: string | null;
  wheelchair: string | null;
  outdoor_seating: boolean | null;
  indoor_seating: boolean | null;
  air_conditioning: boolean | null;
  smoking: string | null;
  live_music: boolean | null;
  min_age: string | null;
  cuisine: string | null;
  contact_facebook: string | null;
  contact_instagram: string | null;
  contact_twitter: string | null;
  contact_tiktok: string | null;
  contact_threads: string | null;
  extra_properties: Record<string, unknown>;
}

function extractVenueRow(feature: any): VenueRow | null {
  const props = feature.properties ?? {};
  const geom = feature.geometry;

  // Skip features without a name (not useful for UI)
  if (!props.name) return null;

  // Skip features without valid Point geometry
  if (!geom || geom.type !== 'Point' || !geom.coordinates) return null;

  const [longitude, latitude] = geom.coordinates;
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return null;

  const osmId = props['@id'] ?? feature.id;
  if (!osmId) return null;

  // Collect extra properties (everything not in dedicated columns)
  const extraProperties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!DEDICATED_KEYS.has(key) && key !== '@geometry') {
      extraProperties[key] = value;
    }
  }

  return {
    osm_id: String(osmId),
    name: String(props.name),
    amenity: props.amenity ? String(props.amenity) : null,
    latitude,
    longitude,
    address_city: props['addr:city'] ? String(props['addr:city']) : null,
    address_street: props['addr:street'] ? String(props['addr:street']) : null,
    address_housenumber: props['addr:housenumber'] ? String(props['addr:housenumber']) : null,
    address_postcode: props['addr:postcode'] ? String(props['addr:postcode']) : null,
    phone: props.phone ? String(props.phone) : (props['contact:phone'] ? String(props['contact:phone']) : null),
    email: props.email ? String(props.email) : (props['contact:email'] ? String(props['contact:email']) : null),
    website: props.website ? String(props.website) : (props['contact:website'] ? String(props['contact:website']) : null),
    opening_hours: props.opening_hours ? String(props.opening_hours) : null,
    wheelchair: props.wheelchair ? String(props.wheelchair) : null,
    outdoor_seating: parseBoolean(props.outdoor_seating),
    indoor_seating: parseBoolean(props.indoor_seating),
    air_conditioning: parseBoolean(props.air_conditioning),
    smoking: props.smoking ? String(props.smoking) : null,
    live_music: parseBoolean(props.live_music),
    min_age: props.min_age ? String(props.min_age) : null,
    cuisine: props.cuisine ? String(props.cuisine) : null,
    contact_facebook: props['contact:facebook'] ? String(props['contact:facebook']) : null,
    contact_instagram: props['contact:instagram'] ? String(props['contact:instagram']) : null,
    contact_twitter: props['contact:twitter'] ? String(props['contact:twitter']) : null,
    contact_tiktok: props['contact:tiktok'] ? String(props['contact:tiktok']) : null,
    contact_threads: props['contact:threads'] ? String(props['contact:threads']) : null,
    extra_properties: extraProperties,
  };
}

// ============================================
// BATCH UPSERT
// ============================================

async function upsertBatch(rows: VenueRow[]): Promise<number> {
  // Use raw SQL via rpc to set the geography column with ST_MakePoint
  const values = rows.map((r) => ({
    ...r,
    location: `SRID=4326;POINT(${r.longitude} ${r.latitude})`,
  }));

  const { error, count } = await supabase
    .from('venues')
    .upsert(values, { onConflict: 'osm_id', ignoreDuplicates: false, count: 'exact' })
    .select('id');

  if (error) {
    console.error(`Batch upsert failed: ${error.message}`);
    return 0;
  }

  return count ?? rows.length;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('Reading GeoJSON file...');
  const raw = fs.readFileSync(GEOJSON_PATH, 'utf-8');

  console.log('Parsing GeoJSON...');
  const geojson = JSON.parse(raw);
  const features: any[] = geojson.features ?? [];
  console.log(`Found ${features.length} features.`);

  // Extract valid venue rows
  const rows: VenueRow[] = [];
  let skipped = 0;

  for (const feature of features) {
    const row = extractVenueRow(feature);
    if (row) {
      rows.push(row);
    } else {
      skipped++;
    }
  }

  console.log(`Extracted ${rows.length} venues (skipped ${skipped} features without name or valid geometry).`);

  if (rows.length === 0) {
    console.log('No venues to import.');
    return;
  }

  // Batch upsert
  let totalUpserted = 0;
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    const count = await upsertBatch(batch);
    totalUpserted += count;

    console.log(`Batch ${batchNumber}/${totalBatches}: upserted ${count} venues (${totalUpserted}/${rows.length} total).`);
  }

  console.log(`Import complete. ${totalUpserted} venues upserted.`);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
