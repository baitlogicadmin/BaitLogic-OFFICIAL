require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-this-admin-key';
const SITE_TITLE = process.env.SITE_TITLE || 'BaitLogic';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const seedStore = {
  signups: [],
  reports: [
    { id: 'seed-mike-r', category: 'Fishing', name: 'Mike R.', water: 'Horseshoe Lake', report: '5lb largemouth on a jig at Horseshoe Lake', createdAt: '2026-06-21T15:00:00.000Z' },
    { id: 'seed-sarah-t', category: 'Fishing', name: 'Sarah T.', water: 'Carlyle Lake', report: 'Crappie stacked at 12ft near brush piles', createdAt: '2026-06-21T13:00:00.000Z' }
  ],
  catches: []
};

const safeArray = (value) => Array.isArray(value) ? value : [];
const normalizeStore = (store) => ({
  signups: safeArray(store?.signups),
  reports: safeArray(store?.reports),
  catches: safeArray(store?.catches)
});

async function ensureDataFile() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) await fsp.writeFile(DATA_FILE, JSON.stringify(seedStore, null, 2));
}

async function readStore() {
  await ensureDataFile();
  try { return normalizeStore(JSON.parse(await fsp.readFile(DATA_FILE, 'utf8'))); }
  catch { return normalizeStore(seedStore); }
}

let writeQueue = Promise.resolve();
function writeStore(nextStore) {
  writeQueue = writeQueue.then(() => fsp.writeFile(DATA_FILE, JSON.stringify(normalizeStore(nextStore), null, 2)));
  return writeQueue;
}

const nowIso = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const toText = (value, max = 300) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

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

app.get('/api/health', (req, res) => res.json({ ok: true, siteTitle: SITE_TITLE, timestamp: nowIso() }));

app.get('/api/reports', async (req, res, next) => {
  try {
    const store = await readStore();
    const reports = [...store.reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
    res.json({ reports });
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
    const store = await readStore();
    const entry = { id: makeId('report'), category, name, water, report, gps, createdAt: nowIso() };
    store.reports.push(entry);
    await writeStore(store);
    res.status(201).json({ message: 'Report published.', report: entry });
  } catch (error) { next(error); }
});

app.get('/api/catches', async (req, res, next) => {
  try {
    const store = await readStore();
    const catches = [...store.catches]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);
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

    const store = await readStore();
    const entry = {
      id: makeId('catch'),
      species,
      weight: weightNumber === null ? null : Number(weightNumber.toFixed(2)),
      location,
      notes,
      createdAt: nowIso()
    };
    store.catches.push(entry);
    await writeStore(store);
    res.status(201).json({ message: 'Catch saved.', catch: entry });
  } catch (error) { next(error); }
});

app.post('/api/signups', async (req, res, next) => {
  try {
    const name = toText(req.body.name, 80);
    const email = toText(req.body.email, 120).toLowerCase();
    if (!name || !validEmail(email)) return res.status(400).json({ error: 'Valid name and email required.' });
    const store = await readStore();
    store.signups.push({ id: makeId('signup'), name, email, createdAt: nowIso() });
    await writeStore(store);
    res.status(201).json({ message: 'You are on the early access list.' });
  } catch (error) { next(error); }
});

app.get('/api/admin/summary', adminAuth, async (req, res, next) => {
  try {
    const store = await readStore();
    res.json({ signups: store.signups.length, reports: store.reports.length, catches: store.catches.length });
  } catch (error) { next(error); }
});

app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

ensureDataFile()
  .then(() => app.listen(PORT, () => console.log(`${SITE_TITLE} listening on port ${PORT}`)))
  .catch((error) => {
    console.error('Failed to initialize BaitLogic data store', error);
    process.exit(1);
  });
