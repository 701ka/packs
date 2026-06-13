/* ===========================
   EditorPack — ai.js
   Claude AI integration
   =========================== */

async function generateDescription(packName, apps, price, badge) {
  const btn = document.getElementById("aiGenBtn");
  const descEl = document.getElementById("packDesc");

  if (!packName.trim()) {
    showToast("Avval pack nomini kiriting!", "warning");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="ai-spinner"></span> Yaratilmoqda...`;

  try {
    const prompt = `Siz video editing resurslar marketplace uchun pack tavsifi yozuvchisiz.

Pack ma'lumotlari:
- Nomi: ${packName}
- Dasturlar: ${apps.length ? apps.join(", ") : "Umumiy"}
- Narxi: ${price || "Free"}
- Badge: ${badge || "yo'q"}

Quyidagi talablar asosida o'zbek tilida 2-3 jumlali qisqa va jozibador tavsif yozing:
1. Pack nima ekanligini aniq ayting
2. Nechta element borligini taxminan ayting (agar ma'lum bo'lsa)
3. Qaysi dasturlar uchun ekanini ayting
4. Kimga mos ekanini ayting
5. Faqat tavsif matni, boshqa hech narsa yo'q`;

    const response = await fetch(`${window.API_BASE || "/api"}/ai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + (localStorage.getItem("token") || ""),
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "API xatolik");
    const text = data.text || "";

    if (text) {
      descEl.value = text.trim();
      updatePreview();
      showToast("✨ AI tavsif yaratdi!", "success");
    } else {
      throw new Error("Bo'sh javob");
    }
  } catch (e) {
    showToast("AI xatolik. Qayta urining!", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `✨ AI bilan yozish`;
  }
}
