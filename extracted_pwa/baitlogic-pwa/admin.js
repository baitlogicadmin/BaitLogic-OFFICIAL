(function () {
  const config = window.BAITLOGIC_CONFIG || {};
  const liveMode = config.mode === 'live' && config.supabaseUrl && config.supabaseAnonKey && window.supabase;
  const supabaseClient = liveMode ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { detectSessionInUrl: true, persistSession: true } }) : null;
  const demoKeys = {
    reports: 'baitlogic-demo-reports',
    catches: 'baitlogic-demo-catches',
    signups: 'baitlogic-demo-signups'
  };
  const authBlock = document.getElementById('authBlock');
  const sessionBlock = document.getElementById('sessionBlock');
  const adminEmail = document.getElementById('adminEmail');
  const authMessage = document.getElementById('authMessage');
  const sessionEmail = document.getElementById('sessionEmail');
  const sessionMode = document.getElementById('sessionMode');
  const pendingReports = document.getElementById('pendingReports');
  const pendingCatches = document.getElementById('pendingCatches');
  const latestSignups = document.getElementById('latestSignups');

  function loadDemo(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }
  function saveDemo(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function showStatus(text) { authMessage.textContent = text; }
  function setSignedIn(email, modeLabel) {
    authBlock.classList.add('hidden');
    sessionBlock.classList.remove('hidden');
    sessionEmail.textContent = email;
    sessionMode.textContent = modeLabel;
  }
  function setSignedOut() {
    authBlock.classList.remove('hidden');
    sessionBlock.classList.add('hidden');
  }
  function renderEmpty(target, text) { target.innerHTML = `<div class="empty-state">${esc(text)}</div>`; }

  function moderationCard(item, type, demo) {
    const title = type === 'report' ? item.name : item.species;
    const subtitle = type === 'report'
      ? `${item.water}${item.species ? ` · ${item.species}` : ''}`
      : `${item.location}${item.weight ? ` · ${item.weight}` : ''}`;
    const body = type === 'report' ? item.report : (item.notes || 'No notes');
    return `
      <article class="report-card">
        <div class="report-avatar">${esc((title || '?').charAt(0).toUpperCase())}</div>
        <div>
          <div class="report-meta"><strong>${esc(title)}</strong><span>${esc(new Date(item.created_at).toLocaleString())}</span></div>
          <p>${esc(body)}</p>
          <div class="subtle">${esc(subtitle)}</div>
          <div class="table-actions">
            <button class="small-button primary" data-action="approve" data-type="${type}" data-id="${esc(item.id)}">APPROVE</button>
            <button class="small-button" data-action="reject" data-type="${type}" data-id="${esc(item.id)}">REJECT</button>
            ${demo ? '<span class="tiny-note">Demo mode</span>' : ''}
          </div>
        </div>
      </article>
    `;
  }

  function signupCard(item) {
    return `
      <article class="report-card">
        <div class="report-avatar">${esc((item.name || '?').charAt(0).toUpperCase())}</div>
        <div>
          <div class="report-meta"><strong>${esc(item.name)}</strong><span>${esc(new Date(item.created_at).toLocaleString())}</span></div>
          <p>${esc(item.email)}</p>
          <div class="subtle">${esc(item.home_water || 'No home water')} · ${esc(item.interest || 'No interest')}</div>
        </div>
      </article>
    `;
  }

  async function loadDemoData() {
    const reports = loadDemo(demoKeys.reports).filter(item => item.status !== 'approved');
    const catches = loadDemo(demoKeys.catches).filter(item => item.status !== 'approved');
    const signups = loadDemo(demoKeys.signups).slice().reverse();
    pendingReports.innerHTML = reports.length ? reports.map(item => moderationCard(item, 'report', true)).join('') : '<div class="empty-state">No pending demo reports.</div>';
    pendingCatches.innerHTML = catches.length ? catches.map(item => moderationCard(item, 'catch', true)).join('') : '<div class="empty-state">No pending demo catches.</div>';
    latestSignups.innerHTML = signups.length ? signups.map(signupCard).join('') : '<div class="empty-state">No demo signups yet.</div>';
  }

  async function ensureAdminSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.user?.email) {
      setSignedOut();
      return null;
    }
    const { data, error } = await supabaseClient.rpc('is_admin');
    if (error || !data) {
      showStatus('Signed in but not authorized as admin. Add your email to admin_users.');
      await supabaseClient.auth.signOut();
      setSignedOut();
      return null;
    }
    setSignedIn(session.user.email, 'Supabase live mode');
    return session;
  }

  async function loadLiveData() {
    const session = await ensureAdminSession();
    if (!session) return;
    const [{ data: reports, error: reportsError }, { data: catches, error: catchesError }, { data: signups, error: signupsError }] = await Promise.all([
      supabaseClient.from('reports').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabaseClient.from('catches').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabaseClient.from('waitlist_signups').select('*').order('created_at', { ascending: false }).limit(20)
    ]);
    if (reportsError || catchesError || signupsError) {
      showStatus((reportsError || catchesError || signupsError).message || 'Unable to load admin data.');
      return;
    }
    pendingReports.innerHTML = reports.length ? reports.map(item => moderationCard(item, 'report', false)).join('') : '<div class="empty-state">No pending reports.</div>';
    pendingCatches.innerHTML = catches.length ? catches.map(item => moderationCard(item, 'catch', false)).join('') : '<div class="empty-state">No pending catches.</div>';
    latestSignups.innerHTML = signups.length ? signups.map(signupCard).join('') : '<div class="empty-state">No signups yet.</div>';
  }

  async function moderateLive(type, id, action) {
    const table = type === 'report' ? 'reports' : 'catches';
    const nextStatus = action === 'approve' ? 'approved' : 'rejected';
    const payload = { status: nextStatus };
    if (nextStatus === 'approved') payload.approved_at = new Date().toISOString();
    const { error } = await supabaseClient.from(table).update(payload).eq('id', id);
    if (error) throw error;
  }

  async function moderateDemo(type, id, action) {
    const key = type === 'report' ? demoKeys.reports : demoKeys.catches;
    const items = loadDemo(key);
    const next = items.map(item => item.id === id ? { ...item, status: action === 'approve' ? 'approved' : 'rejected', approved_at: new Date().toISOString() } : item);
    saveDemo(key, next);
  }

  document.body.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, type, id } = button.dataset;
    try {
      if (!liveMode) {
        await moderateDemo(type, id, action);
        await loadDemoData();
      } else {
        await moderateLive(type, id, action);
        await loadLiveData();
      }
    } catch (error) {
      showStatus(error.message || 'Moderation update failed.');
    }
  });

  document.getElementById('sendMagicLink')?.addEventListener('click', async () => {
    if (!liveMode) {
      showStatus('Demo mode active. Use Demo Admin instead.');
      return;
    }
    const email = String(adminEmail.value || '').trim().toLowerCase();
    if (!email) {
      showStatus('Enter your admin email.');
      return;
    }
    const { error } = await supabaseClient.auth.signInWithOtp({ email, options: { emailRedirectTo: config.adminRedirectUrl || window.location.href } });
    showStatus(error ? error.message : 'Magic link sent. Open it on this device to continue.');
  });

  document.getElementById('demoAdminLogin')?.addEventListener('click', async () => {
    setSignedIn('demo@baitlogic.local', 'Demo mode');
    showStatus('Demo admin enabled.');
    await loadDemoData();
  });

  document.getElementById('refreshAdmin')?.addEventListener('click', async () => {
    if (!liveMode) return loadDemoData();
    return loadLiveData();
  });

  document.getElementById('signOutAdmin')?.addEventListener('click', async () => {
    if (liveMode) await supabaseClient.auth.signOut();
    setSignedOut();
    showStatus('Signed out.');
  });

  async function boot() {
    if (!liveMode) {
      showStatus('Demo mode active. Add Supabase config to switch to live moderation.');
      return;
    }
    await loadLiveData();
    supabaseClient.auth.onAuthStateChange(async () => {
      await loadLiveData();
    });
  }

  boot();
})();
