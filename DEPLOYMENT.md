# EditorPack Node Deployment

## Local ishga tushirish

```bash
npm start
```

Keyin browserda oching:

```text
http://localhost:4000
```

Default admin:

```text
Email: karimovbdulloh@gmail.com
Password: admin123
```

## Muhim env sozlamalar

Online joylashda hosting panelida shularni qo'ying:

```text
PORT=4000
JWT_SECRET=uzoq-va-maxfiy-random-string
ADMIN_EMAIL=karimovbdulloh@gmail.com
ADMIN_PASSWORD=kuchli-parol
```

Ko'p hostinglar `PORT`ni o'zi beradi. Shunda `PORT`ni qo'lda berish shart emas.

## Online qilish

Render, Railway, VPS yoki boshqa Node.js hostingda:

```bash
npm start
```

Start command shu bo'ladi. Project build command talab qilmaydi, chunki frontend static HTML/CSS/JS.

## Ma'lumotlar qayerda turadi?

Server ma'lumotlarni `data/db.json` ichida saqlaydi. Oddiy hostinglarda bu ishlaydi, lekin production uchun eng yaxshi variant keyin MongoDB yoki PostgreSQLga o'tish. Hozirgi yechim localStoragedan ancha to'g'ri: barcha user va packlar serverda bitta joyda saqlanadi.
