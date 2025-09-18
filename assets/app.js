import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_NAME } from '../config.js';
import { openDB, idbPut, idbGetAll, outboxAdd, outboxAll, outboxClear, idbDelete } from './db.js';

const statusEl = document.getElementById('status');
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const authForms = document.getElementById('auth-forms');
const authLogged = document.getElementById('auth-logged');
const userEmail = document.getElementById('user-email');
document.getElementById('app-title').textContent = `🐝 ${APP_NAME}`;

const apiariesList = document.getElementById('apiaries-list');
const sidebarApiaries = document.getElementById('sidebar-apiaries');
const btnAddApiary = document.getElementById('btn-add-apiary');
const formApiary = document.getElementById('form-apiary');
const formHive = document.getElementById('form-hive');
const formInspection = document.getElementById('form-inspection');
const hivesSection = document.getElementById('hives-section');
const inspectionsSection = document.getElementById('inspections-section');
const currentApiaryName = document.getElementById('current-apiary-name');
const currentHiveCode = document.getElementById('current-hive-code');
const hivesList = document.getElementById('hives-list');
const inspectionsList = document.getElementById('inspections-list');

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
  updateAuthUI();

  supabase.auth.onAuthStateChange((_event, sess) => {
    sessionUser = sess?.user ?? null;
    updateAuthUI();
    if (sessionUser) { initialSync(); }
  });

  // Bind forms
  document.getElementById('btn-signup').addEventListener('click', signup);
  document.getElementById('btn-login').addEventListener('click', login);
  document.getElementById('btn-logout').addEventListener('click', logout);

  formApiary.addEventListener('submit', onAddApiary);
  formHive.addEventListener('submit', onAddHive);
  formInspection.addEventListener('submit', onAddInspection);

  // Load local data initially
  renderApiaries(await idbGetAll('apiaries'));
}

function updateAuthUI() {
  if (sessionUser) {
    authForms.classList.add('hidden');
    authLogged.classList.remove('hidden');
    appSection.classList.remove('hidden');
    userEmail.textContent = sessionUser.email || sessionUser.id;
    setStatus('Autenticato');
  } else {
    authForms.classList.remove('hidden');
    authLogged.classList.add('hidden');
    appSection.classList.add('hidden');
    setStatus('Non autenticato', false);
  }
}

async function signup() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!email || !password) return alert('Inserisci email e password');
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert(error.message);
  alert('Registrazione effettuata. Se richiesto, conferma l’email; poi usa Sign in.');
}

async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!email || !password) return alert('Inserisci email e password');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);
}

async function logout() {
  await supabase.auth.signOut();
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now();
}

