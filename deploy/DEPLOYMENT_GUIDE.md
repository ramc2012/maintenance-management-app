# Maintenance Management System
## Deployment Guide - ONGC Ankleshwar Asset

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **Operating System** | Windows 10/11 or Windows Server 2019+ |
| **Docker Desktop** | Download from [docker.com](https://www.docker.com/products/docker-desktop) |
| **Ollama** | Download from [ollama.com](https://ollama.com/download/windows) |
| **RAM** | 8 GB minimum (16 GB recommended) |
| **Storage** | 20 GB free space |

---

## Architecture (Docker)

The stack now includes:
- `postgres` (TimescaleDB on PostgreSQL 15, database: `maintenance_db`)
- `redis` (real-time collaboration/session cache)
- `server` (Node API)
- `client` (React web UI)
- `cognitive` (RAG + MCP services with Chroma persistence)
- `ollama` and `ollama-webui`

Persistent Docker volumes:
- `postgres_data`
- `redis_data`
- `cognitive_data`
- `ollama_data`
- `ollama_webui_data`

---

## Installation Steps

### Step 1: Install Docker Desktop
1. Download Docker Desktop from docker.com
2. Run installer and enable WSL2 when prompted
3. Restart computer
4. Start Docker Desktop

### Step 2: Install Ollama
1. Download Ollama from ollama.com/download/windows
2. Run OllamaSetup.exe
3. Ollama starts automatically

### Step 3: Extract Application
1. Copy `backup_2025_12_29_v6_with_scripts.tar.gz` to `C:\maintenance-system\`
2. Open PowerShell and run:
```
cd C:\maintenance-system
tar -xzvf backup_2025_12_29_v6_with_scripts.tar.gz
```

### Step 4: Start Application
- Double-click **`start.bat`**
- Wait 2-3 minutes for first-time setup
- Browser opens automatically

### Step 5: First-Time Database Setup
Open PowerShell in `C:\maintenance-system\` and run:
```
docker compose exec server npx prisma migrate deploy
docker compose exec server npx prisma db seed
```

> TimescaleDB extension is auto-enabled from `docker/postgres-init/01_extensions.sql` on first DB initialization.
>
> **Existing deployments (upgrading from procurement_db):** The init script only runs on a fresh volume. If you already have a `postgres_data` volume, enable the extension manually:
> ```
> docker compose exec postgres psql -U $POSTGRES_USER -d maintenance_db -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
> ```

---

## Health Check Commands

Use these commands to validate services:

```
docker compose ps
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f cognitive
```

---

## Daily Usage

| Action | Command |
|--------|---------|
| **Start System** | Double-click `start.bat` |
| **Stop System** | Double-click `stop.bat` |

---

## Access URLs

| Service | URL |
|---------|-----|
| **Web Application** | http://localhost:8080 |
| **User Guide** | http://localhost:8080/help.html |
| **API Server** | http://localhost:3000 |
| **Cognitive API** | http://localhost:8001 |
| **Ollama WebUI** | http://localhost:3001 |

**For network access:** Replace `localhost` with server IP address.

---

## Default Login

| Field | Value |
|-------|-------|
| **Username** | admin |
| **Password** | admin123 |

---

## AI Models (Kelvin AI)

| Model | Speed | Best For |
|-------|-------|----------|
| TinyLlama ⚡ | 3-4 sec | Quick queries |
| Gemma 2 | 4-6 sec | Balanced |
| Llama 3.2 | 6-8 sec | General purpose |
| Mistral | 10-15 sec | Complex analysis |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Docker won't start | Enable Hyper-V and WSL2 in Windows Features |
| Port in use | Run: `netstat -ano \| findstr :8080` |
| AI not responding | Restart Ollama: `ollama serve` |
| DB connection errors | Verify `DATABASE_URL` points to `maintenance_db` |
| Redis unavailable | Check: `docker compose logs redis` |

---

## Support Contact

For technical support, contact your system administrator.

---

*Maintenance Management System v2.1 | Powered by Kelvin AI*
