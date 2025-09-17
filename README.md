# Apiary PWA Starter (Next-less static, Supabase-ready)

Una **PWA offline-first** minimale per gestire apiari, alveari e ispezioni, con sincronizzazione su **Supabase (PostgreSQL + Auth + RLS)**.
Non richiede build: sono **file statici** che puoi caricare su un hosting statico (Netlify Drop, Vercel, GitHub Pages) o servire in locale.

## Cos'è incluso
- PWA (manifest + service worker) con cache offline.
- Autenticazione email/password su Supabase.
- Tabelle: `apiaries`, `hives`, `inspections` con **RLS per utente**.
- IndexedDB per uso offline + outbox per sincronizzazione quando torna la rete.
- UI minimale (niente framework) per inserire e consultare dati.

---

## 1) Setup Supabase (15–20 minuti)
1. Crea un progetto su **Supabase**.
2. Vai su **SQL Editor** e incolla/manda in esecuzione **in ordine**:
   - `supabase/schema.sql`
   - `supabase/policies.sql`
3. In **Authentication → Providers** lascia attivo **Email**. (Facoltativo: disabilita “Confirm email” per semplificare i test).
4. Copia **Project URL** e **anon public key** da **Project Settings → API**.

> Nota: le policy RLS sono per-utente: ogni riga ha `user_id` e può essere letta/scritta solo dal proprietario (auth.uid()).

---

## 2) Configura l'app
1. Apri `config.js` e incolla i valori:
   ```js
   export const SUPABASE_URL = "https://<la-tua-ref>.supabase.co";
   export const SUPABASE_ANON_KEY = "<la-tua-anon-key>";
   export const APP_NAME = "Apiary Manager";
   ```

---

## 3) Mettere online (scelte semplici)
- **Netlify Drop** (drag&drop): zip o cartella → https://app.netlify.com/drop (trascina il contenuto della cartella).
- **Vercel**: crea un repo Git (GitHub/GitLab/Bitbucket) con questi file e usa “Import Project” su Vercel.
- **Supabase + Storage** o qualunque **hosting statico**: basta servire questi file via HTTPS.

> Serve HTTPS (o `http://localhost`) per il service worker.

---

## 4) Uso locale (opzionale)
Se vuoi provarla in locale con un server statico:
- Con Node: `npx serve .` oppure `npx http-server .`
- Con Python: `python3 -m http.server 5173` poi apri `http://localhost:5173`

---

## 5) Flusso d’uso
1. Apri l’app → fai **Sign up** (email/password) o **Sign in**.
2. Crea un **Apiario**, poi aggiungi **Alveari** e **Ispezioni**.
3. In assenza di rete, i dati finiscono in **IndexedDB** (icona stato “Offline”). Appena torna rete e sei loggato, l’**outbox** si sincronizza su Supabase.
4. Ogni riga è legata al tuo utente (RLS).

---

## 6) Struttura tabelle
- `apiaries(id, user_id, name, lat, lon, note, created_at)`
- `hives(id, user_id, apiary_id, code, queen_birth_date, note, created_at)`
- `inspections(id, user_id, hive_id, visited_at, queen_seen, eggs, frames_bees, stores_kg, note, created_at)`

Puoi estenderle (trattamenti, lotti miele, task) e aggiungere nuove policy similari.

---

## 7) Limiti/Note
- UI intenzionalmente minimale: è un “starter” pronto da pubblicare e provare.
- L'**anon key** è pubblica by design; le **RLS** proteggono i dati.
- Per multi-organizzazione/ruoli, estendi lo schema con `organizations` e `memberships` e aggiorna le policy.

Buon lavoro!
