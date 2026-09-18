# ARE Offer Tracker

App per tracciare le offerte di Advanced Rotating Equipment FZE: ID offerta
automatici, quattro categorie (Consultancy / Service / Solutions / Parts),
dati completi, valute con conversione, cruscotto con metriche e grafici.
I dati vivono nel cloud, quindi sono **gli stessi su iMac, iPhone e iPad**.
L'accesso è protetto da una **password personale**.

Stessa tecnica dell'app "Spese di Ale": **GitHub** (codice) → **Vercel**
(pubblica l'app + ospita il database).

---

## 🚀 Pubblicazione in ~15 minuti (nessuna competenza tecnica richiesta)

### Passo 1 — Carica il progetto su GitHub

1. Vai su **https://github.com** e accedi (hai già l'account `AntonioGagliardi72`).
2. Clicca **New repository**, nome es. `are-offer-tracker`, poi **Create repository**.
3. Sul tuo computer, **decomprimi** il file zip (doppio click): ottieni la
   cartella `are-offer-tracker-web`.
4. Nella pagina del repository: **Add file → Upload files**.
5. Apri la cartella `are-offer-tracker-web` e trascina dentro GitHub **tutto il
   contenuto** (cartelle `api`, `src` e i file come `package.json`,
   `index.html`, `vite.config.js`, `vercel.json`, `.gitignore`, `.env.example`,
   `README.md`).
   - Nota: **non** serve caricare la cartella `node_modules` (se c'è, salta).
     Vercel scarica da solo le librerie.
   - I file che iniziano con il punto (`.gitignore`, `.env.example`) sono
     nascosti dal sistema: se non li vedi non è un problema, non sono essenziali.
6. Clicca **Commit changes**.

### Passo 2 — Collega il repository a Vercel

1. Vai su **https://vercel.com** e accedi con **Continue with GitHub**.
2. **Add New… → Project**.
3. Seleziona `are-offer-tracker` e clicca **Import**.
4. Vercel riconosce automaticamente che è un progetto **Vite**: non toccare le
   impostazioni di build.
5. **Non cliccare ancora Deploy** — prima imposta la password (Passo 3).

### Passo 3 — Imposta la tua password personale

Nella stessa schermata di importazione, apri **Environment Variables** e aggiungi:
- **Name**: `APP_PASSWORD`
- **Value**: la password che vuoi usare per entrare nell'app (scegline una tua).
- Clicca **Add**.

Poi clicca **Deploy**. Dopo circa un minuto ottieni un link tipo
`https://are-offer-tracker.vercel.app`.

### Passo 4 — Crea il database (i dati condivisi tra i dispositivi)

1. Nel progetto su Vercel, apri la scheda **Storage**.
2. **Create Database → Postgres** (piano gratuito **Hobby**), dai un nome e conferma.
3. Quando chiede a quale progetto collegarlo, scegli **are-offer-tracker** e
   **Connect**. Vercel aggiunge da solo le variabili del database al progetto.
4. Vai su **Deployments → (ultimo) → ⋯ → Redeploy** per applicare il collegamento.

Fatto. Apri il link: ti chiede la password, entri, e l'app è pronta. Le tabelle
del database si creano da sole al primo utilizzo.

### Passo 5 — Installala su iPhone e iPad

1. Apri il link **in Safari** (su iOS "Aggiungi a Home" funziona solo da Safari).
2. Tocca l'icona di **Condividi** (quadrato con la freccia).
3. **Aggiungi alla schermata Home**. Ora si apre come un'app a tutto schermo.

Ripeti su iPhone e iPad: sono tutti collegati agli **stessi dati**.

---

## 💱 Cambi valuta

L'app parte con **cambi manuali** modificabili in **Impostazioni** (quante unità
di ogni valuta valgono 1 USD). Tutto funziona da subito, senza chiavi esterne.

### Attivare i cambi automatici OANDA (opzionale, quando vuoi)

1. Ottieni una chiave dall'**OANDA Exchange Rates API**
   (https://developer.oanda.com/exchange-rates-api/).
2. Su Vercel: **Settings → Environment Variables → Add**
   - **Name**: `OANDA_API_KEY`
   - **Value**: la tua chiave
3. **Redeploy**. Da quel momento una funzione programmata (`/api/cron-rates`)
   aggiorna i cambi ogni mattina alle 06:00 e la scheda Impostazioni li mostra
   in sola lettura. Finché la chiave non c'è, restano attivi i cambi manuali.

---

## 🔒 Nota sull'accesso

L'app è protetta da una password personale (la variabile `APP_PASSWORD`). È
adatta a un uso personale: chi non ha la password non vede le offerte. Se in
futuro serviranno account separati per i colleghi, si può aggiungere un vero
sistema di login (Vercel supporta l'integrazione con provider di autenticazione).

---

## 🧩 Com'è fatta (per riferimento)

- **Frontend**: React + Vite (cartella `src/`).
- **Backend**: funzioni serverless in `api/` (login, offerte, impostazioni, cron OANDA).
- **Database**: Vercel Postgres. Tabelle `offers`, `counters` (ID progressivi
  atomici, niente duplicati), `settings` (valuta base + cambi).
- **Deploy**: GitHub → Vercel, come "Spese di Ale".
