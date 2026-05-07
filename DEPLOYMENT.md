# EditorPack Deployment

## Local Ishga Tushirish

```bash
npm install
npm start
```

Keyin browserda oching:

```text
http://localhost:4000
```



## Vercel + MongoDB Atlas

Vercel project settings ichida `Environment Variables`ga shularni qo'shing:

```text
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/editorpack?appName=Cluster0
JWT_SECRET=uzoq-va-maxfiy-random-string
ADMIN_EMAIL=karimovbdulloh@gmail.com
ADMIN_PASSWORD=kuchli-parol
```

`MONGODB_URI` ichida o'zingizning MongoDB user va passwordingiz bo'ladi. Uni GitHubga yozmang.

## Vercel Sozlamalari

Build command:

```text
npm install
```

Output directory:

```text
.
```

Start command kerak emas. Vercel `/api/*` so'rovlarni `api/index.js` orqali ishlatadi, HTML/CSS/JS fayllarni esa static qilib beradi.

## Muhim

Lokal ishlaganda `MONGODB_URI` bo'lmasa server `data/db.json`dan foydalanadi. Online deployda esa albatta `MONGODB_URI` qo'ying, shunda userlar va packlar MongoDB Atlasda saqlanadi.
