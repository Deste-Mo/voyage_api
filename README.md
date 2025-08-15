# Travel Booking API (Node.js + Express + Postgres)

## Prérequis
- Docker + Docker Compose (recommandé) ou Postgres local
- Node 20+

## Lancement avec Docker (recommandé)
```bash
cp .env.example .env
# Ajustez si besoin les variables JWT_SECRET / PG*
docker compose up --build
# API: http://localhost:3002
```

## Lancement sans Docker
```bash
cp .env.example .env
# Assurez-vous que Postgres tourne et correspond aux variables PG*
npm install
node src/server.js
# API: http://localhost:3002
```

## Endpoints
- POST `/register` → Inscription et envoi OTP (Twilio si configuré; sinon `devOtp`)
- POST `/verify-otp` → Vérification OTP, renvoie `{ user, token }`
- POST `/login` → Connexion par téléphone + mot de passe
- GET `/trips/search` → Recherche de trajets (query: `departureCity`, `destinationCity`, `date`, `tripType?`)
- POST `/trips/reserve` (auth) → Réservation `{ journeyId, adults, children }`

## Architecture
- `src/config` (env)
- `src/db` (pool, migration)
- `src/models` (requêtes SQL)
- `src/services` (OTP via Twilio ou dev)
- `src/controllers` (logique métier)
- `src/routes` (routing + auth middleware)
- `src/server.js` (bootstrap + migration)

## OTP
- En dev: la réponse de `/register` inclut `devOtp`.
- En prod: configurez `TWILIO_*` dans `.env`.

## Déploiement sur Railway

- Start Command: `node src/server.js`
- Variables d’environnement recommandées:
  - `JWT_SECRET`: définissez une valeur secrète
  - `DATABASE_URL`: collez l’URL PostgreSQL Railway (ou liez la base et laissez Railway injecter la variable)
  - Optionnel Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- Ne définissez pas `PORT` (Railway le fournit automatiquement)
- Les tables sont créées automatiquement au démarrage via `src/db/migrate.js`
- Santé: `GET /health` renvoie `{ ok: true }`