async function onAddApiary(e) {
  e.preventDefault();
  if (!sessionUser) return alert('Accedi prima.');
  const id = uuid();
  const payload = {
    id,
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
  // Try remote
  const ok = await upsertRemote('apiaries', payload);
  if (!ok) await outboxAdd({ table:'apiaries', op:'upsert', payload });
}

async function onAddHive(e) {
  e.preventDefault();
  if (!sessionUser || !currentApiary) return alert('Seleziona un apiario e accedi.');
  const id = uuid();
  const payload = {
    id,
    user_id: sessionUser.id,
    apiary_id: currentApiary.id,
    code: document.getElementById('hive-code').value.trim(),
    queen_birth_date: document.getElementById('hive-queen-birth').value || null,
    note: document.getElementById('hive-note').value.trim() || null,
    created_at: new Date().toISOString()
  };
  await idbPut('hives', payload);
  renderHives(await idbGetAll('hives').then(arr => arr.filter(h => h.apiary_id === currentApiary.id)));
  formHive.reset();
  const ok = await upsertRemote('hives', payload);
  if (!ok) await outboxAdd({ table:'hives', op:'upsert', payload });
}

async function onAddInspection(e) {
  e.preventDefault();
  if (!sessionUser || !currentHive) return alert('Seleziona un alveare e accedi.');
  const id = uuid();
  const payload = {
    id,
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
  renderInspections(await idbGetAll('inspections').then(arr => arr.filter(x => x.hive_id === currentHive.id)));
  formInspection.reset();
  const ok = await upsertRemote('inspections', payload);
  if (!ok) await outboxAdd({ table:'inspections', op:'upsert', payload });
}

async function upsertRemote(table, payload) {
  if (!navigator.onLine || !sessionUser) return false;
  try {
    const { error } = await supabase.from(table).upsert(payload).select('id').single();
    if (error) {
      console.warn('Remote upsert error', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Remote upsert failed', e.message);
    return false;
  }
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

    const meta = document.createElement('div');
    meta.className = 'badge';
    meta.textContent = `${a.lat ?? '-'}, ${a.lon ?? '-'}`;

    const left = document.createElement('div');
    left.appendChild(title);
    left.appendChild(meta);
    if (a.note) {
      const small = document.createElement('small');
      small.textContent = a.note;
      left.appendChild(document.createElement('br'));
      left.appendChild(small);
    }

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    const openBtn = document.createElement('button');
    openBtn.textContent = 'Apri';
    openBtn.className = 'primary';
    openBtn.onclick = () => selectApiary(a);

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑';
    delBtn.title = 'Elimina';
    delBtn.className = 'btn-icon danger';
    delBtn.onclick = () => deleteApiary(a);

    actions.appendChild(openBtn);
    actions.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(actions);
    apiariesList.appendChild(li);
  }
}


function renderHives(items) {
  hivesList.innerHTML = '';
  for (const h of items) {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.innerHTML = `<strong>${h.code}</strong> <span class="badge">${h.queen_birth_date ?? ''}</span><br><small>${h.note ?? ''}</small>`;
    const right = document.createElement('div');
    const btn = document.createElement('button');
    btn.textContent = 'Ispezioni';
    btn.onclick = () => selectHive(h);
    right.appendChild(btn);
    li.appendChild(left);
    li.appendChild(right);
    hivesList.appendChild(li);
  }
}



async function deleteApiary(a) {
  if (!confirm(`Eliminare l'apiario "${a.name}"?`)) return;
  try {
    // Online required for remote delete (per evitare inconsistenze offline)
    if (!navigator.onLine) {
      alert('Eliminazione disponibile solo online per ora.');
      return;
    }
    // Remote delete
    const { error } = await supabase.from('apiaries').delete().eq('id', a.id);
    if (error) throw error;

    // Local cleanup: remove apiary + related hives/inspections
    const allHives = await idbGetAll('hives');
    const toDeleteHives = allHives.filter(h => h.apiary_id === a.id).map(h => h.id);
    for (const hid of toDeleteHives) {
      await idbDelete('hives', hid);
      const allInsp = await idbGetAll('inspections');
      for (const insp of allInsp) {
        if (insp.hive_id === hid) await idbDelete('inspections', insp.id);
      }
    }
    await idbDelete('apiaries', a.id);

    // Refresh UI
    renderApiaries(await idbGetAll('apiaries'));
    hivesSection.classList.add('hidden');
    inspectionsSection.classList.add('hidden');
    setStatus('Apiario eliminato');
  } catch (e) {
    console.error(e);
    alert('Errore durante eliminazione apiario: ' + (e.message || e));
  }
}
function renderInspections(items) {
  inspectionsList.innerHTML = '';
  items.sort((a,b)=> (b.visited_at||'').localeCompare(a.visited_at||''));
  for (const i of items) {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.innerHTML = `<strong>${new Date(i.visited_at).toLocaleString()}</strong> 
      <span class="badge">Regina: ${i.queen_seen ? '✓' : '—'}</span> 
      <span class="badge">Uova: ${i.eggs ? '✓' : '—'}</span> 
      <span class="badge">Telaini api: ${i.frames_bees ?? 0}</span> 
      <span class="badge">Scorte: ${i.stores_kg ?? 0} kg</span><br>
      <small>${i.note ?? ''}</small>`;
    li.appendChild(left);
    inspectionsList.appendChild(li);
  }
}

async function selectApiary(a) {
  currentApiary = a;
  currentApiaryName.textContent = a.name;
  hivesSection.classList.remove('hidden');
  inspectionsSection.classList.add('hidden');
  const all = await idbGetAll('hives');
  renderHives(all.filter(h => h.apiary_id === a.id));
}

async function selectHive(h) {
  currentHive = h;
  currentHiveCode.textContent = h.code;
  inspectionsSection.classList.remove('hidden');
  const all = await idbGetAll('inspections');
  renderInspections(all.filter(x => x.hive_id === h.id));
}

async function initialSync() {
  if (!navigator.onLine || !sessionUser) return;
  setStatus('Sincronizzazione...');
  try {
    // push outbox first
    await trySync();

    // pull latest from remote
    const tables = ['apiaries','hives','inspections'];
    for (const t of tables) {
      const { data, error } = await supabase.from(t).select('*').order('created_at', { ascending: true });
      if (error) throw error;
      // replace local copy
      for (const row of data) await idbPut(t, row);
    }
    renderApiaries(await idbGetAll('apiaries'));
    setStatus('Sincronizzato');
  } catch (e) {
    console.warn('Sync error', e.message);
    setStatus('Sync parziale', false);
  }
}

async function trySync() {
  if (!navigator.onLine || !sessionUser) return;
  const actions = await outboxAll();
  if (!actions.length) return;
  for (const a of actions) {
    await upsertRemote(a.table, a.payload);
  }
  await outboxClear();
}

init();


async function deleteRemote(table, match) {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supa.from(table).delete().match(match);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('deleteRemote failed, queued to outbox', e);
    return false;
  }
}

if (btnAddApiary) {
  btnAddApiary.onclick = async () => {
    if (!sessionUser) return alert('Accedi prima.');
    const name = prompt('Nome del nuovo apiario:');
    if (!name) return;
    const id = uuid();
    const payload = { id, user_id: sessionUser.id, name, created_at: new Date().toISOString() };
    await idbPut('apiaries', payload);
    renderApiaries(await idbGetAll('apiaries'));
    const ok = await upsertRemote('apiaries', payload);
    if (!ok) await outboxAdd({ table:'apiaries', op:'upsert', payload });
  };
}
