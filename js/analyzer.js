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
let scanHistory = [];

function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}

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

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("uz-UZ", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
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
  let contrastSum = 0;
  let edgeEnergy = 0;
  let saturation = 0;
  let warmth = 0;
  let centerBrightness = 0;
  let edgeBrightness = 0;
  let centerCount = 0;
  let edgeCount = 0;
  let darkPixels = 0;
  let brightPixels = 0;
  let topBottomDark = 0;
  let topBottomCount = 0;
  const lumaHist = new Array(16).fill(0);
  const gray = new Uint8Array(width * height);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const value = 0.299 * r + 0.587 * g + 0.114 * b;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const x = p % width;
    const y = Math.floor(p / width);
    const inCenter = x > width * 0.3 && x < width * 0.7 && y > height * 0.3 && y < height * 0.7;
    const inLetterboxArea = y < height * 0.12 || y > height * 0.88;

    gray[p] = value;
    brightness += value;
    saturation += max === 0 ? 0 : (max - min) / max;
    warmth += (r - b) / 255;
    lumaHist[Math.min(15, Math.floor(value / 16))]++;
    if (value < 38) darkPixels++;
    if (value > 218) brightPixels++;
    if (inLetterboxArea) {
      topBottomCount++;
      if (value < 42) topBottomDark++;
    }

    if (inCenter) {
      centerBrightness += value;
      centerCount++;
    } else {
      edgeBrightness += value;
      edgeCount++;
    }
  }

  const avgBrightness = brightness / gray.length;

  for (let i = 0; i < gray.length; i++) {
    contrastSum += Math.abs(gray[i] - avgBrightness);
  }

  for (let y = 1; y < height; y += 2) {
    for (let x = 1; x < width; x += 2) {
      const i = y * width + x;
      edgeEnergy += Math.abs(gray[i] - gray[i - 1]) + Math.abs(gray[i] - gray[i - width]);
    }
  }

  return {
    brightness: avgBrightness,
    contrast: contrastSum / gray.length,
    saturation: saturation / gray.length,
    warmth: warmth / gray.length,
    centerBias: centerBrightness / Math.max(centerCount, 1) - edgeBrightness / Math.max(edgeCount, 1),
    darkRatio: darkPixels / gray.length,
    brightRatio: brightPixels / gray.length,
    letterboxRatio: topBottomDark / Math.max(topBottomCount, 1),
    lumaHist: lumaHist.map((count) => count / gray.length),
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

function histogramDiff(a, b) {
  if (!a || !b) return 0;
  let diff = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    diff += Math.abs(a[i] - b[i]);
  }
  return diff;
}

function estimateMotion(prev, current, width, height) {
  if (!prev || !current) return { dx: 0, dy: 0, score: 0, residual: 0 };

  const maxShift = 5;
  const step = 5;
  let best = { dx: 0, dy: 0, error: Infinity };
  let zeroError = 0;

  for (let dy = -maxShift; dy <= maxShift; dy++) {
    for (let dx = -maxShift; dx <= maxShift; dx++) {
      let error = 0;
      let count = 0;

      for (let y = maxShift; y < height - maxShift; y += step) {
        for (let x = maxShift; x < width - maxShift; x += step) {
          const a = y * width + x;
          const b = (y + dy) * width + x + dx;
          error += Math.abs(prev[a] - current[b]);
          count++;
        }
      }

      const avgError = error / Math.max(count, 1);
      if (dx === 0 && dy === 0) zeroError = avgError;
      if (avgError < best.error) best = { dx, dy, error: avgError };
    }
  }

  const distance = Math.hypot(best.dx, best.dy);
  const improvement = Math.max(0, zeroError - best.error);

  return {
    dx: best.dx,
    dy: best.dy,
    score: distance * 7 + improvement * 0.35,
    residual: best.error,
  };
}

