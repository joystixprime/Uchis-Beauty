import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase config');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const appDataKeys = ['products','services','messages','announcements'];
for (const key of appDataKeys) {
  const { data, error } = await supabase.from('app_data').select('key, value').eq('key', key);
  console.log('--- APP_DATA key:', key);
  if (error) { console.error('ERROR', key, error.message); continue; }
  console.log(' rows', data.length);
  if (data.length === 0) continue;
  const val = data[0].value;
  if (!Array.isArray(val)) { console.log(' not array'); continue; }
  const ids = new Map();
  const labels = new Map();
  for (const item of val) {
    const id = item?.id;
    const label = item?.name || item?.text || item?.title || JSON.stringify(item);
    if (id) {
      ids.set(id, (ids.get(id) || 0) + 1);
    }
    labels.set(label, (labels.get(label) || 0) + 1);
  }
  const idDups = Array.from(ids.entries()).filter(([,c]) => c > 1);
  const labelDups = Array.from(labels.entries()).filter(([,c]) => c > 1).slice(0,10);
  console.log(' total items', val.length, 'id dups', idDups.length, 'label dups', labelDups.length);
  if (idDups.length) console.log(' ids', idDups.slice(0,10));
  if (labelDups.length) console.log(' labels', labelDups);
}

const tables = ['products','services','messages','announcements'];
for (const table of tables) {
  console.log('--- TABLE:', table);
  const { data, error } = await supabase.from(table).select('*').limit(200);
  if (error) {
    console.error(' table error', table, error.message);
    continue;
  }
  console.log(' rows', data.length);
  if (!data.length) continue;
  const ids = new Map();
  const labels = new Map();
  data.forEach((item) => {
    if (item?.id) ids.set(item.id, (ids.get(item.id) || 0) + 1);
    const label = Object.values(item).filter(v => typeof v === 'string').join('|');
    labels.set(label, (labels.get(label) || 0) + 1);
  });
  const idDups = Array.from(ids.entries()).filter(([,c]) => c > 1);
  const labelDups = Array.from(labels.entries()).filter(([,c]) => c > 1).slice(0,10);
  console.log(' unique ids', ids.size, 'id dups', idDups.length, 'label dups', labelDups.length);
  if (idDups.length) console.log(' ids', idDups.slice(0,10));
  if (labelDups.length) console.log(' labels', labelDups);
  console.log(' sample row fields', Object.keys(data[0]));
}
