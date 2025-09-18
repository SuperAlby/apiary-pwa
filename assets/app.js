import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import * as db from './db.js';

// Accediamo alla variabile globale 'supabase' creata dal tag <script> in index.html
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentApiary = null;
let currentHive = null;

// --- Elementi DOM ---
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
    apiaryNameInput: document.getElementById('apiary-name'),
    apiariesList: document.getElementById('apiaries-list'),
    welcomeMessage: document.getElementById('welcome-message'),
    hivesSection: document.getElementById('hives-section'),
    inspectionsSection: document.getElementById('inspections-section'),
    currentApiaryName: document.getElementById('current-apiary-name'),
    formHive: document.getElementById('form-hive'),
    hiveCodeInput: document.getElementById('hive-code'),
    hivesList: document.getElementById('hives-list'),
    currentHiveCode: document.getElementById('current-hive-code'),
    formInspection: document.getElementById('form-inspection'),
    inspectionsList: document.getElementById('inspections-list'),
};

// --- LOGICA DI VISUALIZZAZIONE ---
const showView = (view) => {
    DOMElements.authContainer.classList.toggle('hidden', view !== 'auth');
    DOMElements.appContent.classList.toggle('hidden', view !== 'app');
};

const selectApiary = async (apiary) => {
    currentApiary = apiary;
    currentHive = null;
    DOMElements.welcomeMessage.classList.add('hidden');
    DOMElements.hivesSection.classList.remove('hidden');
    DOMElements.inspectionsSection.classList.add('hidden');
    DOMElements.currentApiaryName.textContent = apiary.name;
    await renderApiaries();
    await renderHives(); // NUOVO: Mostra gli alveari per l'apiario selezionato
};

const selectHive = async (hive) => {
    currentHive = hive;
    DOMElements.inspectionsSection.classList.remove('hidden');
    DOMElements.currentHiveCode.textContent = hive.code;
    await renderHives();
    // Prossimo passo: renderInspections()
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

const renderHives = async () => {
    if (!currentApiary) return;
    const allHives = await db.getAll('hives');
    const hivesOfApiary = allHives.filter(h => h.apiary_id === currentApiary.id);

    DOMElements.hivesList.innerHTML = '';
    hivesOfApiary.forEach(hive => {
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

// --- GESTIONE DATI ---
const syncAndFetchData = async () => {
    DOMElements.status.textContent = 'Sincronizzazione...';
    const success = await db.sync(supabaseClient);
    if (!success) DOMElements.status.textContent = 'Sincronizzazione fallita';
    
    DOMElements.status.textContent = 'Caricamento dati...';
    const tables = ['apiaries', 'hives', 'inspections'];
    for (const table of tables) {
        const { data, error } = await supabaseClient.from(table).select('*');
        if (error) {
            console.error(`Errore nel caricare ${table}:`, error);
            DOMElements.status.textContent = 'Errore caricamento';
            return; // Interrompi se c'è un errore
        } else {
            await db.clearAndInsert(table, data);
        }
    }
    DOMElements.status.textContent = 'Online';
    await renderApiaries();
    // Se un apiario era già selezionato, ricarica i suoi alveari
    if (currentApiary) await renderHives();
};

// --- AUTENTICAZIONE ---
const handleAuthStateChange = (event, session) => {
    if (session) {
        showView('app');
        DOMElements.authForms.classList.add('hidden');
        DOMElements.authLogged.classList.remove('hidden');
        DOMElements.userEmail.textContent = session.user.email;
        syncAndFetchData();
    } else {
        showView('auth');
        DOMElements.authForms.classList.remove('hidden');
        DOMElements.authLogged.classList.add('hidden');
        currentApiary = null; // Resetta lo stato quando si fa logout
        currentHive = null;
    }
};

// --- EVENT LISTENERS ---
DOMElements.btnLogin.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: DOMElements.emailInput.value,
        password: DOMElements.passwordInput.value,
    });
    if (error) alert(error.message);
});

DOMElements.btnSignup.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signUp({
        email: DOMElements.emailInput.value,
        password: DOMElements.passwordInput.value,
    });
    if (error) alert(error.message);
    else alert('Account creato! Ora puoi fare il Sign in.');
});

DOMElements.btnLogout.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
});

DOMElements.formApiary.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = DOMElements.apiaryNameInput.value.trim();
    if (!name) return;
    
    await db.save('apiaries', { name });
    DOMElements.apiaryNameInput.value = '';
    await syncAndFetchData();
});

DOMElements.formHive.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentApiary) {
        alert('Seleziona prima un apiario!');
        return;
    }
    const code = DOMElements.hiveCodeInput.value.trim();
    if (!code) return;

    await db.save('hives', { apiary_id: currentApiary.id, code });
    DOMElements.hiveCodeInput.value = '';
    await syncAndFetchData();
});

// --- INIZIALIZZAZIONE ---
const init = async () => {
    await db.init();
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    handleAuthStateChange(null, session);

    supabaseClient.auth.onAuthStateChange(handleAuthStateChange);
};

init();
