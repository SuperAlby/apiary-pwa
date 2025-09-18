import { createClient } from 'supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import * as db from './db.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // <-- ECCO LA RIGA CORRETTA
let currentApiary = null;
let currentHive = null;

// --- Elementi DOM ---
const DOMElements = {
    // Contenitori principali
    authContainer: document.getElementById('auth-container'),
    appContent: document.getElementById('app-content'),

    // Autenticazione
    authForms: document.getElementById('auth-forms'),
    authLogged: document.getElementById('auth-logged'),
    userEmail: document.getElementById('user-email'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    btnLogin: document.getElementById('btn-login'),
    btnSignup: document.getElementById('btn-signup'),
    btnLogout: document.getElementById('btn-logout'),

    // Status
    status: document.getElementById('status'),

    // Apiari
    formApiary: document.getElementById('form-apiary'),
    apiaryNameInput: document.getElementById('apiary-name'),
    apiariesList: document.getElementById('apiaries-list'),

    // Sezioni principali
    welcomeMessage: document.getElementById('welcome-message'),
    hivesSection: document.getElementById('hives-section'),
    inspectionsSection: document.getElementById('inspections-section'),

    // Alveari
    currentApiaryName: document.getElementById('current-apiary-name'),
    formHive: document.getElementById('form-hive'),
    hiveCodeInput: document.getElementById('hive-code'),
    hivesList: document.getElementById('hives-list'),

    // Ispezioni
    currentHiveCode: document.getElementById('current-hive-code'),
    formInspection: document.getElementById('form-inspection'),
    inspectionsList: document.getElementById('inspections-list'),
};


// --- LOGICA DI RENDER ---

const renderApiaries = async () => {
    const apiaries = await db.getAll('apiaries');
    DOMElements.apiariesList.innerHTML = '';
    apiaries.forEach(apiary => {
        const li = document.createElement('li');
        li.textContent = apiary.name;
        li.dataset.id = apiary.id;
        if (currentApiary && currentApiary.id === apiary.id) {
            li.classList.add('active');
        }
        li.addEventListener('click', () => selectApiary(apiary));
        DOMElements.apiariesList.appendChild(li);
    });
};

const renderHives = async (apiaryId) => {
    const allHives = await db.getAll('hives');
    const hives = allHives.filter(h => h.apiary_id === apiaryId);
    DOMElements.hivesList.innerHTML = '';
    hives.forEach(hive => {
        const li = document.createElement('li');
        li.textContent = hive.code;
        li.dataset.id = hive.id;
        if (currentHive && currentHive.id === hive.id) {
            li.classList.add('active');
        }
        li.addEventListener('click', () => selectHive(hive));
        DOMElements.hivesList.appendChild(li);
    });
};

const renderInspections = async (hiveId) => {
    const allInspections = await db.getAll('inspections');
    const inspections = allInspections.filter(i => i.hive_id === hiveId).sort((a,b) => new Date(b.visited_at) - new Date(a.visited_at));
    DOMElements.inspectionsList.innerHTML = '';
    inspections.forEach(insp => {
        const li = document.createElement('li');
        const visited = new Date(insp.visited_at).toLocaleDateString();
        li.textContent = `Visita del ${visited} - Regina: ${insp.queen_seen ? '✔️' : '❌'}, Uova: ${insp.eggs ? '✔️' : '❌'}`;
        DOMElements.inspectionsList.appendChild(li);
    });
};

// --- LOGICA DI VISUALIZZAZIONE ---

const showView = (view) => {
    DOMElements.authContainer.classList.toggle('hidden', view !== 'auth');
    DOMElements.appContent.classList.toggle('hidden', view !== 'app');
};

const selectApiary = (apiary) => {
    currentApiary = apiary;
    currentHive = null;
    DOMElements.welcomeMessage.classList.add('hidden');
    DOMElements.hivesSection.classList.remove('hidden');
    DOMElements.inspectionsSection.classList.add('hidden');
    DOMElements.currentApiaryName.textContent = apiary.name;
    renderApiaries();
    renderHives(apiary.id);
};

const selectHive = (hive) => {
    currentHive = hive;
    DOMElements.inspectionsSection.classList.remove('hidden');
    DOMElements.currentHiveCode.textContent = hive.code;
    renderHives(currentApiary.id);
    renderInspections(hive.id);
};


// --- GESTIONE DATI ---

const fetchAllData = async () => {
    const tables = ['apiaries', 'hives', 'inspections'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (!error) {
            await db.clearAndInsert(table, data);
        } else {
            console.error(`Error fetching ${table}:`, error);
            updateStatus(false, 'Errore caricamento dati.');
        }
    }
    await renderApiaries();
};

const syncData = async () => {
    updateStatus(true, 'Sincronizzazione...');
    const success = await db.sync(supabase);
    if (success) {
        await fetchAllData();
        updateStatus(true, 'Online');
    } else {
        updateStatus(false, 'Sincronizzazione fallita.');
    }
};


// --- AUTENTICAZIONE ---

const handleAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        showView('app');
        DOMElements.authForms.classList.add('hidden');
        DOMElements.authLogged.classList.remove('hidden');
        DOMElements.userEmail.textContent = session.user.email;
        await fetchAllData();
        syncData();
    } else {
        showView('auth');
        DOMElements.authForms.classList.remove('hidden');
        DOMElements.authLogged.classList.add('hidden');
    }
};

