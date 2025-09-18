import { createClient } from 'supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import * as db from './db.js';

// MODIFICA: Creiamo il client Supabase ma non lo useremo per l'autenticazione
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentApiary = null;
let currentHive = null;

// --- Elementi DOM ---
const DOMElements = {
    // Contenitori principali
    authContainer: document.getElementById('auth-container'),
    appContent: document.getElementById('app-content'),

    // Autenticazione (non usati in questa versione)
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
    const inspections = allInspections.filter(i => i.hive_id === hiveId).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    DOMElements.inspectionsList.innerHTML = '';
    inspections.forEach(insp => {
        const li = document.createElement('li');
        const visited = new Date(insp.created_at).toLocaleDateString();
        li.textContent = `Visita del ${visited} - Regina: ${insp.queen_seen ? '✔️' : '❌'}, Uova: ${insp.eggs ? '✔️' : '❌'}`;
        DOMElements.inspectionsList.appendChild(li);
    });
};

// --- LOGICA DI VISUALIZZAZIONE ---

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

// --- EVENT LISTENERS (SOLO PER I FORM) ---

DOMElements.formApiary.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = DOMElements.apiaryNameInput.value.trim();
    if (!name) return;
    await db.save('apiaries', { name, created_at: new Date().toISOString() });
    DOMElements.formApiary.reset();
    await renderApiaries();
});

DOMElements.formHive.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = DOMElements.hiveCodeInput.value.trim();
    if (!code || !currentApiary) return;
    await db.save('hives', { apiary_id: currentApiary.id, code, created_at: new Date().toISOString() });
    DOMElements.formHive.reset();
    await renderHives(currentApiary.id);
});

DOMElements.formInspection.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentHive) return;
    const form = e.target;
    const inspection = {
        hive_id: currentHive.id,
        created_at: new Date().toISOString(),
        queen_seen: form.querySelector('#queen-seen').checked,
        eggs: form.querySelector('#eggs').checked,
        frames_bees: form.querySelector('#frames-bees').valueAsNumber || 0,
        stores_kg: form.querySelector('#stores-kg').valueAsNumber || 0,
    };
    await db.save('inspections', inspection);
    form.reset();
    await renderInspections(currentHive.id);
});

// --- INIZIALIZZAZIONE ---

const updateStatus = () => {
    const online = navigator.onLine;
    DOMElements.status.textContent = online ? 'Online (Sincronizzazione Disattivata)' : 'Offline';
    DOMElements.status.style.color = online ? 'orange' : 'salmon';
};

const init = async () => {
    await db.init();
    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    // MODIFICA: Carichiamo subito gli apiari salvati localmente
    await renderApiaries(); 
};

init();