function estimateRegionDiff(prev, current, width, height) {
  if (!prev || !current) return { center: 0, edge: 0 };
  let center = 0;
  let centerCount = 0;
  let edge = 0;
  let edgeCount = 0;
  const step = 4;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = y * width + x;
      const value = Math.abs(prev[i] - current[i]);
      const inCenter = x > width * 0.28 && x < width * 0.72 && y > height * 0.28 && y < height * 0.72;
      if (inCenter) {
        center += value;
        centerCount++;
      } else {
        edge += value;
        edgeCount++;
      }
    }
  }

  return {
    center: center / Math.max(centerCount, 1),
    edge: edge / Math.max(edgeCount, 1),
  };
}

async function sampleVideoFrames(video) {
  const duration = Math.min(video.duration || 0, 45);
  const sampleCount = Math.max(12, Math.min(72, Math.round(duration * 2.3)));
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
    const motion = estimateMotion(prevGray, stats.gray, width, height);
    const regionDiff = estimateRegionDiff(prevGray, stats.gray, width, height);
    frames.push({
      time,
      brightness: stats.brightness,
      contrast: stats.contrast,
      saturation: stats.saturation,
      warmth: stats.warmth,
      centerBias: stats.centerBias,
      darkRatio: stats.darkRatio,
      brightRatio: stats.brightRatio,
      letterboxRatio: stats.letterboxRatio,
      hist: stats.lumaHist,
      histDiff: histogramDiff(frames.at(-1)?.hist, stats.lumaHist),
      sharpness: stats.sharpness,
      diff: frameDiff(prevGray, stats.gray),
      motion,
      regionDiff,
    });
    prevGray = stats.gray;
    setProgress(15 + (i / sampleCount) * 55, "Kadrlar tekshirilmoqda...");
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return frames;
}

async function analyzeAudio(file) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return { peaks: [], rises: [], drops: [], silence: [], energy: 0 };

  try {
    const buffer = await file.arrayBuffer();
    const audioCtx = new AudioCtx();
    let decoded;
    try {
      decoded = await audioCtx.decodeAudioData(buffer.slice(0));
    } finally {
      audioCtx.close().catch(() => {});
    }
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
    const sorted = [...windows].sort((a, b) => a.rms - b.rms);
    const loud = sorted[Math.floor(sorted.length * 0.88)]?.rms || avg;
    const peaks = windows
      .filter((w, index) => index > 0 && w.rms > Math.max(avg * 1.8, loud * 0.9) && w.rms > windows[index - 1].rms * 1.25)
      .map((w) => ({ ...w, confidence: Math.min(96, Math.round((w.rms / Math.max(avg, 0.001)) * 24)) }))
      .slice(0, 10);

    const rises = [];
    const drops = [];
    const silence = [];
    for (let i = 3; i < windows.length; i++) {
      const a = windows[i - 3].rms;
      const b = windows[i - 2].rms;
      const c = windows[i - 1].rms;
      const d = windows[i].rms;
      if (a < b && b < c && c < d && d > avg * 1.45) {
        rises.push({
          time: windows[i - 3].time,
          confidence: Math.min(92, Math.round((d / Math.max(avg, 0.001)) * 20)),
        });
      }

      if (a > avg * 1.25 && b > avg * 1.05 && c < avg * 0.7 && d < avg * 0.55) {
        drops.push({
          time: windows[i - 1].time,
          confidence: Math.min(92, Math.round((a / Math.max(d, 0.001)) * 14)),
        });
      }
    }

    windows.forEach((w) => {
      if (w.rms < avg * 0.22 && avg > 0.002) {
        silence.push({
          time: w.time,
          confidence: Math.min(88, Math.round((1 - w.rms / Math.max(avg, 0.001)) * 90)),
        });
      }
    });

    return {
      peaks,
      rises: rises.slice(0, 6),
      drops: drops.slice(0, 6),
      silence: silence.slice(0, 8),
      energy: avg,
    };
  } catch {
    return { peaks: [], rises: [], drops: [], silence: [], energy: 0 };
  }
}