// --- EVENT LISTENERS ---

DOMElements.btnLogin.addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithPassword({
        email: DOMElements.emailInput.value,
        password: DOMElements.passwordInput.value,
    });
    if (error) alert(error.message);
});

DOMElements.btnSignup.addEventListener('click', async () => {
    const { error } = await supabase.auth.signUp({
        email: DOMElements.emailInput.value,
        password: DOMElements.passwordInput.value,
    });
    if (error) alert(error.message);
    else alert('Controlla la tua email per il link di conferma!');
});

DOMElements.btnLogout.addEventListener('click', async () => {
    await supabase.auth.signOut();
});

DOMElements.formApiary.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = DOMElements.apiaryNameInput.value.trim();
    if (!name) return;
    await db.save('apiaries', { name });
    DOMElements.formApiary.reset();
    await renderApiaries();
    syncData();
});

DOMElements.formHive.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = DOMElements.hiveCodeInput.value.trim();
    if (!code || !currentApiary) return;
    await db.save('hives', { apiary_id: currentApiary.id, code });
    DOMElements.formHive.reset();
    await renderHives(currentApiary.id);
    syncData();
});

DOMElements.formInspection.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentHive) return;
    const form = e.target;
    const inspection = {
        hive_id: currentHive.id,
        visited_at: new Date().toISOString(),
        queen_seen: form.querySelector('#queen-seen').checked,
        eggs: form.querySelector('#eggs').checked,
        frames_bees: form.querySelector('#frames-bees').valueAsNumber,
        stores_kg: form.querySelector('#stores-kg').valueAsNumber,
    };
    await db.save('inspections', inspection);
    form.reset();
    await renderInspections(currentHive.id);
    syncData();
});


// --- INIZIALIZZAZIONE ---

const updateStatus = (online, text = '') => {
    if (online) {
        DOMElements.status.textContent = text || (navigator.onLine ? 'Online' : 'Online');
        DOMElements.status.style.color = navigator.onLine ? 'lightgreen' : 'orange';
    } else {
        DOMElements.status.textContent = text || 'Errore';
        DOMElements.status.style.color = 'salmon';
    }
};

window.addEventListener('online', () => { updateStatus(true); syncData(); });
window.addEventListener('offline', () => updateStatus(true, 'Offline'));

const init = async () => {
    await db.init();
    updateStatus(true);

    supabase.auth.onAuthStateChange((event, session) => {
        // Ricarica la pagina al login/logout per resettare lo stato
        window.location.reload();
    });

    handleAuth();
};

init();
