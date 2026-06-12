# 🚀 الدليل الشامل الملكي لإعداد وتجهيز خادم VPS لمنصة TunBet

أكد لك **Master King** (الدعم الفني لـ OroPlay) التشخيص الهندسي الدقيق الذي برمجناه: الخوادم السحابية المجانية (مثل Render) تمتلك عناوين IP متغيرة، ونظام الحماية الصارم لدى OroPlay يتطلب **عنوان IP ثابت ودائم لا يتغير أبداً (Static VPS PaaS external IP)**.

عندما تشتري خادم VPS (من *DigitalOcean*, *Hetzner*, *Contabo*, أو *Vultr*) بنظام **Ubuntu 24.04** أو **22.04 LTS**، لن تحتاج إلى أي خبرة برمجية معقدة! قمنا بتجهيز سكربت أوتوماتيكي بضغطة زر واحدة يقوم ببناء السيرفر وتثبيت كل شيء في 3 دقائق.

---

## 🛠️ الطريقة الأولى: التثبيت الأوتوماتيكي بضغطة زر (One-Click Auto Install)

بمجرد استلامك للخادم الجديد والدخول إليه عبر الـ SSH (باستخدام `PuTTY` أو موجه الأوامر)، قم بنسخ ولصق هذا الأمر المجمع فقط واضغط `Enter`:

```bash
curl -s -O https://raw.githubusercontent.com/hatemzaghwani-cmyk/tunbet/main/scripts/vps-setup.sh && chmod +x vps-setup.sh && sudo ./vps-setup.sh
```

### 🤖 ماذا يفعل هذا السكربت الأوتوماتيكي؟
1. يكتشف عنوان الـ **IP الثابت** الجديد لخادمك أوتوماتيكياً.
2. يثبت أحدث إصدار من **Node.js (v20 LTS)** و أدوات حزم الـ `npm` و `Git`.
3. يثبت مدير المهام الملكي **PM2** لتشغيل السيرفر في الخلفية وضمان إقلاعه أوتوماتيكياً عند إعادة تشغيل الخادم.
4. يسحب أحدث كود معتمد للخادم الخلفي من GitHub (`tunbet-sportsbook`) ويثبت جميع الحزم.
5. ينشئ ملف الاعتماد البيئي (`.env`) ببيانات Supabase ومفاتيح OroPlay.
6. يثبت و يضبط خادم **Nginx** كبوابة حماية وتوجيه عكسي (Reverse Proxy) لربط المنفذ `80` بالمنفذ `4000` بأقصى درجات الاستقرار.

---

## 🖥️ الطريقة الثانية: التثبيت اليدوي خطوة بخطوة (لمحبي التحكم الكامل)

إذا أردت تنفيذ الخطوات بنفسك خطوة بخطوة، نفذ الأوامر التالية بالترتيب:

### 1. تحديث النظام وتثبيت Node.js و Git
```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y git curl nginx ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### 2. سحب الكود وتثبيت الحزم
```bash
cd /var/www
sudo git clone https://github.com/hatemzaghwani-cmyk/tunbet-sportsbook.git tunbet-backend
cd tunbet-backend
sudo npm install
```

### 3. إعداد ملف البيئة والحماية (`.env`)
قم بإنشاء ملف `.env` متضمناً عنوان IP السيرفر الجديد:
```env
PORT=4000
NODE_ENV=production
SUPABASE_URL=https://cjzjrnagpsdmolvbkhnu.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqempybmFncHNkbW9sdmJraG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM0ODY4NCwiZXhwIjoyMDk1OTI0Njg0fQ.TmowEatc4g2xpD-GT0r-jofX1zCtXjTD-s4LF7JSs6o
ORO_API_URL=https://bs.sxvwlkohlv.com/api/v2
ORO_CLIENT_ID=Hatem1_TND
ORO_CLIENT_SECRET=JdYysA2TS7K3xzIYJoOlRn2z9i9XWk57
ORO_SEAMLESS_SECRET=tunbet_seamless_2026
```

### 4. تشغيل السيرفر بصفة دائمة عبر PM2
```bash
pm2 start server.js --name "tunbet-sportsbook"
pm2 save
pm2 startup
```

---

## 🎯 الخطوة الختامية والأهم (بعد تجهيز الـ VPS)

بمجرد أن يعمل السيرفر الجديد ويصبح لديك عنوان IP ثابت (مثلاً `188.166.xx.xx`):

1. ادخل إلى لوحة تحكم الوكيل **[und7br.sxvwlkohlv.com](https://und7br.sxvwlkohlv.com)**.
2. توجه إلى قسم `Profile` → ثم **`White IP List`** و **`Callback IP`**.
3. أضف عنوان ה-IP الثابت الجديد الخاص بـ VPS الخاص بك و اضغط **Save**.
4. أرسل رسالة سريعة لـ **Master King** لتأكيد تحديث الجدار الناري الخارجي:
   > *"Hello Master King, I have purchased a permanent VPS server with the static IP: `[اكتب الـ IP هنا]`. I have added it to my dashboard White IP List for AgentCode `Hatem1_TND`. Please authorize this stable VPS IP on the firewall edge (`bs.sxvwlkohlv.com`), and all our problems are solved!"*

**ستعمل جميع ألعاب OroPlay (Amatic, NoLimit City, Rubyplay) والحية مدى الحياة وبدون أي توقف أو مشاكل تقنية! 🎰🚀**
