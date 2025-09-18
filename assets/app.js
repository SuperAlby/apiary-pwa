// MODIFICA: Importiamo "tutto" (*) dalla libreria in un unico oggetto chiamato 'supabase'
import * as supabase from 'supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import * as db from './db.js';

// MODIFICA: Creiamo il client usando la funzione dall'oggetto che abbiamo importato
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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

const selectApiary = (apiary) => {
    currentApiary = apiary;
    currentHive = null;
    DOMElements.welcomeMessage.classList.add('hidden');
    DOMElements.hivesSection.classList.remove('hidden');
    DOMElements.inspectionsSection.classList.add('hidden');
    DOMElements.currentApiaryName.textContent = apiary.name;
    renderApiaries(); // Ri-renderizza per mostrare la selezione 'active'
    // Aggiungi qui la logica per caricare e mostrare gli alveari
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

// --- GESTIONE DATI ---

const syncAndFetchData = async () => {
    DOMElements.status.textContent = 'Sincronizzazione...';
    const success = await db.sync(supabaseClient);
    if (!success) {
        DOMElements.status.textContent = 'Sincronizzazione fallita';
    }

    DOMElements.status.textContent = 'Caricamento dati...';
    const { data, error } = await supabaseClient.from('apiaries').select('*');
    if (error) {
        console.error('Errore nel caricare gli apiari:', error);
        DOMElements.status.textContent = 'Errore caricamento';
    } else {
        await db.clearAndInsert('apiaries', data);
        DOMElements.status.textContent = 'Online';
    }
    await renderApiaries();
};

// --- AUTENTICAZIONE ---

const handleAuthStateChange = async (event, session) => {
    if (session) {
        showView('app');
        DOMElements.authForms.classList.add('hidden');
        DOMElements.authLogged.classList.remove('hidden');
        DOMElements.userEmail.textContent = session.user.email;
        await syncAndFetchData();
    } else {
        showView('auth');
        DOMElements.authForms.classList.remove('hidden');
        DOMElements.authLogged.classList.add('hidden');
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
    else alert('Controlla la tua email per il link di conferma!');
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
    await renderApiaries(); 
    await syncAndFetchData();
});


// --- INIZIALIZZAZIONE ---

const init = async () => {
    await db.init();
    supabaseClient.auth.onAuthStateChange(handleAuthStateChange);
};

init();
