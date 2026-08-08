require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-this-admin-key';
const SITE_TITLE = process.env.SITE_TITLE || 'BaitLogic';
const PUBLIC_DIR = path.join(__dirname, 'public');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gibaaxzltpdizayvicgf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_oUyldV6BybbdjH3GhVRzqw_uVLKl_xN';

const nowIso = () => new Date().toISOString();
const toText = (value, max = 300) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const naturePhotoPrefix = `${SUPABASE_URL}/storage/v1/object/public/nature-checks/`;
const rewardCode = () => `BL-NC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

async function supabaseRequest(pathname, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase error ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const rateMap = new Map();
function rateLimit(req, res, next) {
  const key = `${req.ip}:${req.path}`;
  const current = rateMap.get(key) || { count: 0, start: Date.now() };
  if (Date.now() - current.start > 60000) {
    rateMap.set(key, { count: 1, start: Date.now() });
    return next();
  }
  if (current.count >= 30) return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  current.count++;
  rateMap.set(key, current);
  next();
}

function adminAuth(req, res, next) {
  const supplied = req.headers['x-admin-key'] || req.query.key;
  if (!supplied || supplied !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '250kb' }));
app.use(express.urlencoded({ extended: false }));
app.use('/api', rateLimit);
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

app.get('/api/health', (req, res) => res.json({ ok: true, siteTitle: SITE_TITLE, storage: 'supabase', timestamp: nowIso() }));

app.get('/api/reports', async (req, res, next) => {
  try {
    const reports = await supabaseRequest('reports?select=id,category,name,water,report,gps,created_at&order=created_at.desc&limit=50');
    res.json({ reports: reports || [] });
  } catch (error) { next(error); }
});

app.post('/api/reports', async (req, res, next) => {
  try {
    const category = toText(req.body.category, 50) || 'Fishing';
    const name = toText(req.body.name, 60);
    const water = toText(req.body.water, 80);
    const report = toText(req.body.report, 400);
    const gps = toText(req.body.gps, 100);
    if (!name || !water || !report) return res.status(400).json({ error: 'Name, water, and report are required.' });

    const rows = await supabaseRequest('reports', {
      method: 'POST',
      body: JSON.stringify({ category, name, water, report, gps: gps || null, created_at: nowIso() })
    });

    res.status(201).json({ message: 'Report published.', report: rows?.[0] || null });
  } catch (error) { next(error); }
});

app.get('/api/catches', async (req, res, next) => {
  try {
    const rows = await supabaseRequest('public_catches?select=id,species,weight_lb,location,notes,created_at&order=created_at.desc&limit=50');
    const catches = (rows || []).map((row) => ({
      id: row.id,
      species: row.species,
      weight: row.weight_lb == null ? null : Number(row.weight_lb),
      location: row.location || '',
      notes: row.notes || '',
      createdAt: row.created_at
    }));
    res.json({ catches });
  } catch (error) { next(error); }
});

app.post('/api/catches', async (req, res, next) => {
  try {
    const species = toText(req.body.species, 80);
    const location = toText(req.body.location, 120);
    const notes = toText(req.body.notes, 500);
    const rawWeight = req.body.weight;
    const weightNumber = rawWeight === '' || rawWeight == null ? null : Number(rawWeight);

    if (!species) return res.status(400).json({ error: 'Species is required.' });
    if (weightNumber !== null && (!Number.isFinite(weightNumber) || weightNumber < 0 || weightNumber > 500)) {
      return res.status(400).json({ error: 'Weight must be between 0 and 500 pounds.' });
    }

    const rows = await supabaseRequest('public_catches', {
      method: 'POST',
      body: JSON.stringify({
        species,
        weight_lb: weightNumber === null ? null : Number(weightNumber.toFixed(2)),
        location: location || null,
        notes: notes || null,
        created_at: nowIso()
      })
    });

    const row = rows?.[0] || null;
    res.status(201).json({
      message: 'Catch saved.',
      catch: row ? {
        id: row.id,
        species: row.species,
        weight: row.weight_lb == null ? null : Number(row.weight_lb),
        location: row.location || '',
        notes: row.notes || '',
        createdAt: row.created_at
      } : null
    });
  } catch (error) { next(error); }
});

app.post('/api/nature-checks', async (req, res, next) => {
  try {
    const displayName = toText(req.body.display_name, 60);
    const water = toText(req.body.water, 120);
    const notes = toText(req.body.notes, 500);
    const gps = toText(req.body.gps, 100);
    const beforeUrl = toText(req.body.before_url, 500);
    const afterUrl = toText(req.body.after_url, 500);
    const bags = Number(req.body.bags || 1);

    if (!displayName || !water) return res.status(400).json({ error: 'Name and water are required.' });
    if (!Number.isInteger(bags) || bags < 1 || bags > 50) return res.status(400).json({ error: 'Cleanup amount must be between 1 and 50 bags.' });
    if (!afterUrl || !afterUrl.startsWith(naturePhotoPrefix)) return res.status(400).json({ error: 'A valid cleanup photo is required.' });
    if (beforeUrl && !beforeUrl.startsWith(naturePhotoPrefix)) return res.status(400).json({ error: 'Before photo URL is invalid.' });

    const code = rewardCode();
    const rows = await supabaseRequest('nature_checks', {
      method: 'POST',
      body: JSON.stringify({
        display_name: displayName,
        water,
        action_type: 'shoreline_cleanup',
        before_url: beforeUrl || null,
        after_url: afterUrl,
        notes: notes || null,
        gps: gps || null,
        bags,
        status: 'submitted',
        reward_code: code,
        created_at: nowIso()
      })
    });

    const row = rows?.[0] || null;
    res.status(201).json({
      message: 'Nature-Check recorded and queued for review.',
      natureCheck: {
        id: row?.id || null,
        displayName,
        water,
        bags,
        rewardCode: code,
        status: 'submitted'
      }
    });
  } catch (error) { next(error); }
});

app.get('/api/nature-checks', async (req, res, next) => {
  try {
    const rows = await supabaseRequest('nature_checks?select=id,display_name,water,bags,after_url,created_at&status=eq.approved&order=created_at.desc&limit=25');
    res.json({ natureChecks: rows || [] });
  } catch (error) { next(error); }
});

app.post('/api/signups', async (req, res, next) => {
  try {
    const name = toText(req.body.name, 80);
    const email = toText(req.body.email, 120).toLowerCase();
    if (!name || !validEmail(email)) return res.status(400).json({ error: 'Valid name and email required.' });

    await supabaseRequest('signups', {
      method: 'POST',
      body: JSON.stringify({ name, email, created_at: nowIso() })
    });

    res.status(201).json({ message: 'You are on the BaitLogic early access list.' });
  } catch (error) { next(error); }
});

app.get('/api/admin/summary', adminAuth, async (req, res, next) => {
  try {
    const [reports, catches, natureChecks] = await Promise.all([
      supabaseRequest('reports?select=id'),
      supabaseRequest('public_catches?select=id'),
      supabaseRequest('nature_checks?select=id&status=eq.approved')
    ]);
    res.json({
      reports: reports?.length || 0,
      catches: catches?.length || 0,
      natureChecks: natureChecks?.length || 0,
      signups: 'protected'
    });
  } catch (error) { next(error); }
});

app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(PORT, () => console.log(`${SITE_TITLE} listening on port ${PORT}`));

module.exports = app;
