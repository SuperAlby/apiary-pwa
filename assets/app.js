// assets/app.js

// Inizializzazione Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Riferimenti agli elementi DOM (alcuni potrebbero non esistere sempre)
const DOMElements = {
  authContainer: document.getElementById('auth-container'),
  appContent: document.getElementById('app-content'),
  authForms: document.getElementById('auth-forms'),
  authLogged: document.getElementById('auth-logged'),
  userEmail: document.getElementById('user-email'),
  emailInput: document.getElementById('email'),
  passwordInput: document.getElementById('password'),
  btnLogin: document.getElementById('btn-login'),
  btnSignup: document.getElementById('btn-signup'),
  btnLogout: document.getElementById('btn-logout'),
  status: document.getElementById('status'),
  formApiary: document.getElementById('form-apiary'),
  apiaryName: document.getElementById('apiary-name'),
  apiariesList: document.getElementById('apiaries-list'),
  currentApiaryName: document.getElementById('current-apiary-name'),
  welcomeMessage: document.getElementById('welcome-message'),
  hivesSection: document.getElementById('hives-section'),
  formHive: document.getElementById('form-hive'),
  hiveCode: document.getElementById('hive-code'),
  hivesList: document.getElementById('hives-list'),
  inspectionsSection: document.getElementById('inspections-section'),
  currentHiveCode: document.getElementById('current-hive-code'),
  formInspection: document.getElementById('form-inspection'),
  inspectionsList: document.getElementById('inspections-list'),
};

// Helper: attacca un listener solo se l'elemento esiste
const on = (el, ev, handler) => { if (el) el.addEventListener(ev, handler); };

// Stato globale
let currentApiary = null;
let currentHive = null;

// ========== FUNZIONI UI ==========
function showStatus(msg) {
  if (DOMElements.status) DOMElements.status.textContent = msg;
}
function showSection(section) {
  if (DOMElements.authContainer) DOMElements.authContainer.style.display = (section === 'auth') ? 'block' : 'none';
  if (DOMElements.appContent) DOMElements.appContent.style.display = (section === 'app') ? 'block' : 'none';
}
function renderApiaries(apiaries) {
  if (!DOMElements.apiariesList) return;
  DOMElements.apiariesList.innerHTML = '';
  apiaries.forEach(a => {
    const li = document.createElement('li');
    li.textContent = a.name;
    li.addEventListener('click', () => selectApiary(a));
    DOMElements.apiariesList.appendChild(li);
  });
}
function renderHives(hives) {
  if (!DOMElements.hivesList) return;
  DOMElements.hivesList.innerHTML = '';
  hives.forEach(h => {
    const li = document.createElement('li');
    li.textContent = h.label;
    li.addEventListener('click', () => selectHive(h));
    DOMElements.hivesList.appendChild(li);
  });
}
function renderInspections(inspections) {
  if (!DOMElements.inspectionsList) return;
  DOMElements.inspectionsList.innerHTML = '';
  inspections.forEach(ins => {
    const li = document.createElement('li');
    li.textContent = `${ins.inspected_at}: regina ${ins.queen_seen ? 'vista' : 'no'}`;
    DOMElements.inspectionsList.appendChild(li);
  });
}

// ========== FUNZIONI DATI ==========
async function loadApiaries() {
  const { data, error } = await supabaseClient.from('apiaries').select('*').order('created_at', { ascending: false });
  if (!error) renderApiaries(data);
}
async function selectApiary(apiary) {
  currentApiary = apiary;
  if (DOMElements.currentApiaryName) DOMElements.currentApiaryName.textContent = apiary.name;
  if (DOMElements.welcomeMessage) DOMElements.welcomeMessage.textContent = `Apiario: ${apiary.name}`;
  await loadHives(apiary.id);
}
async function loadHives(apiaryId) {
  const { data, error } = await supabaseClient.from('hives').select('*').eq('apiary_id', apiaryId);
  if (!error) renderHives(data);
}
async function selectHive(hive) {
  currentHive = hive;
  if (DOMElements.currentHiveCode) DOMElements.currentHiveCode.textContent = hive.label;
  await loadInspections(hive.id);
}
async function loadInspections(hiveId) {
  const { data, error } = await supabaseClient.from('inspections').select('*').eq('hive_id', hiveId);
  if (!error) renderInspections(data);
}

// ========== LISTENER ==========
on(DOMElements.btnLogout, 'click', async () => {
  await supabaseClient.auth.signOut();
});

on(DOMElements.formApiary, 'submit', async (e) => {
  e.preventDefault();
  const name = DOMElements.apiaryName?.value;
  if (name) {
    const { error } = await supabaseClient.from('apiaries').insert({ name });
    if (!error) {
      DOMElements.apiaryName.value = '';
      await loadApiaries();
    }
  }
});

on(DOMElements.formHive, 'submit', async (e) => {
  e.preventDefault();
  const label = DOMElements.hiveCode?.value;
  if (label && currentApiary) {
    const { error } = await supabaseClient.from('hives').insert({ apiary_id: currentApiary.id, label });
    if (!error) {
      DOMElements.hiveCode.value = '';
      await loadHives(currentApiary.id);
    }
  }
});

on(DOMElements.formInspection, 'submit', async (e) => {
  e.preventDefault();
  if (currentHive) {
    const { error } = await supabaseClient.from('inspections').insert({
      hive_id: currentHive.id,
      inspected_at: new Date().toISOString().slice(0, 10),
      queen_seen: true,
    });
    if (!error) await loadInspections(currentHive.id);
  }
});

// ========== AUTENTICAZIONE ==========
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (session) {
    showSection('app');
    if (DOMElements.userEmail) DOMElements.userEmail.textContent = session.user.email;
    loadApiaries();
  } else {
    showSection('auth');
  }
});

// Login e signup
on(DOMElements.btnLogin, 'click', async () => {
  const email = DOMElements.emailInput?.value;
  const password = DOMElements.passwordInput?.value;
  if (email && password) {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) showStatus('Login fallito');
  }
});

on(DOMElements.btnSignup, 'click', async () => {
  const email = DOMElements.emailInput?.value;
  const password = DOMElements.passwordInput?.value;
  if (email && password) {
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) showStatus('Signup fallita');
  }
});

// Avvio
showStatus('Pronto');
