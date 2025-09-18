import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_NAME } from '../config.js';
import { openDB, idbPut, idbGetAll, idbDelete, outboxAdd, outboxAll, outboxClear } from './db.js';

const statusEl = document.getElementById('status');
document.getElementById('app-title').textContent = `🐝 ${APP_NAME}`;

const apiariesList = document.getElementById('apiaries-list');
const formApiary = document.getElementById('form-apiary');
const formHive = document.getElementById('form-hive');
const formInspection = document.getElementById('form-inspection');
const hivesSection = document.getElementById('hives-section');
const inspectionsSection = document.getElementById('inspections-section');
const dashboardTitle = document.getElementById('dashboard-title');
const dashboardDetails = document.getElementById('dashboard-details');

let supabase, sessionUser = null;
let currentApiary = null;
let currentHive = null;

function setStatus(text, ok=true) {
  statusEl.textContent = (navigator.onLine ? 'Online' : 'Offline') + ' · ' + text;
  statusEl.style.borderColor = ok ? '#22c55e' : '#ef4444';
}

window.addEventListener('online', () => { setStatus('Connessione ripristinata'); trySync(); });
window.addEventListener('offline', () => setStatus('Connessione assente', false));

async function init() {
  await openDB();
  setStatus('Avvio...');
  const mod = await import('https://esm.sh/@supabase/supabase-js@2');
  supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Auth state
  const { data: { session } } = await supabase.auth.getSession();
  sessionUser = session?.user ?? null;

  // Bind forms
  formApiary.addEventListener('submit', onAddApiary);
  formHive.addEventListener('submit', onAddHive);
  formInspection.addEventListener('submit', onAddInspection);

  // Load local data initially
  renderApiaries(await idbGetAll('apiaries'));
}

async function onAddApiary(e) {
  e.preventDefault();
  if (!sessionUser) return alert('Accedi prima.');
  const payload = {
    id: crypto.randomUUID(),
    user_id: sessionUser.id,
    name: document.getElementById('apiary-name').value.trim(),
    lat: parseFloat(document.getElementById('apiary-lat').value) || null,
    lon: parseFloat(document.getElementById('apiary-lon').value) || null,
    note: document.getElementById('apiary-note').value.trim() || null,
    created_at: new Date().toISOString()
  };
  await idbPut('apiaries', payload);
  renderApiaries(await idbGetAll('apiaries'));
  formApiary.reset();
  await upsertRemote('apiaries', payload);
}

async function deleteApiary(a) {
  if (!confirm(`Eliminare l'apiario "${a.name}"?`)) return;
  await supabase.from('apiaries').delete().eq('id', a.id);
  await idbDelete('apiaries', a.id);
  renderApiaries(await idbGetAll('apiaries'));
  dashboardTitle.textContent = 'Seleziona un apiario dalla lista';
  dashboardDetails.classList.add('hidden');
  hivesSection.classList.add('hidden');
  inspectionsSection.classList.add('hidden');
}

function renderApiaries(items) {
  apiariesList.innerHTML = '';
  items.sort((a,b) => (a.created_at||'').localeCompare(b.created_at||''));

  for (const a of items) {
    const li = document.createElement('li');
    const title = document.createElement('a');
    title.textContent = a.name;
    title.className = 'apiary-item-title';
    title.href = '#';
    title.onclick = (e) => { e.preventDefault(); selectApiary(a); };

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑';
    delBtn.className = 'btn-icon danger';
    delBtn.onclick = () => deleteApiary(a);

    li.appendChild(title);
    li.appendChild(delBtn);
    apiariesList.appendChild(li);
  }
}

async function selectApiary(a) {
  currentApiary = a;
  dashboardTitle.textContent = a.name;
  dashboardDetails.classList.remove('hidden');
  dashboardDetails.innerHTML = `<p><strong>Lat:</strong> ${a.lat ?? '-'} | <strong>Lon:</strong> ${a.lon ?? '-'}</p><p>${a.note ?? ''}</p>`;
  hivesSection.classList.remove('hidden');
  inspectionsSection.classList.remove('hidden');
  renderHives((await idbGetAll('hives')).filter(h => h.apiary_id === a.id));
}

async function onAddHive(e) {
  e.preventDefault();
  if (!sessionUser || !currentApiary) return alert('Seleziona un apiario e accedi.');
  const payload = {
    id: crypto.randomUUID(),
    user_id: sessionUser.id,
    apiary_id: currentApiary.id,
    code: document.getElementById('hive-code').value.trim(),
    queen_birth_date: document.getElementById('hive-queen-birth').value || null,
    note: document.getElementById('hive-note').value.trim() || null,
    created_at: new Date().toISOString()
  };
  await idbPut('hives', payload);
  renderHives((await idbGetAll('hives')).filter(h => h.apiary_id === currentApiary.id));
  formHive.reset();
  await upsertRemote('hives', payload);
}

function renderHives(items) {
  const list = document.getElementById('hives-list');
  list.innerHTML = '';
  for (const h of items) {
    const li = document.createElement('li');
    li.textContent = h.code + (h.note ? ' - ' + h.note : '');
    li.onclick = () => selectHive(h);
    list.appendChild(li);
  }
}

async function selectHive(h) {
  currentHive = h;
  renderInspections((await idbGetAll('inspections')).filter(x => x.hive_id === h.id));
}

async function onAddInspection(e) {
  e.preventDefault();
  if (!sessionUser || !currentHive) return alert('Seleziona un alveare e accedi.');
  const payload = {
    id: crypto.randomUUID(),
    user_id: sessionUser.id,
    hive_id: currentHive.id,
    visited_at: new Date().toISOString(),
    queen_seen: document.getElementById('queen-seen').checked,
    eggs: document.getElementById('eggs').checked,
    frames_bees: parseInt(document.getElementById('frames-bees').value || '0', 10),
    stores_kg: parseFloat(document.getElementById('stores-kg').value || '0'),
    note: document.getElementById('inspection-note').value.trim() || null,
    created_at: new Date().toISOString()
  };
  await idbPut('inspections', payload);
  renderInspections((await idbGetAll('inspections')).filter(x => x.hive_id === currentHive.id));
  formInspection.reset();
  await upsertRemote('inspections', payload);
}

function renderInspections(items) {
  const list = document.getElementById('inspections-list');
  list.innerHTML = '';
  for (const i of items) {
    const li = document.createElement('li');
    li.textContent = `${new Date(i.visited_at).toLocaleDateString()} - Regina:${i.queen_seen?'✓':'—'} Uova:${i.eggs?'✓':'—'} Scorte:${i.stores_kg ?? 0}kg`;
    list.appendChild(li);
  }
}

async function upsertRemote(table, payload) {
  if (!navigator.onLine || !sessionUser) return false;
  try {
    const { error } = await supabase.from(table).upsert(payload).select('id').single();
    if (error) return false;
    return true;
  } catch { return false; }
}

async function trySync() {
  if (!navigator.onLine || !sessionUser) return;
  const actions = await outboxAll();
  for (const a of actions) await upsertRemote(a.table, a.payload);
  await outboxClear();
}

init();
