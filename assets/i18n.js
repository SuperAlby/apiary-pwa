export const dict = {
    email: 'Email',
    password: 'Password',
    sign_in: 'Accedi',
    sign_up: 'Registrati',
    sign_out: 'Esci',
    apiaries: 'Apiari',
    apiary: 'Apiario',
    hive: 'Alveare',
    add_apiary: 'Aggiungi apiario',
    add_hive: 'Aggiungi alveare',
    register: 'Registra',
    queen: 'Regina',
    eggs: 'Uova',
    select_apiary_hint: 'Seleziona un apiario dalla lista o creane uno nuovo.',
    invalid_email: 'Inserisci un indirizzo email valido.',
    invalid_password: 'La password deve avere almeno 8 caratteri.',
    online: 'Online',
    offline: 'Offline'
  };
  
  export function t(key) {
    return dict[key] ?? key;
  }
  