function countAlternations(values) {
  let changes = 0;
  let lastSign = 0;
  for (let i = 1; i < values.length; i++) {
    const sign = Math.sign(values[i] - values[i - 1]);
    if (sign && lastSign && sign !== lastSign) changes++;
    if (sign) lastSign = sign;
  }
  return changes;
}

function percentile(values, p) {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length) return 0;
  const index = Math.min(clean.length - 1, Math.max(0, Math.floor((clean.length - 1) * p)));
  return clean[index];
}

function detectSceneChanges(frames) {
  if (frames.length < 3) return [];

  const diffs = frames.slice(1).map((frame) => frame.diff);
  const histDiffs = frames.slice(1).map((frame) => frame.histDiff);
  const diffP85 = percentile(diffs, 0.85);
  const diffP95 = percentile(diffs, 0.95);
  const histP85 = percentile(histDiffs, 0.85);
  const avgDiff = diffs.reduce((sum, value) => sum + value, 0) / Math.max(diffs.length, 1);
  const avgHist = histDiffs.reduce((sum, value) => sum + value, 0) / Math.max(histDiffs.length, 1);
  const sceneChanges = [];

  for (let i = 1; i < frames.length; i++) {
    const frame = frames[i];
    const prev = frames[i - 1];
    const next = frames[i + 1];
    const brightnessJump = Math.abs(frame.brightness - prev.brightness);
    const isFlashFrame = frame.brightRatio > 0.46 || frame.darkRatio > 0.64;
    const reboundsNext =
      next &&
      Math.abs(next.brightness - prev.brightness) < Math.max(20, brightnessJump * 0.42) &&
      next.histDiff > Math.max(0.2, avgHist * 1.2);
    const isLikelyOneFrameFlash = isFlashFrame && reboundsNext;
    const strongDiff = frame.diff > Math.max(24, avgDiff * 2.1, diffP85 * 1.25);
    const strongHist = frame.histDiff > Math.max(0.34, avgHist * 1.9, histP85 * 1.15);
    const veryStrongDiff = frame.diff > Math.max(38, diffP95 * 0.92);
    const isFadeStep = brightnessJump > 18 && frame.histDiff < Math.max(0.52, avgHist * 1.35);
    const enoughGap = !sceneChanges.length || frame.time - sceneChanges[sceneChanges.length - 1].time > 0.7;

    if (!enoughGap || isLikelyOneFrameFlash || isFadeStep) continue;

    if ((strongDiff && strongHist) || (veryStrongDiff && frame.histDiff > 0.28)) {
      sceneChanges.push({
        time: frame.time,
        confidence: Math.min(96, Math.round(58 + frame.diff * 0.45 + frame.histDiff * 26)),
      });
    }
  }

  return sceneChanges;
}

function detectSequences(frames, addEffect, addEvent) {
  for (let i = 2; i < frames.length; i++) {
    const a = frames[i - 2];
    const b = frames[i - 1];
    const c = frames[i];
    const down = a.brightness > b.brightness + 18 && b.brightness > c.brightness + 14;
    const up = a.brightness + 18 < b.brightness && b.brightness + 14 < c.brightness;
    const smooth = a.histDiff < 0.55 && b.histDiff < 0.55 && c.diff < 34;

    if (down && smooth && c.brightness < 82) {
      const confidence = 62 + Math.min(28, (a.brightness - c.brightness) * 0.45);
      addEffect("Fade to black", confidence, "Brightness ketma-ket pasaygan va scene keskin almashmagan.");
      addEvent(c.time, "Fade to black", "Video asta qorayib borgan.", confidence);
    }

    if (up && smooth && c.brightness > 145) {
      const confidence = 60 + Math.min(28, (c.brightness - a.brightness) * 0.42);
      addEffect("Fade in / fade to white", confidence, "Brightness ketma-ket ko'tarilgan.");
      addEvent(c.time, "Fade in / fade to white", "Video asta yorishib borgan.", confidence);
    }
  }

  const alternations = countAlternations(frames.map((f) => f.brightness));
  const brightJumps = frames.filter((f, i) => i > 0 && Math.abs(f.brightness - frames[i - 1].brightness) > 34).length;
  if (alternations >= 5 && brightJumps >= 4) {
    addEffect("Strobe / flicker effect", 66 + Math.min(24, brightJumps * 4), "Brightness tez-tez yuqori-past almashgan.");
  }
}

