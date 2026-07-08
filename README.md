# بوت ميوزك ديسكورد

بوت يبقى دايم متصل بروم صوتي محدد، ويرجع تلقائياً لو حد فصله. يدعم التشغيل من يوتيوب (بحث أو رابط) وسبوتيفاي (رابط ترانك/بلايليست/ألبوم)، بجودة صوت عالية (192kbps + تطبيع صوت).

## الأوامر
| الأمر | الوظيفة |
|---|---|
| `!play <اسم أو رابط>` | يشغل أو يضيف للطابور |
| `!skip` | تخطي المقطع الحالي |
| `!stop` | إيقاف وتفريغ الطابور (يبقى بالروم) |
| `!pause` / `!resume` | إيقاف مؤقت / استكمال |
| `!queue` | عرض الطابور |
| `!volume <0-200>` | ضبط مستوى الصوت |
| `!nowplaying` | المقطع الحالي |

---

## 1) إنشاء البوت على ديسكورد
1. روح [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. من تبويب **Bot** → **Reset Token** وخذ نسخة من التوكن (هذا هو `DISCORD_TOKEN`).
3. فعّل هذي الـ Privileged Gateway Intents: **SERVER MEMBERS**, **MESSAGE CONTENT**.
4. من تبويب **OAuth2 → URL Generator**: اختر `bot`، والصلاحيات: `Connect`, `Speak`, `Send Messages`, `Read Message History`. افتح الرابط وضيف البوت لسيرفرك.

## 2) الحصول على آيدي الروم والسيرفر
فعّل Developer Mode بديسكورد (الإعدادات → Advanced)، بعدين كليك يمين على الروم الصوتي المطلوب → **Copy Channel ID** (`VOICE_CHANNEL_ID`)، وكليك يمين على اسم السيرفر → **Copy Server ID** (`GUILD_ID`).

## 3) بيانات سبوتيفاي (اختياري)
روح [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → **Create App** → خذ `Client ID` و `Client Secret`.

## 4) رفع الكود على GitHub
```bash
cd discord-bot
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```
⚠️ لا ترفع ملف `.env` أبداً (موجود بالـ `.gitignore` أصلاً).

## 5) النشر على Render
1. سوي حساب على [render.com](https://render.com) واربطه بحساب GitHub.
2. **New** → **Web Service** → اختر الريبو.
3. Render بيكتشف الـ `Dockerfile` تلقائياً (فيه ffmpeg مثبت بداخله) — اختر **Environment: Docker**.
4. Plan: **Free**.
5. من تبويب **Environment** ضيف المتغيرات:
   - `DISCORD_TOKEN`
   - `VOICE_CHANNEL_ID`
   - `GUILD_ID`
   - `SPOTIFY_CLIENT_ID` (اختياري)
   - `SPOTIFY_CLIENT_SECRET` (اختياري)
6. اضغط **Create Web Service** — أول نشر ياخذ كم دقيقة.

### ⚠️ مهم: خطة Render المجانية "تنام" بعد 15 دقيقة بدون طلبات HTTP
البوت فيه سيرفر صغير (`keep_alive.py`) يفتح رابط عشان Render يعتبره شغال، لكن لازم شي يزوره كل فترة وإلا بينام والبوت بينفصل. الحل:
- سوي حساب مجاني على [UptimeRobot](https://uptimerobot.com) وضيف مراقبة (HTTP Monitor) على رابط الخدمة اللي يعطيك ياه Render (شكله زي `https://your-app.onrender.com`) كل 5 دقائق.
- أو ترقّي لخطة Render المدفوعة (Starter) لضمان اشتغال دائم بدون نوم.

## البقاء بالروم الصوتي تلقائياً
البوت يتصل بالروم المحدد بـ `VOICE_CHANNEL_ID` عند التشغيل، وفيه فحص كل 30 ثانية + استماع لحدث الفصل، فلو أي أدمن سحبه أو فصله، يرجع الروم نفسه تلقائياً خلال ثوانٍ.
