# Maintenance Management

Maintenance management platform covering assets, work orders, calibration, PM strategies, manuals repository, energy, training, workshop jobs, and mobile clients.

## Workspaces

- `client`: React + Vite web application
- `server`: Express + Prisma API
- `mobile`: Expo mobile client
- `mobile-capacitor`: Capacitor shell for the web client
- `cognitive`: Python cognitive/RAG service

## Server setup

```bash
cd server
npm install
cp ../.env.example ../.env
npm run build
npm test
```

## Equipment import

```bash
cd server
npm run equipment:normalize
DATABASE_URL=postgresql://user:password@localhost:5433/procurement_db npm run equipment:import
```

## Recent hardening

- authenticated route groups with write-access enforcement
- server-side pagination and validation on equipment registry APIs
- persistent manuals repository uploads
- manpower-based organization configuration
- audit log and notification foundations with scheduler support
- structured request IDs and JSON logging
- server test and CI foundation

## Important environment variables

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ALLOWED_ORIGINS`
- `SEED_ADMIN_ON_STARTUP`
- `SEED_ADMIN_PASSWORD`
- `NOTIFICATION_SWEEP_CRON`
- `NOTIFICATION_LOOKAHEAD_DAYS`

## Database migrations

```bash
cd server
npx prisma migrate deploy
```

## Local Docker

```bash
cd deploy
docker compose up -d --build
```

Default local URLs:

- web client: `http://localhost:8080`
- mobile web shell: `http://localhost:8084`
- API: `http://localhost:5000`
- cognitive service: `http://localhost:8001`
- Ollama Web UI: `http://localhost:3001`

The compose stack assigns explicit container names with the `maintenance-*-local` prefix and supports overriding host ports through `.env`.

Optional local LLM sidecars:

```bash
docker compose --profile ai up -d
```