function classifyVideo(frames, audio) {
  const avgDiff = frames.reduce((sum, f) => sum + f.diff, 0) / Math.max(frames.length, 1);
  const avgBrightness = frames.reduce((sum, f) => sum + f.brightness, 0) / Math.max(frames.length, 1);
  const avgSharpness = frames.reduce((sum, f) => sum + f.sharpness, 0) / Math.max(frames.length, 1);
  const avgContrast = frames.reduce((sum, f) => sum + f.contrast, 0) / Math.max(frames.length, 1);
  const avgSaturation = frames.reduce((sum, f) => sum + f.saturation, 0) / Math.max(frames.length, 1);
  const avgWarmth = frames.reduce((sum, f) => sum + f.warmth, 0) / Math.max(frames.length, 1);
  const avgMotion = frames.reduce((sum, f) => sum + f.motion.score, 0) / Math.max(frames.length, 1);
  const avgHistDiff = frames.reduce((sum, f) => sum + f.histDiff, 0) / Math.max(frames.length, 1);
  const letterboxFrames = frames.filter((f) => f.letterboxRatio > 0.82).length;
  const sceneChanges = detectSceneChanges(frames);
  const events = [];
  const effects = new Map();

  const addEffect = (name, confidence, reason) => {
    const safeConfidence = Math.max(35, Math.min(98, Math.round(confidence)));
    const existing = effects.get(name);
    if (!existing || safeConfidence > existing.confidence) {
      effects.set(name, { name, confidence: safeConfidence, reason });
    }
  };

  const addEvent = (time, label, note, confidence) => {
    const duplicate = events.some((event) => Math.abs(event.time - time) < 0.22 && event.label === label);
    if (!duplicate) events.push({ time, label, note, confidence: Math.round(confidence) });
  };

  frames.forEach((frame, index) => {
    const prev = frames[index - 1];
    if (!prev) return;

    const brightnessJump = frame.brightness - prev.brightness;
    const sharpnessDrop = prev.sharpness - frame.sharpness;
    const saturationJump = Math.abs(frame.saturation - prev.saturation);
    const contrastJump = Math.abs(frame.contrast - prev.contrast);
    const motionScore = frame.motion.score;
    const edgeCenterGap = frame.regionDiff.edge - frame.regionDiff.center;
    const direction = Math.abs(frame.motion.dx) > Math.abs(frame.motion.dy)
      ? frame.motion.dx > 0 ? "right" : "left"
      : frame.motion.dy > 0 ? "down" : "up";

    if ((frame.diff > avgDiff * 2.15 && frame.diff > 16) || (frame.histDiff > avgHistDiff * 2.25 && frame.histDiff > 0.42)) {
      const confidence = 58 + (frame.diff / Math.max(avgDiff, 1)) * 10 + frame.histDiff * 18;
      addEffect("Hard cut / fast transition", confidence, "Kadrlar orasidagi farq keskin oshgan.");
      addEvent(
        frame.time,
        "Tez kadr almashish",
        "Scene cut yoki quick transition ishlatilgan bo'lishi mumkin.",
        confidence,
      );
    }

    if (brightnessJump > 28 || frame.brightness > avgBrightness * 1.35) {
      const confidence = 62 + Math.max(brightnessJump, 0) * 0.8;
      addEffect("Flash transition", confidence, "Yorug'lik birdan ko'tarilgan.");
      addEvent(
        frame.time,
        "Flash / light burst",
        "Yorug'lik keskin oshgan, flash transition ehtimoli bor.",
        confidence,
      );
    }

    if (frame.darkRatio > 0.62 && prev.darkRatio < 0.38 && frame.diff > avgDiff * 1.15) {
      const confidence = 60 + frame.darkRatio * 34;
      addEffect("Black flash / dip to black", confidence, "Bir frame juda qorong'i bo'lib qolgan.");
      addEvent(frame.time, "Black flash", "Dip-to-black transition ehtimoli bor.", confidence);
    }

    if (frame.brightRatio > 0.48 && prev.brightRatio < 0.24 && frame.diff > avgDiff * 1.1) {
      const confidence = 58 + frame.brightRatio * 38;
      addEffect("White flash", confidence, "Frame ichida oq/yorqin piksel ulushi keskin ko'paygan.");
      addEvent(frame.time, "White flash", "White flash transition ehtimoli bor.", confidence);
    }

    if (frame.diff > avgDiff * 1.45 && sharpnessDrop > avgSharpness * 0.12) {
      const confidence = 56 + sharpnessDrop * 2.1 + frame.diff * 0.35;
      addEffect("Motion blur", confidence, "Tez harakat paytida sharpness pasaygan.");
      addEvent(
        frame.time,
        "Motion blur",
        "Kadrlar orasida tez harakat va yumshash sezildi.",
        confidence,
      );
    }

    if (motionScore > Math.max(28, avgMotion * 1.55) && frame.diff > avgDiff * 1.2) {
      const confidence = 52 + motionScore * 0.9;
      addEffect("Whip pan / camera swipe", confidence, `Kamera ${direction} tomonga tez siljigandek ko'rindi.`);
      addEvent(
        frame.time,
        "Whip pan / swipe",
        `Motion vector ${direction} tomonga kuchli siljigan.`,
        confidence,
      );
    }

    if (Math.abs(brightnessJump) > 16 && frame.diff > avgDiff * 1.18 && motionScore > avgMotion * 1.1) {
      addEffect("Speed ramp", 55 + frame.diff * 0.45, "Brightness, motion va frame diff birga o'zgargan.");
    }

    if (edgeCenterGap > 8 && motionScore > avgMotion * 1.05 && frame.diff > avgDiff * 1.05) {
      const confidence = 54 + edgeCenterGap * 1.9 + motionScore * 0.25;
      addEffect("Zoom / punch-in transition", confidence, "Chetlarda o'zgarish markazdan kuchliroq, zoom/punch-in ehtimoli bor.");
      addEvent(frame.time, "Zoom / punch-in", "Kadr zoom yoki punch-in transitionga o'xshaydi.", confidence);
    }

    if (frame.diff > avgDiff * 1.35 && saturationJump > 0.12 && contrastJump > 6) {
      const confidence = 56 + saturationJump * 120 + contrastJump;
      addEffect("Glitch / RGB-style transition", confidence, "Rang va contrast birdan sakragan.");
      addEvent(
        frame.time,
        "Glitch-like change",
        "Rang/contrast sakrashi glitch yoki RGB transitionga o'xshaydi.",
        confidence,
      );
    }
  });

  detectSequences(frames, addEffect, addEvent);

  const motionDirections = frames
    .filter((f) => f.motion.score > Math.max(24, avgMotion * 1.35))
    .map((f) => Math.sign(f.motion.dx) + "," + Math.sign(f.motion.dy));
  const directionChanges = motionDirections.filter((dir, index) => index > 0 && dir !== motionDirections[index - 1]).length;
  if (directionChanges >= 3) {
    addEffect("Camera shake", 68 + directionChanges * 6, "Motion direction bir necha marta almashgan.");
  }

  audio.peaks.forEach((peak) => {
    addEffect("Beat hit / impact SFX", peak.confidence || 68, "Audio energiya keskin ko'tarilgan.");
    addEvent(
      peak.time,
      "Audio hit",
      "Bu joyda hit, bass drop yoki impact SFX bo'lishi mumkin.",
      peak.confidence || 68,
    );
  });

  audio.rises.forEach((rise) => {
    addEffect("Riser / whoosh SFX", rise.confidence || 64, "Audio energiya ketma-ket ko'tarilgan.");
    addEvent(
      rise.time,
      "Riser / whoosh",
      "Audio energiya asta-sekin ko'tarilgan, riser yoki whoosh ehtimoli bor.",
      rise.confidence || 64,
    );
  });

  audio.drops.forEach((drop) => {
    addEffect("Audio drop / bass stop", drop.confidence || 62, "Audio energiya keskin pasaygan.");
    addEvent(
      drop.time,
      "Audio drop",
      "Bass stop, silence cut yoki dramatic pause ishlatilgan bo'lishi mumkin.",
      drop.confidence || 62,
    );
  });

  audio.silence.forEach((silent) => {
    const nearbyCut = events.some((event) => Math.abs(event.time - silent.time) < 0.28 && /cut|flash|zoom|glitch|Tez/.test(event.label));
    if (nearbyCut) {
      addEffect("Silence cut", silent.confidence || 60, "Visual cut atrofida audio deyarli jim bo'lgan.");
    }
  });

  const beatMatchedCuts = events.filter((event) =>
    audio.peaks.some((peak) => Math.abs(peak.time - event.time) < 0.24),
  );
  if (beatMatchedCuts.length >= 2) {
    addEffect("Beat-matched cuts", 66 + beatMatchedCuts.length * 6, "Visual transitionlar audio hitlar bilan mos tushgan.");
  }

  if (avgSharpness < 14) addEffect("Soft blur / glow look", 58 + (14 - avgSharpness) * 3, "Umumiy sharpness past.");
  if (avgBrightness < 82 && avgContrast > 24) addEffect("Dark cinematic grade", 67, "Past brightness va kuchli contrast.");
  if (avgBrightness > 155) addEffect("Bright clean grade", 62, "Video umumiy yorqin.");
  if (avgSaturation > 0.42) addEffect("High saturation color grade", 60 + avgSaturation * 40, "Ranglar kuchli to'yingan.");
  if (avgWarmth > 0.08) addEffect("Warm color grade", 58 + avgWarmth * 160, "Qizil/issiq ranglar ustun.");
  if (avgWarmth < -0.08) addEffect("Cool blue grade", 58 + Math.abs(avgWarmth) * 160, "Ko'k/sovuq ranglar ustun.");
  if (avgContrast > 36 && avgSaturation < 0.24) addEffect("Moody desaturated grade", 64, "Contrast yuqori, saturation past.");
  if (letterboxFrames >= frames.length * 0.55) addEffect("Cinematic letterbox", 72, "Yuqori/pastki qoraliklar letterboxga o'xshaydi.");
  if (audio.peaks.length >= 3) addEffect("Beat-synced edit", 65 + audio.peaks.length * 4, "Bir nechta audio hit topildi.");
  if (effects.size === 0) addEffect("Simple clean edit", 55, "Kuchli transition signallari topilmadi.");

  const topEffects = [...effects.values()].sort((a, b) => b.confidence - a.confidence);
  const intensity = Math.min(100, Math.round(avgDiff * 1.6 + avgMotion * 0.8 + audio.peaks.length * 7));
  const label = intensity >= 70 ? "High" : intensity >= 38 ? "Medium" : "Low";

  return {
    effects: topEffects,
    events: events.sort((a, b) => b.confidence - a.confidence).slice(0, 12).sort((a, b) => a.time - b.time),
    intensity,
    label,
    metrics: {
      avgDiff: Math.round(avgDiff),
      avgMotion: Math.round(avgMotion),
      avgContrast: Math.round(avgContrast),
      avgSaturation: Math.round(avgSaturation * 100),
      audioHits: audio.peaks.length,
      sceneChanges: sceneChanges.length,
      audioDrops: audio.drops.length,
    },
  };
}

