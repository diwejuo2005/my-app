# inStereo

Stay close to the people you love, wherever they are. inStereo shows each
person's local time, whether they're awake, their weather and news, shared
calendar availability, daily check-ins, and a private 1:1 chat.

Built with Expo (React Native) and TypeScript. The backend is currently
Firebase (Auth, Firestore, Storage) and is being replaced by our own
TypeScript + Postgres + WebSocket server.

## Run it

```bash
npm install
npm run start:lan   # same Wi-Fi as your phone
npm start           # tunnel, when your phone is on a different network
```

## Run the server (Node.js + Express + PostgreSQL)

Needs Docker running.

```bash
docker compose up -d          # local Postgres
cd server
cp .env.example .env          # first time only
npm install
npm run migrate               # apply database migrations
npm run dev                   # http://localhost:3000/health
```

## Layout

- `src/app/` — screens (expo-router file-based routes)
- `src/context/` — auth state and the connected-members list
- `src/lib/` — Firestore, Storage, notifications, helpers
- `firestore.rules`, `storage.rules` — security rules (pasted into the Firebase Console by hand)
- `server/` — the API: Express app (`src/app.ts`), Postgres pool (`src/db.ts`),
  migration runner (`src/migrate.ts`) and numbered SQL migrations (`migrations/`)
- `docker-compose.yml` — local Postgres for development
