#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════
# 🚀 TunBet King VPS Setup Script (One-Click Auto Installation)
# Author: TunBet Platform Engineering / Hatem Zaghwani
# ════════════════════════════════════════════════════════════════════════════

set -e

# Colors for premium output
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================================${NC}"
echo -e "${GREEN}        🚀 STARTING TUNBET ROYAL VPS INSTALLATION ENGINE 🚀           ${NC}"
echo -e "${CYAN}======================================================================${NC}"

# Ensure root privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Please run this installation script as root (sudo ./vps-setup.sh)${NC}"
  exit 1
fi

echo -e "\n${YELLOW}🔍 [1/6] Auto-detecting VPS Permanent External Static IP address...${NC}"
VPS_IP=$(curl -s https://api.ipify.org || curl -s https://icanhazip.com || echo "UNKNOWN_IP")
if [ "$VPS_IP" == "UNKNOWN_IP" ]; then
  echo -e "${RED}❌ Failed to detect external IP address. Check network connection.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Detected VPS Permanent Static PaaS external IP: ${CYAN}${VPS_IP}${NC}"

echo -e "\n${YELLOW}📦 [2/6] Updating Operating System packages & installing core dependencies...${NC}"
apt-get update -y && apt-get upgrade -y
apt-get install -y git curl nginx ufw build-essential software-properties-common

echo -e "\n${YELLOW}🟢 [3/6] Installing Enterprise Node.js (v20 LTS) & PM2 Process Manager...${NC}"
if ! which node > /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm install -g npm@latest pm2@latest

echo -e "\n${YELLOW}🌐 [4/6] Cloning official backend repository (tunbet-sportsbook)...${NC}"
TARGET_DIR="/var/www/tunbet-sportsbook"
if [ -d "$TARGET_DIR" ]; then
  echo -e "Directory already exists, pulling latest updates..."
  cd "$TARGET_DIR" && git pull origin main
else
  mkdir -p /var/www
  cd /var/www && git clone https://github.com/hatemzaghwani-cmyk/tunbet-sportsbook.git tunbet-sportsbook
  cd "$TARGET_DIR"
fi

echo -e "Installing application Node dependencies..."
npm install

echo -e "\n${YELLOW}🛡️ [5/6] Building Production Environment credentials (.env)...${NC}"
cat << EOF > "$TARGET_DIR/.env"
PORT=4000
NODE_ENV=production
SUPABASE_URL=https://cjzjrnagpsdmolvbkhnu.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqempybmFncHNkbW9sdmJraG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM0ODY4NCwiZXhwIjoyMDk1OTI0Njg0fQ.TmowEatc4g2xpD-GT0r-jofX1zCtXjTD-s4LF7JSs6o
ORO_API_URL=https://bs.sxvwlkohlv.com/api/v2
ORO_CLIENT_ID=Hatem1_TND
ORO_CLIENT_SECRET=JdYysA2TS7K3xzIYJoOlRn2z9i9XWk57
ORO_SEAMLESS_SECRET=tunbet_seamless_2026
RENDER_EXTERNAL_IP=${VPS_IP}
EOF

echo -e "\n${YELLOW}🚀 [6/6] Starting TunBet Backend Engine permanently via PM2...${NC}"
pm2 start server.js --name "tunbet-sportsbook" --update-env || pm2 restart "tunbet-sportsbook" --update-env
pm2 save
pm2 startup systemd -u root --hp /root || true

echo -e "\n${CYAN}======================================================================${NC}"
echo -e "${GREEN}🎉 CONGRATULATIONS! TUNBET Royal BACKEND SUCCESSFULLY INSTALLED! 🎉${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo -e "🟢 ${YELLOW}Your Permanent VPS PaaS Outbound external IP is:${NC} ${CYAN}${VPS_IP}${NC}"
echo -e "🟢 ${YELLOW}Backend Service running permanently on local Port:${NC} 4000\n"

echo -e "${RED}⚠️ CRITICAL FINAL ACTION FOR OROPLAY GAMES LAUNCH: ⚠️${NC}"
echo -e "1. Login to your OroPlay Agent Dashboard: ${CYAN}https://und7br.sxvwlkohlv.com${NC}"
echo -e "2. Go to Profile -> ${GREEN}White IP List${NC} and ${GREEN}Callback IP${NC}"
echo -e "3. Put your exact new Static IP: ${CYAN}${VPS_IP}${NC} and click Save"
echo -e "4. Message Master King on Telegram to confirm manual firewall update:\n"
echo -e "${CYAN}\"Hello Master King, I have purchased a VPS server with the permanent Static IP: ${VPS_IP}. I have added it to my dashboard Whitelist. Please authorize this stable IP on the live firewall edge (bs.sxvwlkohlv.com). Thank you!\"${NC}\n"