function scorePack(pack, effects) {
  const apps = parseList(pack.apps);
  const tags = parseList(pack.tags).map((tag) => tag.toLowerCase());
  const text = `${pack.name || ""} ${pack.desc || ""} ${apps.join(" ")} ${tags.join(" ")} ${pack.badge || ""}`.toLowerCase();
  const rules = [
    { packKeys: ["transition", "transitions", "preset"], effectKeys: ["transition", "whip", "cut", "slide", "swipe", "fade"] },
    { packKeys: ["motion", "blur", "shake"], effectKeys: ["motion", "blur", "shake", "whip", "speed"] },
    { packKeys: ["lut", "grade", "cinematic", "color"], effectKeys: ["lut", "grade", "cinematic", "color", "warm", "cool", "desaturated"] },
    { packKeys: ["capcut", "tiktok", "reels", "trending"], effectKeys: ["capcut", "tiktok", "reels", "beat", "flash", "glitch"] },
    { packKeys: ["sfx", "whoosh", "hit", "audio", "beat", "riser"], effectKeys: ["sfx", "whoosh", "hit", "audio", "beat", "riser", "drop"] },
    { packKeys: ["flash", "light", "glow"], effectKeys: ["flash", "light", "glow", "white", "black"] },
    { packKeys: ["zoom", "punch"], effectKeys: ["zoom", "punch"] },
    { packKeys: ["glitch", "rgb", "flicker", "strobe"], effectKeys: ["glitch", "rgb", "flicker", "strobe"] },
  ];

  return effects.reduce((score, effect) => {
    const lower = (effect.name || effect).toLowerCase();
    const matchedRule = rules.find((rule) => {
      return rule.packKeys.some((key) => text.includes(key)) && rule.effectKeys.some((key) => lower.includes(key));
    });
    const tagMatch = tags.some((tag) => lower.includes(tag) || matchedRule?.effectKeys.includes(tag));
    return score + (matchedRule ? 3 : 0) + (tagMatch ? 4 : 0) + (text.includes(lower.split(" ")[0]) ? 1 : 0);
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
  const topEffects = result.effects.slice(0, 4);
  const topEvents = result.events.slice(0, 3);
  const topNames = topEffects.map((effect) => effect.name).join(", ");
  document.getElementById("summaryBox").innerHTML = `
    <div class="summary-main">${result.label} intensity edit</div>
    <div class="summary-text">
      Most likely: ${topNames || "Simple clean edit"}. Found
      ${result.metrics.sceneChanges} scene change${result.metrics.sceneChanges === 1 ? "" : "s"}
      and ${result.metrics.audioHits} audio hit${result.metrics.audioHits === 1 ? "" : "s"}.
    </div>
  `;

  document.getElementById("effectChips").innerHTML = topEffects
    .map(
      (effect) => `
        <span class="effect-chip" title="${effect.reason}">
          <span>${effect.name}</span>
          <b>${effect.confidence}%</b>
        </span>
      `,
    )
    .join("");

  document.getElementById("timelineList").innerHTML = topEvents.length
    ? topEvents
        .map(
          (event) => `
            <button class="timeline-item timeline-button" type="button" data-time="${event.time}">
              <div class="timeline-time">${formatTime(event.time)} - ${event.confidence}%</div>
              <div class="timeline-label">${event.label}</div>
              <div class="timeline-note">${event.note}</div>
            </button>
          `,
        )
        .join("")
    : `<div class="timeline-item">
        <div class="timeline-label">Aniq transition topilmadi</div>
        <div class="timeline-note">Video silliq yoki kam effektli bo'lishi mumkin. Full analysis obuna bilan chiqadi.</div>
      </div>`;

  const recommended = allPacks
    .map((pack) => ({ pack, score: scorePack(pack, result.effects) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  result.recommendations = recommended.map(({ pack, score }) => ({
    id: pack.id,
    name: pack.name,
    price: pack.price || "Free",
    score,
  }));

  const metrics = result.metrics || {};
  document.getElementById("metricGrid").innerHTML = [
    ["Scene changes", metrics.sceneChanges ?? 0],
    ["Audio hits", metrics.audioHits ?? 0],
    ["Audio drops", metrics.audioDrops ?? 0],
    ["Motion", metrics.avgMotion ?? 0],
    ["Contrast", metrics.avgContrast ?? 0],
    ["Saturation", (metrics.avgSaturation ?? 0) + "%"],
  ]
    .map(
      ([label, value]) => `
        <div class="metric-card">
          <div class="metric-value">${value}</div>
          <div class="metric-label">${label}</div>
        </div>
      `,
    )
    .join("");

  document.getElementById("allEffects").innerHTML = result.effects
    .slice(0, 8)
    .map(
      (effect) => `
        <span class="effect-chip" title="${effect.reason || ""}">
          <span>${effect.name}</span>
          <b>${effect.confidence}%</b>
        </span>
      `,
    )
    .join("");

  document.getElementById("recommendList").innerHTML = recommended.length
    ? recommended
        .map(
          ({ pack, score }) => `
            <a class="recommend-item" href="/pages/detail.html?id=${pack.id}&from=scanner&effects=${encodeURIComponent(topNames)}">
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

function renderHistory() {
  const block = document.getElementById("historyBlock");
  const list = document.getElementById("historyList");
  if (!block || !list) return;

  if (!getUser() || !scanHistory.length) {
    block.hidden = true;
    return;
  }

  block.hidden = false;
  list.innerHTML = scanHistory
    .slice(0, 6)
    .map(
      (scan) => `
        <button class="history-item" type="button" data-scan-id="${scan.id}">
          <div class="history-name">${scan.file_name || "Video"}</div>
          <div class="history-meta">${scan.result?.label || "Low"} intensity - ${formatDateTime(scan.created_at)}</div>
        </button>
      `,
    )
    .join("");
}

async function loadScanHistory() {
  if (!getToken()) return;
  try {
    const res = await fetch(`${API}/scans`, {
      headers: { Authorization: "Bearer " + getToken() },
    });
    if (!res.ok) throw new Error();
    scanHistory = await res.json();
    renderHistory();
  } catch {
    scanHistory = [];
  }
}

async function saveScanHistory(result) {
  if (!getToken() || !selectedFile) return;
  try {
    const res = await fetch(`${API}/scans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getToken(),
      },
      body: JSON.stringify({
        file_name: selectedFile.name,
        duration: scanVideo.duration || 0,
        result,
      }),
    });
    if (!res.ok) throw new Error();
    const saved = await res.json();
    scanHistory = [saved, ...scanHistory.filter((scan) => scan.id !== saved.id)].slice(0, 12);
    renderHistory();
  } catch {}
}

document.getElementById("timelineList")?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-time]");
  if (!item || !scanVideo.src) return;
  const time = Number(item.dataset.time);
  if (!Number.isFinite(time)) return;
  scanVideo.currentTime = Math.min(Math.max(time, 0), Math.max(scanVideo.duration - 0.05, 0));
  scanVideo.play().catch(() => {});
});

document.getElementById("historyList")?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-scan-id]");
  if (!item) return;
  const scan = scanHistory.find((entry) => String(entry.id) === item.dataset.scanId);
  if (scan?.result) renderResults(scan.result);
});

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
    await saveScanHistory(result);
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
loadScanHistory();
renderNavUser();
