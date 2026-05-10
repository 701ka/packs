const API = window.API_BASE || "/api";

const videoInput = document.getElementById("videoInput");
const uploadZone = document.getElementById("uploadZone");
const videoWrap = document.getElementById("videoWrap");
const scanVideo = document.getElementById("scanVideo");
const fileMeta = document.getElementById("fileMeta");
const analyzeBtn = document.getElementById("analyzeBtn");
const resetBtn = document.getElementById("resetBtn");
const progressWrap = document.getElementById("progressWrap");
const progressLabel = document.getElementById("progressLabel");
const progressPct = document.getElementById("progressPct");
const progressFill = document.getElementById("progressFill");
const emptyState = document.getElementById("emptyState");
const resultContent = document.getElementById("resultContent");
const scanCanvas = document.getElementById("scanCanvas");
const ctx = scanCanvas.getContext("2d", { willReadFrequently: true });

let selectedFile = null;
let objectUrl = null;
let allPacks = [];

function setProgress(pct, label) {
  const value = Math.max(0, Math.min(100, Math.round(pct)));
  progressWrap.hidden = false;
  progressPct.textContent = value + "%";
  progressFill.style.width = value + "%";
  if (label) progressLabel.textContent = label;
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds || 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatSize(bytes) {
  if (!bytes) return "0 MB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function waitForEvent(target, eventName) {
  return new Promise((resolve, reject) => {
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Video o'qilmadi"));
    };
    const cleanup = () => {
      target.removeEventListener(eventName, onEvent);
      target.removeEventListener("error", onError);
    };
    target.addEventListener(eventName, onEvent, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

function seekVideo(video, time) {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = Math.min(Math.max(time, 0), Math.max(video.duration - 0.05, 0));
  });
}

function analyzeFrameData(data, width, height) {
  let brightness = 0;
  let edgeEnergy = 0;
  const gray = new Uint8Array(width * height);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const value = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = value;
    brightness += value;
  }

  for (let y = 1; y < height; y += 2) {
    for (let x = 1; x < width; x += 2) {
      const i = y * width + x;
      edgeEnergy += Math.abs(gray[i] - gray[i - 1]) + Math.abs(gray[i] - gray[i - width]);
    }
  }

  return {
    brightness: brightness / gray.length,
    sharpness: edgeEnergy / ((width / 2) * (height / 2)),
    gray,
  };
}

function frameDiff(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let diff = 0;
  const step = 4;
  for (let i = 0; i < a.length; i += step) diff += Math.abs(a[i] - b[i]);
  return diff / (a.length / step);
}

async function sampleVideoFrames(video) {
  const duration = Math.min(video.duration || 0, 45);
  const sampleCount = Math.max(8, Math.min(36, Math.round(duration * 1.4)));
  const width = 160;
  const height = Math.max(90, Math.round((video.videoHeight / video.videoWidth) * width) || 90);
  const frames = [];
  scanCanvas.width = width;
  scanCanvas.height = height;

  let prevGray = null;
  for (let i = 0; i < sampleCount; i++) {
    const time = duration <= 0 ? 0 : (duration * i) / Math.max(sampleCount - 1, 1);
    await seekVideo(video, time);
    ctx.drawImage(video, 0, 0, width, height);
    const image = ctx.getImageData(0, 0, width, height);
    const stats = analyzeFrameData(image.data, width, height);
    frames.push({
      time,
      brightness: stats.brightness,
      sharpness: stats.sharpness,
      diff: frameDiff(prevGray, stats.gray),
    });
    prevGray = stats.gray;
    setProgress(15 + (i / sampleCount) * 55, "Kadrlar tekshirilmoqda...");
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return frames;
}

async function analyzeAudio(file) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return { peaks: [], energy: 0 };

  try {
    const buffer = await file.arrayBuffer();
    const audioCtx = new AudioCtx();
    const decoded = await audioCtx.decodeAudioData(buffer.slice(0));
    await audioCtx.close();
    const channel = decoded.getChannelData(0);
    const sampleRate = decoded.sampleRate;
    const windowSize = Math.max(1024, Math.floor(sampleRate * 0.18));
    const windows = [];

    for (let i = 0; i < channel.length; i += windowSize) {
      let sum = 0;
      for (let j = i; j < Math.min(i + windowSize, channel.length); j++) {
        sum += channel[j] * channel[j];
      }
      windows.push({
        time: i / sampleRate,
        rms: Math.sqrt(sum / windowSize),
      });
    }

    const avg = windows.reduce((sum, w) => sum + w.rms, 0) / Math.max(windows.length, 1);
    const peaks = windows
      .filter((w, index) => index > 0 && w.rms > avg * 2.2 && w.rms > windows[index - 1].rms * 1.35)
      .slice(0, 8);

    return { peaks, energy: avg };
  } catch {
    return { peaks: [], energy: 0 };
  }
}

function classifyVideo(frames, audio) {
  const avgDiff = frames.reduce((sum, f) => sum + f.diff, 0) / Math.max(frames.length, 1);
  const avgBrightness = frames.reduce((sum, f) => sum + f.brightness, 0) / Math.max(frames.length, 1);
  const avgSharpness = frames.reduce((sum, f) => sum + f.sharpness, 0) / Math.max(frames.length, 1);
  const events = [];
  const effects = new Set();

  frames.forEach((frame, index) => {
    const prev = frames[index - 1];
    if (!prev) return;

    const brightnessJump = frame.brightness - prev.brightness;
    const sharpnessDrop = prev.sharpness - frame.sharpness;

    if (frame.diff > avgDiff * 2.4 && frame.diff > 18) {
      effects.add("Hard cut / fast transition");
      events.push({
        time: frame.time,
        label: "Tez kadr almashish",
        note: "Scene cut yoki quick transition ishlatilgan bo'lishi mumkin.",
      });
    }

    if (brightnessJump > 34 || frame.brightness > avgBrightness * 1.45) {
      effects.add("Flash transition");
      events.push({
        time: frame.time,
        label: "Flash / light burst",
        note: "Yorug'lik keskin oshgan, flash transition ehtimoli bor.",
      });
    }

    if (frame.diff > avgDiff * 1.7 && sharpnessDrop > avgSharpness * 0.18) {
      effects.add("Motion blur");
      effects.add("Whip pan");
      events.push({
        time: frame.time,
        label: "Motion blur / whip pan",
        note: "Kadrlar orasida tez harakat va yumshash sezildi.",
      });
    }

    if (Math.abs(brightnessJump) > 20 && frame.diff > avgDiff * 1.25) {
      effects.add("Speed ramp");
    }
  });

  audio.peaks.forEach((peak) => {
    effects.add("Beat hit / impact SFX");
    events.push({
      time: peak.time,
      label: "Audio hit",
      note: "Bu joyda hit, bass drop yoki whoosh SFX bo'lishi mumkin.",
    });
  });

  if (avgSharpness < 14) effects.add("Soft blur / glow look");
  if (avgBrightness < 82) effects.add("Dark cinematic grade");
  if (avgBrightness > 155) effects.add("Bright clean grade");
  if (audio.peaks.length >= 3) effects.add("Beat-synced edit");
  if (events.length === 0) effects.add("Simple clean edit");

  const intensity = Math.min(100, Math.round(avgDiff * 2 + audio.peaks.length * 8));
  const label = intensity >= 70 ? "High" : intensity >= 38 ? "Medium" : "Low";

  return {
    effects: [...effects],
    events: events.sort((a, b) => a.time - b.time).slice(0, 12),
    intensity,
    label,
  };
}

function scorePack(pack, effects) {
  const text = `${pack.name || ""} ${pack.desc || ""} ${(pack.apps || []).join(" ")} ${pack.badge || ""}`.toLowerCase();
  const rules = [
    ["transition", ["transition", "whip", "cut", "slide"]],
    ["motion", ["motion", "blur", "shake", "whip"]],
    ["lut", ["lut", "grade", "cinematic", "color"]],
    ["capcut", ["capcut", "tiktok", "reels"]],
    ["sfx", ["sfx", "whoosh", "hit", "audio", "beat"]],
    ["flash", ["flash", "light", "glow"]],
  ];

  return effects.reduce((score, effect) => {
    const lower = effect.toLowerCase();
    const matched = rules.some(([packKey, effectKeys]) => {
      return text.includes(packKey) && effectKeys.some((key) => lower.includes(key));
    });
    return score + (matched ? 3 : 0) + (text.includes(lower.split(" ")[0]) ? 1 : 0);
  }, 0);
}

async function loadPacks() {
  try {
    const res = await fetch(`${API}/packs`);
    if (!res.ok) throw new Error("Packlar yuklanmadi");
    allPacks = await res.json();
  } catch {
    allPacks = [];
  }
}

function renderResults(result) {
  document.getElementById("scoreRing").textContent = result.intensity;
  document.getElementById("intensityLabel").textContent = result.label;
  document.getElementById("effectChips").innerHTML = result.effects
    .map((effect) => `<span class="effect-chip">${effect}</span>`)
    .join("");

  document.getElementById("timelineList").innerHTML = result.events.length
    ? result.events
        .map(
          (event) => `
            <div class="timeline-item">
              <div class="timeline-time">${formatTime(event.time)}</div>
              <div class="timeline-label">${event.label}</div>
              <div class="timeline-note">${event.note}</div>
            </div>
          `,
        )
        .join("")
    : `<div class="timeline-item">
        <div class="timeline-label">Aniq transition topilmadi</div>
        <div class="timeline-note">Video silliq yoki kam effektli bo'lishi mumkin.</div>
      </div>`;

  const recommended = allPacks
    .map((pack) => ({ pack, score: scorePack(pack, result.effects) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  document.getElementById("recommendList").innerHTML = recommended.length
    ? recommended
        .map(
          ({ pack, score }) => `
            <a class="recommend-item" href="/pages/detail.html?id=${pack.id}">
              <div class="recommend-name">${pack.name}</div>
              <div class="recommend-meta">${score > 0 ? "Effektlarga mos keladi" : "Katalogdagi tavsiya"} - ${pack.price || "Free"}</div>
            </a>
          `,
        )
        .join("")
    : `<div class="recommend-item">
        <div class="recommend-name">Hozircha pack topilmadi</div>
        <div class="recommend-meta">Katalogga transition, motion blur yoki SFX pack qo'shsangiz tavsiya chiqadi.</div>
      </div>`;

  emptyState.hidden = true;
  resultContent.hidden = false;
}

function resetScanner() {
  selectedFile = null;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  videoInput.value = "";
  scanVideo.removeAttribute("src");
  scanVideo.load();
  uploadZone.hidden = false;
  videoWrap.hidden = true;
  analyzeBtn.disabled = true;
  resetBtn.disabled = true;
  progressWrap.hidden = true;
  emptyState.hidden = false;
  resultContent.hidden = true;
}

async function handleFile(file) {
  if (!file || !file.type.startsWith("video/")) {
    showToast("Video fayl tanlang", "warning");
    return;
  }

  selectedFile = file;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  scanVideo.src = objectUrl;
  uploadZone.hidden = true;
  videoWrap.hidden = false;
  analyzeBtn.disabled = true;
  resetBtn.disabled = false;
  fileMeta.textContent = `${file.name} - ${formatSize(file.size)}`;

  try {
    await waitForEvent(scanVideo, "loadedmetadata");
    fileMeta.textContent = `${file.name} - ${formatSize(file.size)} - ${formatTime(scanVideo.duration)}`;
    analyzeBtn.disabled = false;
  } catch {
    showToast("Video o'qilmadi", "error");
  }
}

async function runAnalysis() {
  if (!selectedFile) return;
  analyzeBtn.disabled = true;
  setProgress(5, "Video tayyorlanmoqda...");

  try {
    const audioPromise = analyzeAudio(selectedFile);
    const frames = await sampleVideoFrames(scanVideo);
    setProgress(76, "Audio tekshirilmoqda...");
    const audio = await audioPromise;
    setProgress(90, "Natija yig'ilmoqda...");
    const result = classifyVideo(frames, audio);
    renderResults(result);
    setProgress(100, "Tayyor");
    showToast("Scanner tahlilni tugatdi", "success");
  } catch (err) {
    showToast("Tahlilda xatolik: " + err.message, "error");
  } finally {
    analyzeBtn.disabled = false;
  }
}

videoInput.addEventListener("change", () => handleFile(videoInput.files[0]));
analyzeBtn.addEventListener("click", runAnalysis);
resetBtn.addEventListener("click", resetScanner);

uploadZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadZone.classList.add("drag-over");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("drag-over");
});

uploadZone.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadZone.classList.remove("drag-over");
  handleFile(event.dataTransfer.files[0]);
});

loadPacks();
renderNavUser();
