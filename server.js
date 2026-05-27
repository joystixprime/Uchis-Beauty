import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

const getAppData = async (key, fallback) => {
  const { data, error } = await supabase
    .from('app_data')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.value ?? fallback;
};

const saveAppData = async (key, value) => {
  const { error } = await supabase
    .from('app_data')
    .upsert({ key, value }, { onConflict: 'key' });

  if (error) {
    throw error;
  }

  return value;
};

const persistCollectionItem = async (key, item) => {
  const existing = await getAppData(key, []);
  const id = item.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const record = {
    ...item,
    id,
    createdAt: item.createdAt || existing.find((x) => x.id === id)?.createdAt || now,
    updatedAt: now,
  };

  const next = existing.some((x) => x.id === id)
    ? existing.map((x) => (x.id === id ? { ...x, ...record } : x))
    : [...existing, record];

  await saveAppData(key, next);
  return record;
};

const persistCollection = async (key, payload) => {
  if (Array.isArray(payload)) {
    const existing = await getAppData(key, []);
    const now = new Date().toISOString();
    const normalized = payload.map((item) => {
      const id = item.id || crypto.randomUUID();
      return {
        ...item,
        id,
        createdAt: item.createdAt || existing.find((x) => x.id === id)?.createdAt || now,
        updatedAt: now,
      };
    });
    await saveAppData(key, normalized);
    return normalized;
  }
  return persistCollectionItem(key, payload);
};

app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await getAppData('bookings', []);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load bookings' });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const booking = await persistCollection('bookings', req.body);
    res.status(Array.isArray(req.body) ? 200 : 201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to save booking' });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const messages = await getAppData('messages', []);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const message = await persistCollection('messages', req.body);
    res.status(Array.isArray(req.body) ? 200 : 201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to save message' });
  }
});

app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await getAppData('announcements', []);
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load announcements' });
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const announcement = await persistCollection('announcements', req.body);
    res.status(Array.isArray(req.body) ? 200 : 201).json(announcement);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to save announcement' });
  }
});

app.get('/api/staff', async (req, res) => {
  try {
    const staff = await getAppData('staff', []);
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load staff' });
  }
});

app.post('/api/staff', async (req, res) => {
  try {
    const staffRecord = await persistCollection('staff', req.body);
    res.status(Array.isArray(req.body) ? 200 : 201).json(staffRecord);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to save staff member' });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getAppData('settings', {});
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Settings payload must be an object' });
    }
    const saved = await saveAppData('settings', payload);
    res.json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});

// Export raw app_data (all keys)
app.get('/api/app-data', async (req, res) => {
  try {
    const { data, error } = await supabase.from('app_data').select('key, value');
    if (error) return res.status(500).json({ error: error.message || 'Failed to read app_data' });
    const obj = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to export app_data' });
  }
});

// Migration preview: suggest payloads for direct inserts into normalized tables
app.get('/api/migrate-preview', async (req, res) => {
  try {
    const { data, error } = await supabase.from('app_data').select('key, value');
    if (error) return res.status(500).json({ error: error.message || 'Failed to read app_data' });
    const appData = Object.fromEntries((data || []).map((r) => [r.key, r.value]));

    // Basic preview: map existing keys to suggested target tables
    const preview = {
      services: appData.services || [],
      products: appData.products || [],
      staff: appData.staff || [],
      bookings: appData.bookings || [],
      orders: appData.orders || [],
      announcements: appData.announcements || [],
      messages: appData.messages || [],
      settings: appData.settings || {},
    };

    // Provide lightweight suggestions where possible
    // (Note: IDs and foreign keys may need manual reconciliation.)
    res.json({ preview, note: 'IDs and relationships may need manual mapping. Use this JSON to craft INSERTs.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to generate migrate preview' });
  }
});

// CRUD routes for normalized tables
async function listTable(table, select = '*') {
  const { data, error } = await supabase.from(table).select(select);
  if (error) throw error;
  return data || [];
}

async function getById(table, id) {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function insertOne(table, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select();
  if (error) throw error;
  return data;
}

async function upsertOne(table, payload, conflict='id') {
  const { data, error } = await supabase.from(table).upsert(payload, { onConflict: conflict }).select();
  if (error) throw error;
  return data;
}

async function updateById(table, id, payload) {
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select();
  if (error) throw error;
  return data;
}

async function deleteById(table, id) {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select();
  if (error) throw error;
  return data;
}

// Generic CRUD generator for common tables
const crudTables = ['services','products','staff','announcements','messages','bookings','orders','customers'];
for (const t of crudTables) {
  app.get(`/api/${t}`, async (req, res) => {
    try { const rows = await listTable(t); res.json(rows); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.get(`/api/${t}/:id`, async (req, res) => {
    try { const row = await getById(t, req.params.id); if (!row) return res.status(404).json({ error: 'Not found' }); res.json(row); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.post(`/api/${t}`, async (req, res) => {
    try { const payload = req.body; const inserted = await insertOne(t, Array.isArray(payload) ? payload : [payload]); res.status(201).json(inserted); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.put(`/api/${t}/:id`, async (req, res) => {
    try { const updated = await updateById(t, req.params.id, req.body); res.json(updated); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.delete(`/api/${t}/:id`, async (req, res) => {
    try { const removed = await deleteById(t, req.params.id); res.json(removed); } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

// Settings: return object and allow bulk update
app.get('/api/settings/all', async (req, res) => {
  try {
    const rows = await listTable('settings');
    const obj = Object.fromEntries((rows || []).map(r => [r.key, r.value]));
    res.json(obj);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
  try {
    const payload = req.body; // expect object { key: value }
    if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Payload must be object of key->value' });
    const rows = Object.entries(payload).map(([k,v]) => ({ key: k, value: String(v) }));
    const upserted = await upsertOne('settings', rows, 'key');
    res.json(upserted);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Migration endpoint: best-effort insert for simple collections
app.post('/api/migrate', async (req, res) => {
  try {
    const { data, error } = await supabase.from('app_data').select('key, value');
    if (error) return res.status(500).json({ error: error.message });
    const appData = Object.fromEntries((data||[]).map(r=>[r.key,r.value]));
    const results = {};

    // Simple collections we can migrate safely: services, products, staff, announcements, messages
    const simple = ['services','products','staff','announcements','messages'];
    for (const k of simple) {
      const items = Array.isArray(appData[k]) ? appData[k] : [];
      if (!items.length) { results[k] = { migrated: 0 }; continue; }
      // ensure ids exist
      const normalized = items.map(it => ({ ...it, id: it.id || undefined }));
      const upserted = await upsertOne(k, normalized, 'id');
      results[k] = { migrated: Array.isArray(upserted) ? upserted.length : 0 };
    }

    // Settings
    if (appData.settings && typeof appData.settings === 'object') {
      const rows = Object.entries(appData.settings).map(([key, value]) => ({ key, value: String(value) }));
      const s = await upsertOne('settings', rows, 'key');
      results.settings = { migrated: Array.isArray(s) ? s.length : 0 };
    }

    res.json({ results, note: 'Bookings and orders migration are not automated; review migrate-preview for guidance.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Serve frontend in production from /dist
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Backend API server listening on http://localhost:${PORT}`);
});
