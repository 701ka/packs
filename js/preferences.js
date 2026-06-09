(function () {
  const LANG_KEY = "editorpack_lang";
  const THEME_KEY = "editorpack_theme";
  const supportedLangs = ["uz", "ru", "en"];
  const html = document.documentElement;
  const textOriginals = new WeakMap();

  const dictionary = {
    "Browse Packs": { uz: "Packlarni ko'rish", ru: "Смотреть паки", en: "Browse Packs" },
    "Free Packs": { uz: "Bepul packlar", ru: "Бесплатные паки", en: "Free Packs" },
    "AI Scanner": { uz: "AI Scanner", ru: "AI сканер", en: "AI Scanner" },
    "Admin": { uz: "Admin", ru: "Админ", en: "Admin" },
    "Panel": { uz: "Panel", ru: "Панель", en: "Panel" },
    "AI-powered editing resource hub": { uz: "AI bilan kuchaytirilgan editing hub", ru: "AI-хаб ресурсов для монтажа", en: "AI-powered editing resource hub" },
    "CapCut, After Effects, Premiere Pro va DaVinci uchun packlarni toping. Video yuklab, AI Scanner orqali undagi effect, transition va SFXlarni taxmin qiling.": {
      uz: "CapCut, After Effects, Premiere Pro va DaVinci uchun packlarni toping. Video yuklab, AI Scanner orqali undagi effect, transition va SFXlarni taxmin qiling.",
      ru: "Находите паки для CapCut, After Effects, Premiere Pro и DaVinci. Загрузите видео, а AI Scanner подскажет эффекты, переходы и SFX.",
      en: "Find packs for CapCut, After Effects, Premiere Pro and DaVinci. Upload a video and AI Scanner estimates the effects, transitions and SFX inside it.",
    },
    "Browse packs": { uz: "Packlarni ko'rish", ru: "Смотреть паки", en: "Browse packs" },
    "Try AI Scanner": { uz: "AI Scannerni sinash", ru: "Попробовать AI Scanner", en: "Try AI Scanner" },
    "Free packs": { uz: "Bepul packlar", ru: "Бесплатные паки", en: "Free packs" },
    "Transitions": { uz: "Transitionlar", ru: "Переходы", en: "Transitions" },
    "LUTs": { uz: "LUTlar", ru: "LUT-пресеты", en: "LUTs" },
    "Overlays": { uz: "Overlaylar", ru: "Оверлеи", en: "Overlays" },
    "SFX": { uz: "SFX", ru: "SFX", en: "SFX" },
    "Templates": { uz: "Templatlar", ru: "Шаблоны", en: "Templates" },
    "Total packs": { uz: "Jami packlar", ru: "Всего паков", en: "Total packs" },
    "Free resources": { uz: "Bepul resurslar", ru: "Бесплатные ресурсы", en: "Free resources" },
    "Downloads": { uz: "Yuklab olishlar", ru: "Скачивания", en: "Downloads" },
    "Supported apps": { uz: "Qo'llab-quvvatlanadigan ilovalar", ru: "Поддерживаемые приложения", en: "Supported apps" },
    "New AI tool": { uz: "Yangi AI tool", ru: "Новый AI-инструмент", en: "New AI tool" },
    "Videodagi effectlarni topishga yordam beradi": { uz: "Videodagi effectlarni topishga yordam beradi", ru: "Помогает найти эффекты в видео", en: "Helps find effects used in a video" },
    "AI Edit Scanner videodan kadr va audio signallarni o'qib, flash, motion blur, whip pan, beat hit, riser yoki color grade kabi ehtimollarni confidence foiz bilan chiqaradi.": {
      uz: "AI Edit Scanner videodan kadr va audio signallarni o'qib, flash, motion blur, whip pan, beat hit, riser yoki color grade kabi ehtimollarni confidence foiz bilan chiqaradi.",
      ru: "AI Edit Scanner читает кадры и аудио из видео, затем показывает flash, motion blur, whip pan, beat hit, riser или color grade с процентом уверенности.",
      en: "AI Edit Scanner reads frame and audio signals from a video, then returns likely flash, motion blur, whip pan, beat hit, riser or color grade with confidence.",
    },
    "Analyze video": { uz: "Videoni tahlil qilish", ru: "Анализировать видео", en: "Analyze video" },
    "Find matching packs": { uz: "Mos packlarni topish", ru: "Найти подходящие паки", en: "Find matching packs" },
    "Browse by App": { uz: "Ilova bo'yicha ko'rish", ru: "По приложениям", en: "Browse by App" },
    "Trending packs": { uz: "Trenddagi packlar", ru: "Популярные паки", en: "Trending packs" },
    "Hammasini ko'rish": { uz: "Hammasini ko'rish", ru: "Смотреть все", en: "View all" },
    "Qanday ishlaydi?": { uz: "Qanday ishlaydi?", ru: "Как это работает?", en: "How it works?" },
    "Ro'yxatdan o'ting": { uz: "Ro'yxatdan o'ting", ru: "Зарегистрируйтесь", en: "Sign up" },
    "Bepul akkaunt yarating va barcha packlar katalogiga kiring.": { uz: "Bepul akkaunt yarating va barcha packlar katalogiga kiring.", ru: "Создайте бесплатный аккаунт и получите доступ к каталогу паков.", en: "Create a free account and access the full pack catalog." },
    "Pack tanlang": { uz: "Pack tanlang", ru: "Выберите пак", en: "Choose a pack" },
    "O'zingizga kerakli dastur, narx yoki AI Scanner natijasiga mos packni toping.": { uz: "O'zingizga kerakli dastur, narx yoki AI Scanner natijasiga mos packni toping.", ru: "Найдите пак по программе, цене или результату AI Scanner.", en: "Find the right pack by app, price or AI Scanner result." },
    "Yuklab oling": { uz: "Yuklab oling", ru: "Скачайте", en: "Download" },
    "Bir bosish bilan yuklab oling va montaj jarayoningizni tezlashtiring.": { uz: "Bir bosish bilan yuklab oling va montaj jarayoningizni tezlashtiring.", ru: "Скачайте в один клик и ускорьте монтаж.", en: "Download in one click and speed up your editing workflow." },
    "For creators": { uz: "Creatorlar uchun", ru: "Для авторов", en: "For creators" },
    "O'z editing packlaringizni marketplacega joylang": { uz: "O'z editing packlaringizni marketplacega joylang", ru: "Размещайте свои паки на маркетплейсе", en: "Publish your editing packs on the marketplace" },
    "Uploader panel orqali pack qo'shing, admin tasdiqlaganidan keyin katalogda chiqadi. AI yordamida tavsif yozish va scanner bilan mos auditoriyani topish osonlashadi.": {
      uz: "Uploader panel orqali pack qo'shing, admin tasdiqlaganidan keyin katalogda chiqadi. AI yordamida tavsif yozish va scanner bilan mos auditoriyani topish osonlashadi.",
      ru: "Добавьте пак через uploader-панель, после проверки админом он появится в каталоге. AI поможет с описанием и подбором аудитории.",
      en: "Add a pack through the uploader panel. After admin approval it appears in the catalog. AI helps with descriptions and audience matching.",
    },
    "Open uploader panel": { uz: "Uploader panelni ochish", ru: "Открыть uploader-панель", en: "Open uploader panel" },
    "Packs": { uz: "Packlar", ru: "Паки", en: "Packs" },
    "All Packs": { uz: "Barcha packlar", ru: "Все паки", en: "All Packs" },
    "CapCut Packs": { uz: "CapCut packlar", ru: "Паки CapCut", en: "CapCut Packs" },
    "After Effects": { uz: "After Effects", ru: "After Effects", en: "After Effects" },
    "DaVinci Resolve": { uz: "DaVinci Resolve", ru: "DaVinci Resolve", en: "DaVinci Resolve" },
    "Tools": { uz: "Toollar", ru: "Инструменты", en: "Tools" },
    "Uploader Panel": { uz: "Uploader panel", ru: "Панель загрузки", en: "Uploader Panel" },
    "Admin Panel": { uz: "Admin panel", ru: "Админ-панель", en: "Admin Panel" },
    "Support": { uz: "Yordam", ru: "Поддержка", en: "Support" },
    "Help Center": { uz: "Yordam markazi", ru: "Центр помощи", en: "Help Center" },
    "Privacy Policy": { uz: "Maxfiylik siyosati", ru: "Политика конфиденциальности", en: "Privacy Policy" },
    "Terms of Service": { uz: "Foydalanish shartlari", ru: "Условия сервиса", en: "Terms of Service" },
    "Refund Policy": { uz: "Pul qaytarish siyosati", ru: "Политика возврата", en: "Refund Policy" },
    "Built for video editors": { uz: "Video editorlar uchun qurilgan", ru: "Создано для видеоредакторов", en: "Built for video editors" },
    "Browse Packs - EditorPack": { uz: "Packlarni ko'rish - EditorPack", ru: "Смотреть паки - EditorPack", en: "Browse Packs - EditorPack" },
    "Browse Packs — EditorPack": { uz: "Packlarni ko'rish - EditorPack", ru: "Смотреть паки - EditorPack", en: "Browse Packs - EditorPack" },
    "Sign Up - EditorPack": { uz: "Ro'yxatdan o'tish - EditorPack", ru: "Регистрация - EditorPack", en: "Sign Up - EditorPack" },
    "Login - EditorPack": { uz: "Kirish - EditorPack", ru: "Вход - EditorPack", en: "Login - EditorPack" },
    "Pack Detail - EditorPack": { uz: "Pack tafsiloti - EditorPack", ru: "Детали пака - EditorPack", en: "Pack Detail - EditorPack" },
    "Uploader Panel - EditorPack": { uz: "Uploader panel - EditorPack", ru: "Панель загрузки - EditorPack", en: "Uploader Panel - EditorPack" },
    "Admin Panel - EditorPack": { uz: "Admin panel - EditorPack", ru: "Админ-панель - EditorPack", en: "Admin Panel - EditorPack" },
    "500+ premium editing resources uchun kerakligini toping": { uz: "500+ premium editing resurslardan keraklisini toping", ru: "Найдите нужное среди 500+ premium ресурсов", en: "Find what you need from 500+ premium editing resources" },
    "All": { uz: "Hammasi", ru: "Все", en: "All" },
    "Free Only": { uz: "Faqat bepul", ru: "Только бесплатно", en: "Free Only" },
    "Pack topilmadi.": { uz: "Pack topilmadi.", ru: "Пак не найден.", en: "No packs found." },
    "Download": { uz: "Yuklab olish", ru: "Скачать", en: "Download" },
    "Get Pack": { uz: "Packni olish", ru: "Получить пак", en: "Get Pack" },
    "AI Edit Scanner": { uz: "AI Edit Scanner", ru: "AI Edit Scanner", en: "AI Edit Scanner" },
    "Smart video analyzer": { uz: "Aqlli video analyzer", ru: "Умный анализатор видео", en: "Smart video analyzer" },
    "Video yuklang. Scanner kadrlar va audiodan transition, effect va SFX ehtimollarini topadi, keyin mos packlarni tavsiya qiladi.": {
      uz: "Video yuklang. Scanner kadrlar va audiodan transition, effect va SFX ehtimollarini topadi, keyin mos packlarni tavsiya qiladi.",
      ru: "Загрузите видео. Scanner найдет вероятные переходы, эффекты и SFX по кадрам и аудио, затем порекомендует паки.",
      en: "Upload a video. Scanner finds likely transitions, effects and SFX from frames and audio, then recommends matching packs.",
    },
    "Video tanlang": { uz: "Video tanlang", ru: "Выберите видео", en: "Choose a video" },
    "MP4, MOV yoki WEBM. 10-30 soniya ideal.": { uz: "MP4, MOV yoki WEBM. 10-30 soniya ideal.", ru: "MP4, MOV или WEBM. Идеально 10-30 секунд.", en: "MP4, MOV or WEBM. 10-30 seconds is ideal." },
    "Analyze video": { uz: "Videoni tahlil qilish", ru: "Анализировать видео", en: "Analyze video" },
    "Reset": { uz: "Tozalash", ru: "Сбросить", en: "Reset" },
    "Analyzing...": { uz: "Tahlil qilinmoqda...", ru: "Анализ...", en: "Analyzing..." },
    "Natija shu yerda chiqadi": { uz: "Natija shu yerda chiqadi", ru: "Результат появится здесь", en: "Results will appear here" },
    "Scanner video ritmi, kadr almashishlari, yorug'lik o'zgarishi va audio peaklarni tahlil qiladi.": {
      uz: "Scanner video ritmi, kadr almashishlari, yorug'lik o'zgarishi va audio peaklarni tahlil qiladi.",
      ru: "Scanner анализирует ритм видео, смену кадров, свет и аудио-пики.",
      en: "Scanner analyzes video rhythm, frame changes, light changes and audio peaks.",
    },
    "Edit intensity": { uz: "Edit intensivligi", ru: "Интенсивность монтажа", en: "Edit intensity" },
    "Medium": { uz: "O'rtacha", ru: "Средняя", en: "Medium" },
    "High": { uz: "Yuqori", ru: "Высокая", en: "High" },
    "Low": { uz: "Past", ru: "Низкая", en: "Low" },
    "Topilgan effektlar": { uz: "Topilgan effektlar", ru: "Найденные эффекты", en: "Detected effects" },
    "Analyzer metriclari": { uz: "Analyzer metriclari", ru: "Метрики анализатора", en: "Analyzer metrics" },
    "Timeline taxminlari": { uz: "Timeline taxminlari", ru: "Предположения по таймлайну", en: "Timeline estimates" },
    "Mos packlar": { uz: "Mos packlar", ru: "Подходящие паки", en: "Matching packs" },
    "Ro'yxatdan o'tish": { uz: "Ro'yxatdan o'tish", ru: "Регистрация", en: "Sign Up" },
    "Bepul akkaunt yarating": { uz: "Bepul akkaunt yarating", ru: "Создайте бесплатный аккаунт", en: "Create a free account" },
    "Ismingiz": { uz: "Ismingiz", ru: "Ваше имя", en: "Your name" },
    "Email": { uz: "Email", ru: "Email", en: "Email" },
    "Parol": { uz: "Parol", ru: "Пароль", en: "Password" },
    "Akkaunt bormi?": { uz: "Akkaunt bormi?", ru: "Уже есть аккаунт?", en: "Already have an account?" },
    "Kirish": { uz: "Kirish", ru: "Войти", en: "Log In" },
    "Akkauntingizga kiring": { uz: "Akkauntingizga kiring", ru: "Войдите в аккаунт", en: "Log in to your account" },
    "Akkaunt yo'qmi?": { uz: "Akkaunt yo'qmi?", ru: "Нет аккаунта?", en: "No account?" },
    "Ro'yxatdan o'ting": { uz: "Ro'yxatdan o'ting", ru: "Зарегистрируйтесь", en: "Sign up" },
    "Qidirish...": { uz: "Qidirish...", ru: "Поиск...", en: "Search..." },
    "Search packs, transitions, LUTs, templates...": { uz: "Pack, transition, LUT, template qidiring...", ru: "Ищите паки, переходы, LUT, шаблоны...", en: "Search packs, transitions, LUTs, templates..." },
    "Real-time": { uz: "Real-time", ru: "В реальном времени", en: "Real-time" },
    "Back to Site": { uz: "Saytga qaytish", ru: "Вернуться на сайт", en: "Back to Site" },
    "Barchani boshqarish": { uz: "Barchani boshqarish", ru: "Управление всем", en: "Manage everything" },
    "Foydalanuvchilar": { uz: "Foydalanuvchilar", ru: "Пользователи", en: "Users" },
    "Packlar": { uz: "Packlar", ru: "Паки", en: "Packs" },
    "Jami foydalanuvchilar": { uz: "Jami foydalanuvchilar", ru: "Всего пользователей", en: "Total users" },
    "Uploaderlar": { uz: "Uploaderlar", ru: "Загрузчики", en: "Uploaders" },
    "Adminlar": { uz: "Adminlar", ru: "Админы", en: "Admins" },
    "Barcha foydalanuvchilar": { uz: "Barcha foydalanuvchilar", ru: "Все пользователи", en: "All users" },
    "Yuklanmoqda...": { uz: "Yuklanmoqda...", ru: "Загрузка...", en: "Loading..." },
    "Jami packlar": { uz: "Jami packlar", ru: "Всего паков", en: "Total packs" },
    "Kutayotganlar": { uz: "Kutayotganlar", ru: "Ожидают", en: "Pending" },
    "Live packlar": { uz: "Live packlar", ru: "Активные паки", en: "Live packs" },
    "Barcha packlar": { uz: "Barcha packlar", ru: "Все паки", en: "All packs" },
    "Hammasi": { uz: "Hammasi", ru: "Все", en: "All" },
    "Rad etilgan": { uz: "Rad etilgan", ru: "Отклонено", en: "Rejected" },
    "Packni tahrirlash": { uz: "Packni tahrirlash", ru: "Редактировать пак", en: "Edit pack" },
    "Nomi": { uz: "Nomi", ru: "Название", en: "Name" },
    "Tavsif": { uz: "Tavsif", ru: "Описание", en: "Description" },
    "Narxi": { uz: "Narxi", ru: "Цена", en: "Price" },
    "Rasm URL": { uz: "Rasm URL", ru: "URL изображения", en: "Image URL" },
    "Download URL": { uz: "Download URL", ru: "URL скачивания", en: "Download URL" },
    "Badge": { uz: "Badge", ru: "Бейдж", en: "Badge" },
    "Status": { uz: "Status", ru: "Статус", en: "Status" },
    "Bekor": { uz: "Bekor", ru: "Отмена", en: "Cancel" },
    "Saqlash": { uz: "Saqlash", ru: "Сохранить", en: "Save" },
    "Dashboard": { uz: "Dashboard", ru: "Панель", en: "Dashboard" },
    "Pack yuklash": { uz: "Pack yuklash", ru: "Загрузить пак", en: "Upload pack" },
    "Saytga qaytish": { uz: "Saytga qaytish", ru: "Вернуться на сайт", en: "Back to site" },
    "Yangi Pack yuklash": { uz: "Yangi Pack yuklash", ru: "Загрузить новый пак", en: "Upload a new pack" },
    "To'ldiring va admin tasdiqlashini kuting": { uz: "To'ldiring va admin tasdiqlashini kuting", ru: "Заполните форму и дождитесь проверки админа", en: "Fill it out and wait for admin approval" },
    "Jami packlarim": { uz: "Jami packlarim", ru: "Всего моих паков", en: "My total packs" },
    "Live packlar": { uz: "Live packlar", ru: "Активные паки", en: "Live packs" },
    "Admin kutmoqda": { uz: "Admin kutmoqda", ru: "Ожидает админа", en: "Waiting for admin" },
    "Mening packlarim": { uz: "Mening packlarim", ru: "Мои паки", en: "My packs" },
    "+ Yangi Pack": { uz: "+ Yangi Pack", ru: "+ Новый пак", en: "+ New Pack" },
    "Pack nomi *": { uz: "Pack nomi *", ru: "Название пака *", en: "Pack name *" },
    "Pack nomi bu yerda": { uz: "Pack nomi bu yerda", ru: "Название пака здесь", en: "Pack name here" },
    "Tavsif *": { uz: "Tavsif *", ru: "Описание *", en: "Description *" },
    "Pack tavsifi bu yerda ko'rinadi...": { uz: "Pack tavsifi bu yerda ko'rinadi...", ru: "Описание пака появится здесь...", en: "Pack description appears here..." },
    "Pack haqida qisqacha...": { uz: "Pack haqida qisqacha...", ru: "Коротко о паке...", en: "Shortly about the pack..." },
    "Masalan: Cinematic LUT Pack": { uz: "Masalan: Cinematic LUT Pack", ru: "Например: Cinematic LUT Pack", en: "For example: Cinematic LUT Pack" },
    "Narxi": { uz: "Narxi", ru: "Цена", en: "Price" },
    "Yo'q": { uz: "Yo'q", ru: "Нет", en: "None" },
    "Ilovalar": { uz: "Ilovalar", ru: "Приложения", en: "Apps" },
    "All Apps": { uz: "Barcha ilovalar", ru: "Все приложения", en: "All Apps" },
    "Pack rasmi *": { uz: "Pack rasmi *", ru: "Изображение пака *", en: "Pack image *" },
    "Rasm yuklash uchun bosing": { uz: "Rasm yuklash uchun bosing", ru: "Нажмите, чтобы загрузить изображение", en: "Click to upload an image" },
    "PNG, JPG, WEBP — max 5MB": { uz: "PNG, JPG, WEBP - max 5MB", ru: "PNG, JPG, WEBP - максимум 5MB", en: "PNG, JPG, WEBP - max 5MB" },
    "O'chirish": { uz: "O'chirish", ru: "Удалить", en: "Delete" },
    "Pack yuborilgandan so'ng admin tekshirib, tasdiqlaydi. Tasdiqlanguncha \"pending\" holatida turadi.": {
      uz: "Pack yuborilgandan so'ng admin tekshirib, tasdiqlaydi. Tasdiqlanguncha \"pending\" holatida turadi.",
      ru: "После отправки пак проверит и подтвердит админ. До подтверждения он будет в статусе pending.",
      en: "After submission, an admin reviews and approves the pack. Until approval, it stays pending.",
    },
    "Tozalash": { uz: "Tozalash", ru: "Очистить", en: "Clear" },
    "Yuborish": { uz: "Yuborish", ru: "Отправить", en: "Submit" },
    "Namuna ko'rinish": { uz: "Namuna ko'rinish", ru: "Предпросмотр", en: "Preview" },
    "Maslahatlar": { uz: "Maslahatlar", ru: "Советы", en: "Tips" },
    "Sifatli rasm yuklang": { uz: "Sifatli rasm yuklang", ru: "Загрузите качественное изображение", en: "Upload a quality image" },
    "1280×720 yoki undan katta. Pack ichidan eng yaxshi frameni oling.": { uz: "1280x720 yoki undan katta. Pack ichidan eng yaxshi frameni oling.", ru: "1280x720 или больше. Возьмите лучший кадр из пака.", en: "1280x720 or larger. Use the best frame from the pack." },
    "Aniq nom yozing": { uz: "Aniq nom yozing", ru: "Напишите точное название", en: "Write a clear name" },
    "\"Pack 1\" emas, \"Cinematic LUT Pack Vol.2\" kabi aniq nom yozing.": { uz: "\"Pack 1\" emas, \"Cinematic LUT Pack Vol.2\" kabi aniq nom yozing.", ru: "Пишите не \"Pack 1\", а понятное название вроде \"Cinematic LUT Pack Vol.2\".", en: "Avoid \"Pack 1\"; use a clear name like \"Cinematic LUT Pack Vol.2\"." },
    "Tavsifni to'ldiring": { uz: "Tavsifni to'ldiring", ru: "Заполните описание", en: "Fill in the description" },
    "Nechta fayl bor, qaysi dasturda ishlaydi, kim uchun mosligini yozing.": { uz: "Nechta fayl bor, qaysi dasturda ishlaydi, kim uchun mosligini yozing.", ru: "Укажите количество файлов, программы и кому это подходит.", en: "Write how many files there are, which apps it supports and who it is for." },
    "Ishlaydigan link": { uz: "Ishlaydigan link", ru: "Рабочая ссылка", en: "Working link" },
    "Download linkni oldin tekshiring. Google Drive linkini \"anyone can view\" qilib oching.": { uz: "Download linkni oldin tekshiring. Google Drive linkini \"anyone can view\" qilib oching.", ru: "Сначала проверьте ссылку. Для Google Drive включите \"anyone can view\".", en: "Check the download link first. Set Google Drive sharing to \"anyone can view\"." },
    "Sabr qiling": { uz: "Sabr qiling", ru: "Подождите", en: "Be patient" },
    "Admin 24 soat ichida tekshiradi. Bir necha marta yuborish shart emas.": { uz: "Admin 24 soat ichida tekshiradi. Bir necha marta yuborish shart emas.", ru: "Админ проверит в течение 24 часов. Не нужно отправлять несколько раз.", en: "Admin reviews within 24 hours. No need to submit multiple times." },
    "Pack": { uz: "Pack", ru: "Пак", en: "Pack" },
    "Status": { uz: "Status", ru: "Статус", en: "Status" },
    "Sana": { uz: "Sana", ru: "Дата", en: "Date" },
    "Amallar": { uz: "Amallar", ru: "Действия", en: "Actions" },
    "Hali pack yuklamagansiz. \"+ Yangi Pack\" tugmasini bosing!": { uz: "Hali pack yuklamagansiz. \"+ Yangi Pack\" tugmasini bosing!", ru: "Вы еще не загрузили пак. Нажмите \"+ Новый пак\"!", en: "You have not uploaded packs yet. Click \"+ New Pack\"!" },
    "Sotib olish": { uz: "Sotib olish", ru: "Купить", en: "Buy" },
    "Bepul ko'rish": { uz: "Bepul ko'rish", ru: "Бесплатный просмотр", en: "Free preview" },
    "Bepul yuklab oling": { uz: "Bepul yuklab oling", ru: "Скачайте бесплатно", en: "Download for free" },
    "Bir martalik to'lov": { uz: "Bir martalik to'lov", ru: "Разовый платеж", en: "One-time payment" },
    "Bir marta sotib ol, umr bo'yi ishla": { uz: "Bir marta sotib ol, umr bo'yi ishla", ru: "Купите один раз, используйте всегда", en: "Buy once, use forever" },
    "Yangilanishlar bepul": { uz: "Yangilanishlar bepul", ru: "Обновления бесплатны", en: "Free updates" },
    "Qo'llab-quvvatlash mavjud": { uz: "Qo'llab-quvvatlash mavjud", ru: "Есть поддержка", en: "Support included" },
    "O'xshash packlar": { uz: "O'xshash packlar", ru: "Похожие паки", en: "Similar packs" },
    "To'lov": { uz: "To'lov", ru: "Оплата", en: "Payment" },
    "Jami:": { uz: "Jami:", ru: "Итого:", en: "Total:" },
    "To'lov usulini tanlang": { uz: "To'lov usulini tanlang", ru: "Выберите способ оплаты", en: "Choose payment method" },
    "Karta egasining ismi": { uz: "Karta egasining ismi", ru: "Имя владельца карты", en: "Cardholder name" },
    "To'lovni amalga oshirish": { uz: "To'lovni amalga oshirish", ru: "Оплатить", en: "Pay now" },
    "Barcha to'lovlar xavfsiz SSL orqali amalga oshiriladi": { uz: "Barcha to'lovlar xavfsiz SSL orqali amalga oshiriladi", ru: "Все платежи защищены SSL", en: "All payments are secured with SSL" },
    "Tayyor! Yuklab oling": { uz: "Tayyor! Yuklab oling", ru: "Готово! Скачайте", en: "Ready! Download" },
    "Pack muvaffaqiyatli ochildi. Quyidagi tugma orqali yuklab oling.": { uz: "Pack muvaffaqiyatli ochildi. Quyidagi tugma orqali yuklab oling.", ru: "Пак успешно открыт. Скачайте через кнопку ниже.", en: "Pack unlocked successfully. Download using the button below." },
    "Orqaga qaytish": { uz: "Orqaga qaytish", ru: "Назад", en: "Go back" },
  };

  function getLang() {
    const stored = localStorage.getItem(LANG_KEY);
    return supportedLangs.includes(stored) ? stored : "uz";
  }

  function getTheme() {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  }

  function normalize(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function lookup(original, lang) {
    const key = normalize(original);
    return dictionary[key]?.[lang] || original;
  }

  function shouldSkip(node) {
    const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!parent) return true;
    return Boolean(parent.closest("script, style, noscript, code, pre, [data-no-translate]"));
  }

  function translateTextNode(node, lang) {
    if (shouldSkip(node)) return;
    const original = textOriginals.get(node) || node.nodeValue;
    if (!normalize(original)) return;
    textOriginals.set(node, original);
    const translated = lookup(original, lang);
    if (node.nodeValue !== translated) node.nodeValue = translated;
  }

  function translateAttributes(root, lang) {
    const elements = root.querySelectorAll?.("[placeholder], [title], [aria-label]") || [];
    elements.forEach((el) => {
      if (el.closest("[data-no-translate]")) return;
      ["placeholder", "title", "aria-label"].forEach((attr) => {
        const value = el.getAttribute(attr);
        if (!value) return;
        const key = `i18nOriginal${attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
        if (!el.dataset[key]) el.dataset[key] = value;
        el.setAttribute(attr, lookup(el.dataset[key], lang));
      });
    });
  }

  function translatePage() {
    const lang = getLang();
    html.lang = lang;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => translateTextNode(node, lang));
    translateAttributes(document, lang);

    if (!document.body.dataset.titleOriginal) document.body.dataset.titleOriginal = document.title;
    document.title = lookup(document.body.dataset.titleOriginal, lang);
  }

  function paintThemeButton(next) {
    document.querySelector("[data-theme-toggle]")?.setAttribute("aria-pressed", String(next === "light"));
    const btn = document.querySelector("[data-theme-toggle]");
    if (btn) {
      btn.innerHTML = `
        <span class="theme-switch-track" aria-hidden="true">
          <span class="theme-switch-sun"></span>
          <span class="theme-switch-moon"></span>
          <span class="theme-switch-thumb"></span>
        </span>
        <span class="theme-switch-text">${next === "light" ? "Dark" : "Light"}</span>
      `;
    }
  }

  function runThemeWipe(next, originEvent) {
    if (!originEvent) {
      html.dataset.theme = next;
      return;
    }

    const x = originEvent.clientX || window.innerWidth - 48;
    const y = originEvent.clientY || 28;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const wipe = document.createElement("span");
    wipe.className = "theme-wipe";
    wipe.style.left = x + "px";
    wipe.style.top = y + "px";
    wipe.style.setProperty("--wipe-size", Math.ceil(radius * 2) + "px");
    wipe.style.background = next === "light" ? "#f6f7fb" : "#0b0c0e";
    document.body.appendChild(wipe);

    requestAnimationFrame(() => {
      wipe.classList.add("theme-wipe-run");
      window.setTimeout(() => {
        html.dataset.theme = next;
      }, 120);
      window.setTimeout(() => wipe.remove(), 620);
    });
  }

  function setTheme(theme, originEvent) {
    const next = theme === "light" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    paintThemeButton(next);
    document.body.classList.remove("theme-text-animate");
    void document.body.offsetWidth;
    document.body.classList.add("theme-text-animate");
    window.setTimeout(() => document.body.classList.remove("theme-text-animate"), 560);

    if (originEvent && document.startViewTransition) {
      document.startViewTransition(() => {
        html.dataset.theme = next;
      });
      return;
    }

    runThemeWipe(next, originEvent);
  }

  function setLang(lang) {
    if (!supportedLangs.includes(lang)) return;
    localStorage.setItem(LANG_KEY, lang);
    const select = document.querySelector("[data-lang-select]");
    if (select) select.value = lang;
    translatePage();
  }

  function addControls() {
    if (document.querySelector(".pref-controls")) return;
    const nav = document.querySelector(".nav-links") || document.querySelector(".nav") || document.querySelector(".sidebar");

    const controls = document.createElement("div");
    controls.className = "pref-controls";
    controls.dataset.noTranslate = "true";
    controls.innerHTML = `
      <select class="pref-select" data-lang-select aria-label="Language">
        <option value="uz">UZ</option>
        <option value="ru">RU</option>
        <option value="en">EN</option>
      </select>
      <button class="pref-toggle" type="button" data-theme-toggle aria-label="Theme"></button>
    `;
    if (nav) {
      if (nav.classList.contains("sidebar")) controls.classList.add("pref-controls-sidebar");
      nav.insertBefore(controls, document.getElementById("navUser") || null);
    } else {
      controls.classList.add("pref-controls-floating");
      document.body.appendChild(controls);
    }

    controls.querySelector("[data-lang-select]").value = getLang();
    controls.querySelector("[data-lang-select]").addEventListener("change", (event) => {
      setLang(event.target.value);
    });
    controls.querySelector("[data-theme-toggle]").addEventListener("click", (event) => {
      setTheme(getTheme() === "light" ? "dark" : "light", event);
    });
    setTheme(getTheme());
  }

  function initMobileNav() {
    const nav = document.querySelector(".nav");
    const links = document.querySelector(".nav-links");
    if (!nav || !links || nav.querySelector(".nav-menu-btn")) return;

    const button = document.createElement("button");
    button.className = "nav-menu-btn";
    button.type = "button";
    button.setAttribute("aria-label", "Menu");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = "<span></span><span></span><span></span>";
    nav.insertBefore(button, links);

    const closeMenu = () => {
      nav.classList.remove("menu-open");
      button.setAttribute("aria-expanded", "false");
    };

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = nav.classList.toggle("menu-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });

    links.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target)) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldTranslate = false;
      for (const mutation of mutations) {
        if ([...mutation.addedNodes].some((node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE)) {
          shouldTranslate = true;
          break;
        }
      }
      if (shouldTranslate) window.requestAnimationFrame(translatePage);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  html.dataset.theme = getTheme();
  window.EditorPackPrefs = { setLang, setTheme, translatePage };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    addControls();
    initMobileNav();
    translatePage();
    startObserver();
  }
})();
