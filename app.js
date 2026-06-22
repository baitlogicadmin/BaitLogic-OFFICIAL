(function () {
  const config = window.BAITLOGIC_CONFIG || {};
  const liveMode = config.mode === 'live' && config.supabaseUrl && config.supabaseAnonKey && window.supabase;
  const supabaseClient = liveMode ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
  const demoKeys = {
    reports: 'baitlogic-demo-reports',
    catches: 'baitlogic-demo-catches',
    signups: 'baitlogic-demo-signups'
  };
  const demoSeed = {
    reports: [
      { id: 'demo-r1', name: 'Mike R.', water: 'Horseshoe Lake', species: 'Largemouth Bass', report: '5lb largemouth on a jig at Horseshoe Lake', status: 'approved', created_at: '2026-06-21T15:00:00.000Z' },
      { id: 'demo-r2', name: 'Sarah T.', water: 'Carlyle Lake', species: 'Crappie', report: 'Crappie stacked at 12ft, Carlyle Lake brush piles', status: 'approved', created_at: '2026-06-21T13:00:00.000Z' },
      { id: 'demo-r3', name: 'Dan W.', water: 'Mel Price', species: 'Channel Catfish', report: 'Channel cats hitting cut shad below Mel Price', status: 'approved', created_at: '2026-06-21T11:00:00.000Z' }
    ],
    catches: [
      { id: 'demo-c1', name: 'Local Angler', species: 'Largemouth Bass', weight: '4lb 8oz', location: 'Rend Lake', notes: 'Spinnerbait near grass edge', status: 'approved', created_at: '2026-06-21T10:30:00.000Z' }
    ],
    signups: []
  };

  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const reportList = document.getElementById('reportList');
  const catchList = document.getElementById('catchList');
  const reportCount = document.getElementById('reportCount');
  const catchCountStat = document.getElementById('catchCountStat');
  const signupForm = document.getElementById('signupForm');
  const signupMessage = document.getElementById('signupMessage');
  const reportForm = document.getElementById('reportForm');
  const catchForm = document.getElementById('catchForm');
  const installButton = document.getElementById('installButton');
  let deferredPrompt = null;

  function loadDemo(key, seed) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        localStorage.setItem(key, JSON.stringify(seed));
        return seed.slice();
      }
      return JSON.parse(raw);
    } catch {
      return seed.slice();
    }
  }

  function saveDemo(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ago(dateString) {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.max(1, Math.round(diff / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }

  function showToast(title, text) {
    const wrap = document.querySelector('.toast-wrap') || createToastWrap();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<strong>${esc(title)}</strong><div>${esc(text)}</div>`;
    wrap.appendChild(toast);
    setTimeout(() => toast.remove(), 4200);
  }

  function createToastWrap() {
    const wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
    return wrap;
  }

  function toggleMenu(open) {
    mobileMenu.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  }

  menuToggle?.addEventListener('click', () => toggleMenu(!mobileMenu.classList.contains('open')));
  mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => toggleMenu(false)));

  document.querySelectorAll('[data-open]').forEach(button => {
    button.addEventListener('click', () => {
      document.getElementById(button.dataset.open)?.classList.add('open');
    });
  });
  document.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => button.closest('.modal')?.classList.remove('open'));
  });
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', event => {
      if (event.target === modal) modal.classList.remove('open');
    });
  });

  function renderReports(items) {
    reportCount.textContent = String(items.length);
    if (!items.length) {
      reportList.innerHTML = '<div class="empty-state">No approved reports yet. Submit the first one.</div>';
      return;
    }
    reportList.innerHTML = items.map(item => `
      <article class="report-card">
        <div class="report-avatar">${esc((item.name || '?').charAt(0).toUpperCase())}</div>
        <div>
          <div class="report-meta"><strong>${esc(item.name)}</strong><span>${esc(ago(item.created_at))}</span></div>
          <p>${esc(item.report)}</p>
          <div class="subtle">${esc(item.water)}${item.species ? ` · ${esc(item.species)}` : ''}</div>
        </div>
      </article>
    `).join('');
  }

  function renderCatches(items) {
    catchCountStat.textContent = String(items.length);
    if (!items.length) {
      catchList.innerHTML = '<div class="empty-state">No approved catches yet. Log the first one.</div>';
      return;
    }
    catchList.innerHTML = items.map(item => `
      <article class="report-card">
        <div class="report-avatar">${esc((item.species || '?').charAt(0).toUpperCase())}</div>
        <div>
          <div class="report-meta"><strong>${esc(item.species)}</strong><span>${esc(ago(item.created_at))}</span></div>
          <p>${esc(item.location)}${item.weight ? ` · ${esc(item.weight)}` : ''}</p>
          <div class="subtle">${esc(item.notes || 'No notes added yet.')}</div>
        </div>
      </article>
    `).join('');
  }

  async function loadReports() {
    if (!liveMode) {
      const reports = loadDemo(demoKeys.reports, demoSeed.reports).filter(x => x.status === 'approved');
      renderReports(reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      return;
    }
    const { data, error } = await supabaseClient
      .from('reports')
      .select('id,name,water,species,report,status,created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(12);
    if (error) throw error;
    renderReports(data || []);
  }

  async function loadCatches() {
    if (!liveMode) {
      const catches = loadDemo(demoKeys.catches, demoSeed.catches).filter(x => x.status === 'approved');
      renderCatches(catches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      return;
    }
    const { data, error } = await supabaseClient
      .from('catches')
      .select('id,name,species,weight,location,notes,status,created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(12);
    if (error) throw error;
    renderCatches(data || []);
  }

  async function submitSignup(payload) {
    if (!liveMode) {
      const signups = loadDemo(demoKeys.signups, demoSeed.signups);
      const exists = signups.some(x => x.email.toLowerCase() === payload.email.toLowerCase());
      if (!exists) {
        signups.push({ ...payload, id: `demo-s-${Date.now()}`, created_at: new Date().toISOString() });
        saveDemo(demoKeys.signups, signups);
      }
      return { message: exists ? 'Already on the demo early-access list.' : 'Demo signup saved. Add Supabase config to go live.' };
    }
    const { error } = await supabaseClient.from('waitlist_signups').insert(payload);
    if (error && String(error.message || '').toLowerCase().includes('duplicate')) {
      return { message: 'You are already on the early-access list.' };
    }
    if (error) throw error;
    return { message: 'You are on the early-access list.' };
  }

  async function submitReport(payload) {
    if (!liveMode) {
      const reports = loadDemo(demoKeys.reports, demoSeed.reports);
      reports.unshift({ ...payload, id: `demo-r-${Date.now()}`, status: 'pending', created_at: new Date().toISOString() });
      saveDemo(demoKeys.reports, reports);
      return;
    }
    const { error } = await supabaseClient.from('reports').insert({ ...payload, status: 'pending' });
    if (error) throw error;
  }

  async function submitCatch(payload) {
    if (!liveMode) {
      const catches = loadDemo(demoKeys.catches, demoSeed.catches);
      catches.unshift({ ...payload, id: `demo-c-${Date.now()}`, status: 'pending', created_at: new Date().toISOString() });
      saveDemo(demoKeys.catches, catches);
      return;
    }
    const { error } = await supabaseClient.from('catches').insert({ ...payload, status: 'pending' });
    if (error) throw error;
  }

  signupForm?.addEventListener('submit', async event => {
    event.preventDefault();
    signupMessage.textContent = 'Submitting...';
    const payload = Object.fromEntries(new FormData(signupForm).entries());
    payload.email = String(payload.email || '').trim().toLowerCase();
    try {
      const result = await submitSignup(payload);
      signupMessage.textContent = result.message;
      signupForm.reset();
      showToast('BaitLogic', result.message);
    } catch (error) {
      signupMessage.textContent = error.message || 'Unable to save signup right now.';
    }
  });

  reportForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(reportForm).entries());
    try {
      await submitReport(payload);
      reportForm.reset();
      document.getElementById('reportModal')?.classList.remove('open');
      showToast('Report received', liveMode ? 'Your report is pending moderation.' : 'Demo report stored locally.');
      await loadReports();
    } catch (error) {
      showToast('Error', error.message || 'Unable to submit report right now.');
    }
  });

  catchForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(catchForm).entries());
    try {
      await submitCatch(payload);
      catchForm.reset();
      document.getElementById('catchModal')?.classList.remove('open');
      showToast('Catch received', liveMode ? 'Your catch is pending moderation.' : 'Demo catch stored locally.');
      await loadCatches();
    } catch (error) {
      showToast('Error', error.message || 'Unable to submit catch right now.');
    }
  });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    installButton?.classList.remove('hidden');
  });

  installButton?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.classList.add('hidden');
  });

  async function boot() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    if (!liveMode) {
      const banner = document.createElement('div');
      banner.className = 'shell pwa-banner';
      banner.innerHTML = '<strong>Demo mode is active.</strong><div class="tiny-note">To go live on Cloudflare + Supabase, copy values into config.js and run the SQL in sql/schema.sql.</div>';
      document.querySelector('.live-now')?.after(banner);
    }
    try {
      await Promise.all([loadReports(), loadCatches()]);
    } catch (error) {
      reportList.innerHTML = '<div class="empty-state">Unable to load reports right now.</div>';
      catchList.innerHTML = '<div class="empty-state">Unable to load catches right now.</div>';
      showToast('Connection issue', error.message || 'Could not reach the backend.');
    }
  }

  boot();
})();
