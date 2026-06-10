# TunBet 🎰⚽

**Premium Casino & Sportsbook** — Tunisian TND (دينار تونسي) gaming platform.

## 🔗 Live URLs

| Service | URL | Status |
|---------|-----|--------|
| Frontend (Surge.sh) | [tunbet.surge.sh](https://tunbet.surge.sh) | ✅ Active |
| Frontend (GitHub Pages) | [hatemzaghwani-cmyk.github.io/tunbet](https://hatemzaghwani-cmyk.github.io/tunbet) | 🚀 Deploying |
| Frontend (Render) | [tunbet.onrender.com](https://tunbet.onrender.com) | 🚀 One-click deploy |
| Backend (Render) | [tunbet-sportsbook.onrender.com](https://tunbet-sportsbook.onrender.com) | 🚀 One-click deploy |

## 🚀 Deploy to Render (Free Forever)

### Backend (Node.js + ESPN API + Supabase)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/hatemzaghwani-cmyk/tunbet-sportsbook)

### Frontend (React + Vite Static)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/hatemzaghwani-cmyk/tunbet)

## ⚙️ Environment Variables

Backend needs these env vars (pre-configured in `render.yaml`):
- `SUPA_URL` — Supabase URL
- `SUPA_KEY` — Supabase Service Key
- `ORO_SEAMLESS_SECRET` — `tunbet_seamless_2026`

## 📝 Free Domain Applications

- **tunbet.eu.org** — Applied at [nic.eu.org](https://nic.eu.org) (free lifetime domain)
- **tunbet.us.kg** — Applied at [nic.us.kg](https://nic.us.kg) (free lifetime domain)

## 🛠️ Local Development

```bash
# Frontend
cd tunbet
npm install
npm run dev

# Backend
cd tunbet-sportsbook
npm install
PORT=4000 node server.js
```

## 🎮 Features
- 1577+ AES Gaming slots (real money TND)
- Live sportsbook with ESPN real data
- Admin panel (`/admin`) — `legendary_admin` / `Casino2026!`
- Agent panel (`/agent`)
- 3 languages: AR / EN / FR
- Atomic balance operations
- Anti-cheat sports betting (5s delay, goal suspension, odds verification)
