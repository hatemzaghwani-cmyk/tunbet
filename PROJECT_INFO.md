# TunBet — Project Info
**Live URL:** https://tunbet.surge.sh  
**Backend Tunnel:** https://advisors-but-jason-york.trycloudflare.com  

## Credentials
- **Surge:** hatemzaghwani@gmail.com / 55287973hatem
- **Admin Panel:** https://tunbet.surge.sh/admin — legendary_admin / Casino2026!
- **Agent Panel:** https://tunbet.surge.sh/agent
- **Supabase:** https://cjzjrnagpsdmolvbkhnu.supabase.co
- **AES Gaming Token:** 290c38c7-7df8-4913-9f77-2865e31f1edc

## Deploy Commands
```bash
cd /home/user/tunbet-deploy
npm install && npx vite build
cp -r public/* dist/; cp dist/index.html dist/200.html
npx surge ./dist tunbet.surge.sh
```

## Backend Commands
```bash
cd /home/user/tunbet-backend && npm install && PORT=4000 node server.js &
/tmp/cloudflared tunnel --url http://localhost:4000
```
