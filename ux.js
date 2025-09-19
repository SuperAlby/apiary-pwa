// assets/ux.js
import { t } from './i18n.js';

// --- Focus & Skip link (accessibilità) ---
function ensureSkipLink() {
  if (!document.querySelector('.skip-link')) {
    const a = document.createElement('a');
    a.href = '#main';
    a.className = 'skip-link';
    a.textContent = 'Salta al contenuto principale';
    document.body.prepend(a);
  }
  if (!document.getElementById('main')) {
    const main = document.querySelector('main') || document.createElement('main');
    main.id = 'main';
    if (!main.parentElement) {
      // Avvolge il contenuto principale se mancasse <main>
      const wrapper = document.createElement('div');
      while (document.body.firstChild && document.body.firstChild !== document.querySelector('.skip-link')) {
        wrapper.appendChild(document.body.firstChild);
      }
      main.appendChild(wrapper);
      document.body.appendChild(main);
    }
  }
}

// --- Traduzione “leggera”: sostituisce testi comuni senza toccare la logica ---
function applyI18n() {
  // Pulsanti autenticazione
  qsaBtn(['Sign in','Accedi']).forEach(el => el.textContent = t('sign_in'));
  qsaBtn(['Sign up','Registrati']).forEach(el => el.textContent = t('sign_up'));
  qsaBtn(['Sign out','Esci','Logout']).forEach(el => el.textContent = t('sign_out'));

  // Azioni “Aggiungi”
  replaceContains('+ Add apiary', `+ ${t('add_apiary')}`);
  replaceContains('+ Aggiungi apiario', `+ ${t('add_apiary')}`);
  replaceContains('+ Add hive', `+ ${t('add_hive')}`);
  replaceContains('+ Aggiungi alveare', `+ ${t('add_hive')}`);

  // Etichette visibili comuni
  replaceExact('Apiaries', t('apiaries'));
  replaceExact('Apiary', t('apiary'));
  replaceExact('Hive', t('hive'));
  replaceExact('Register', t('register'));
  replaceExact('Queen', t('queen'));
  replaceExact('Eggs', t('eggs'));

  // Placeholder/email/password
  document.querySelectorAll('input[type="email"]').forEach(i => {
    i.setAttribute('aria-label', t('email'));
    i.placeholder = t('email');
  });
  document.querySelectorAll('input[type="password"]').forEach(i => {
    i.setAttribute('aria-label', t('password'));
    i.placeholder = t('password');
  });
}

function qsaBtn(candidates) {
  return Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'))
    .filter(el => candidates.some(c => (el.textContent || el.value || '').trim().toLowerCase() === c.toLowerCase()));
}
function replaceExact(from, to) {
  Array.from(document.querySelectorAll('*, *::before, *::after')).forEach(el => {
    if (el.childNodes && el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
      if (el.textContent.trim() === from) el.textContent = to;
    }
  });
}
function replaceContains(sub, to) {
  Array.from(document.querySelectorAll('button, a, h1, h2, h3, h4, span, p')).forEach(el => {
    const txt = (el.textContent || '').trim();
    if (txt.includes(sub)) el.textContent = txt.replace(sub, to);
  });
}

// --- Validazione form (email/password) con messaggi inline e aria-live ---
function enhanceForms() {
  // Contenitore per messaggi di errore dell’intera pagina (screen reader)
  let live = document.getElementById('globalFormErrors');
  if (!live) {
    live = document.createElement('div');
    live.id = 'globalFormErrors';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.className = 'sr-only';
    document.body.appendChild(live);
  }

  document.querySelectorAll('form').forEach(form => {
    if (form.__enhanced) return;
    form.__enhanced = true;

    form.addEventListener('submit', (e) => {
      const email = form.querySelector('input[type="email"]');
      const pwd = form.querySelector('input[type="password"]');
      let error = '';

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value || '')) {
        error = t('invalid_email');
        markInvalid(email, error);
      } else if (pwd && (pwd.value || '').length < 8) {
        error = t('invalid_password');
        markInvalid(pwd, error);
      } else {
        clearInvalid(email);
        clearInvalid(pwd);
      }

      if (error) {
        e.preventDefault();
        live.textContent = error; // annunciato dai lettori di schermo
      }
    });
  });
}
function markInvalid(input, msg) {
  if (!input) return;
  input.setAttribute('aria-invalid', 'true');
  let err = input.nextElementSibling;
  if (!err || !err.classList?.contains('field-error')) {
    err = document.createElement('p');
    err.className = 'field-error';
    input.insertAdjacentElement('afterend', err);
  }
  err.textContent = msg;
}
function clearInvalid(input) {
  if (!input) return;
  input.removeAttribute('aria-invalid');
  const err = input.nextElementSibling;
  if (err && err.classList?.contains('field-error')) err.remove();
}

// --- Badge Online/Offline ---
function mountConnectionBadge() {
  if (document.querySelector('.conn-badge')) return;
  const badge = document.createElement('div');
  badge.className = 'conn-badge';
  badge.setAttribute('role','status');
  badge.setAttribute('aria-live','polite');
  const set = () => { badge.textContent = navigator.onLine ? t('online') : t('offline');
    badge.classList.toggle('ok', navigator.onLine);
    badge.classList.toggle('ko', !navigator.onLine);
  };
  window.addEventListener('online', set);
  window.addEventListener('offline', set);
  set();
  document.body.appendChild(badge);
}

// --- Re-apply su cambi DOM (se la tua app ricostruisce parti di UI) ---
const mo = new MutationObserver(() => {
  applyI18n();
  enhanceForms();
});
function startObservers() {
  mo.observe(document.body, { childList: true, subtree: true });
}

// --- Boot ---
function boot() {
  ensureSkipLink();
  applyI18n();
  enhanceForms();
  mountConnectionBadge();
  startObservers();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
