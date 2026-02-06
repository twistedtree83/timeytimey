const discEl = document.getElementById("timer-disc");
const countdownEl = document.getElementById("countdown");
const minutesInput = document.getElementById("minutes");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");
const endCanvas = document.getElementById("end-canvas");
const ctx = endCanvas.getContext("2d");

let totalMs = Number(minutesInput.value) * 60 * 1000;
let remainingMs = totalMs;
let startedAt = 0;
let timerRunning = false;
let rafId = 0;
let endShown = false;

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateVisuals() {
  const ratio = totalMs > 0 ? remainingMs / totalMs : 0;
  const angle = Math.max(0, Math.min(360, ratio * 360));
  discEl.style.background = `conic-gradient(var(--accent) ${angle}deg, var(--disc-empty) ${angle}deg 360deg)`;
  countdownEl.textContent = formatTime(remainingMs);
}

function tick() {
  if (!timerRunning) {
    return;
  }

  const elapsed = performance.now() - startedAt;
  remainingMs = Math.max(0, totalMs - elapsed);
  updateVisuals();

  if (remainingMs <= 0) {
    timerRunning = false;
    launchEndAnimation();
    return;
  }

  rafId = requestAnimationFrame(tick);
}

function startTimer() {
  if (timerRunning) {
    return;
  }

  if (!remainingMs || remainingMs === totalMs) {
    totalMs = Number(minutesInput.value || 10) * 60 * 1000;
    remainingMs = totalMs;
  }

  if (remainingMs <= 0) {
    return;
  }

  startedAt = performance.now() - (totalMs - remainingMs);
  timerRunning = true;
  endShown = false;
  endCanvas.classList.remove("active");
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
}

function pauseTimer() {
  timerRunning = false;
  cancelAnimationFrame(rafId);
}

function resetTimer() {
  pauseTimer();
  totalMs = Number(minutesInput.value || 10) * 60 * 1000;
  remainingMs = totalMs;
  endShown = false;
  endCanvas.classList.remove("active");
  updateVisuals();
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  endCanvas.width = Math.floor(window.innerWidth * dpr);
  endCanvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

async function fetchPalette() {
  const seed = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
  const url = `https://www.thecolorapi.com/scheme?hex=${seed}&mode=quad&count=4`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Palette API failed");
    }
    const data = await response.json();
    const colors = data.colors?.map((item) => item.hex.value).filter(Boolean);
    if (colors && colors.length >= 3) {
      return colors;
    }
  } catch (_error) {
    // Fallback palette keeps animation deterministic if API is unavailable.
  }

  return ["#ff6b35", "#ffd166", "#118ab2", "#06d6a0"];
}

async function launchEndAnimation() {
  if (endShown) {
    return;
  }
  endShown = true;

  const colors = await fetchPalette();
  const particles = [];
  const ripples = [];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  for (let i = 0; i < 220; i += 1) {
    const angle = (Math.PI * 2 * i) / 220;
    const speed = 1.5 + Math.random() * 4;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 9,
      color: colors[i % colors.length],
      life: 60 + Math.random() * 75,
      ttl: 60 + Math.random() * 75,
    });
  }

  for (let i = 0; i < 5; i += 1) {
    ripples.push({
      r: 0,
      max: Math.max(window.innerWidth, window.innerHeight) * (0.3 + i * 0.25),
      color: colors[i % colors.length],
      width: 4 + i * 1.8,
      alpha: 0.9 - i * 0.12,
      delay: i * 14,
    });
  }

  endCanvas.classList.add("active");

  function animate() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const ripple of ripples) {
      if (ripple.delay > 0) {
        ripple.delay -= 1;
        continue;
      }
      ripple.r += 8;
      const progress = ripple.r / ripple.max;
      const alpha = Math.max(0, ripple.alpha * (1 - progress));
      ctx.strokeStyle = ripple.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = ripple.width;
      ctx.beginPath();
      ctx.arc(cx, cy, ripple.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    for (const p of particles) {
      if (p.life <= 0) {
        continue;
      }
      p.life -= 1;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.vy *= 0.99;
      const alpha = Math.max(0, p.life / p.ttl);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    const activeParticles = particles.some((p) => p.life > 0);
    const activeRipples = ripples.some((r) => r.r < r.max);

    if (activeParticles || activeRipples) {
      requestAnimationFrame(animate);
    } else {
      setTimeout(() => {
        endCanvas.classList.remove("active");
      }, 900);
    }
  }

  requestAnimationFrame(animate);
}

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);
minutesInput.addEventListener("change", () => {
  const minutes = Math.max(1, Math.min(180, Number(minutesInput.value || 10)));
  minutesInput.value = String(minutes);
  if (!timerRunning) {
    totalMs = minutes * 60 * 1000;
    remainingMs = totalMs;
    updateVisuals();
  }
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
updateVisuals();
