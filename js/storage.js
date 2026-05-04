/* ===========================
   EditorPack — storage.js
   localStorage engine
   =========================== */

const EP = {
  // ===== USERS =====
  getUsers() {
    return JSON.parse(localStorage.getItem("ep_users") || "[]");
  },
  saveUsers(users) {
    localStorage.setItem("ep_users", JSON.stringify(users));
  },
  getUser() {
    return JSON.parse(localStorage.getItem("ep_user") || "null");
  },
  setUser(user) {
    localStorage.setItem("ep_user", JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem("ep_user");
  },

  // ===== PACKS =====
  getPacks() {
    return JSON.parse(localStorage.getItem("ep_packs") || "[]");
  },
  savePacks(packs) {
    localStorage.setItem("ep_packs", JSON.stringify(packs));
  },
  getLivePacks() {
    return this.getPacks().filter((p) => p.status === "live");
  },
  getPackById(id) {
    return this.getPacks().find((p) => p.id == id) || null;
  },
  addPack(pack) {
    const packs = this.getPacks();
    const id = Date.now();
    const newPack = { ...pack, id, created_at: new Date().toISOString() };
    packs.push(newPack);
    this.savePacks(packs);
    return newPack;
  },
  updatePack(id, data) {
    const packs = this.getPacks();
    const idx = packs.findIndex((p) => p.id == id);
    if (idx !== -1) packs[idx] = { ...packs[idx], ...data };
    this.savePacks(packs);
  },
  deletePack(id) {
    this.savePacks(this.getPacks().filter((p) => p.id != id));
  },

  // ===== SEED =====
  seed() {
    if (this.getPacks().length > 0) return;

    const ADMIN_EMAIL = "karimovbdulloh@gmail.com";
    const users = this.getUsers();
    if (!users.find((u) => u.email === ADMIN_EMAIL)) {
      users.push({
        id: 1,
        name: "Admin",
        email: ADMIN_EMAIL,
        password: "admin123",
        role: "admin",
        created_at: new Date().toISOString(),
      });
      this.saveUsers(users);
    }

    const DEFAULT_PACKS = [
      {
        id: 101,
        name: "Smooth Transitions Vol.1",
        desc: "60 ta silliq transition preset. CapCut va Premiere Pro uchun ideal. Har qanday video uslubiga mos keladi — vlog, kino, short-form kontent.",
        price: "Free",
        apps: ["CapCut", "Premiere"],
        badge: "free",
        status: "live",
        img: "https://images.unsplash.com/photo-1536240478700-b869ad10e128?w=800&q=80",
        download_url: "https://example.com",
        uploaded_by: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 102,
        name: "Cinematic LUT Pack",
        desc: "25 ta professional rang gradatsiyasi. Hollywood filmlari uslubida. DaVinci Resolve, Premiere Pro va Final Cut Pro X uchun.",
        price: "$12",
        apps: ["DaVinci", "Premiere", "Final Cut"],
        badge: "hot",
        status: "live",
        img: "https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?w=800&q=80",
        download_url: "https://example.com",
        uploaded_by: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 103,
        name: "Motion Blur FX",
        desc: "20 ta motion blur overlay. Dinamik editlar uchun. After Effects va Premiere Pro bilan to'liq mos keladi.",
        price: "$7",
        apps: ["After Effects", "Premiere"],
        badge: "new",
        status: "live",
        img: "https://images.unsplash.com/photo-1551817958-d9d86fb29431?w=800&q=80",
        download_url: "https://example.com",
        uploaded_by: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 104,
        name: "CapCut Trending Pack",
        desc: "50 ta trending effect va sticker. CapCut short-form kontent uchun. TikTok va Instagram Reels uchun optimallashtirilgan.",
        price: "Free",
        apps: ["CapCut"],
        badge: "hot",
        status: "live",
        img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
        download_url: "https://example.com",
        uploaded_by: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 105,
        name: "Glitch & Distortion FX",
        desc: "35 ta glitch effect va digital distortion. Musbat va salbiy overlay effektlari. After Effects va Premiere Pro uchun.",
        price: "$9",
        apps: ["After Effects", "Premiere"],
        badge: "",
        status: "live",
        img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
        download_url: "https://example.com",
        uploaded_by: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 106,
        name: "Sound FX Starter Kit",
        desc: "100 ta essential sound effect. Har qanday video proyekt uchun. Barcha editing dasturlar bilan mos keladi.",
        price: "Free",
        apps: ["All Apps"],
        badge: "free",
        status: "live",
        img: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80",
        download_url: "https://example.com",
        uploaded_by: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 107,
        name: "Title & Text Animations",
        desc: "40 ta animated title va lower third. After Effects, Premiere Pro va Final Cut Pro X uchun professional animatsiyalar.",
        price: "$15",
        apps: ["After Effects", "Premiere", "Final Cut"],
        badge: "new",
        status: "live",
        img: "https://images.unsplash.com/photo-1626785774625-0b1c2c4eab67?w=800&q=80",
        download_url: "https://example.com",
        uploaded_by: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 108,
        name: "DaVinci Color Toolkit",
        desc: "30 ta node va macro. DaVinci Resolve workflow ni tezlashtirish uchun. Professional colorist lar uchun yaratilgan.",
        price: "$19",
        apps: ["DaVinci"],
        badge: "",
        status: "live",
        img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&q=80",
        download_url: "https://example.com",
        uploaded_by: 1,
        created_at: new Date().toISOString(),
      },
    ];

    this.savePacks(DEFAULT_PACKS);
    console.log("✅ Default packlar yuklandi!");
  },
};

// Ilovani ishga tushirganda seed qilish
EP.seed();
