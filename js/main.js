'use strict';

/* ============================================================
   Персональное обращение: ссылка вида index.html?g=roditeli-dashi
   подставит текст из GUESTS вместо общего приветствия.
   EDIT ME: раскомментируйте и заполните под каждого гостя.
   ============================================================ */
const GUESTS = {
  // 'mama-papa': 'Дорогие мама и папа!',
  // 'roditeli-dashi': 'Дорогие Ирина и Сергей!',
  // 'brat': 'Дорогой Миша!',
};

const WEDDING_DATE = new Date('2026-08-19T10:00:00+04:00'); // сбор в отеле, Тбилиси (UTC+4)

const scene = document.getElementById('scene');
const envelope = document.getElementById('envelope');
const invite = document.getElementById('invite');
const bgm = document.getElementById('bgm');
const musicToggle = document.getElementById('musicToggle');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- персонализация ---------- */

(function applyGuestGreeting() {
  const slug = new URLSearchParams(location.search).get('g');
  if (slug && GUESTS[slug]) {
    document.getElementById('greeting').textContent = GUESTS[slug];
  }
})();

/* ---------- звук: шорох бумаги (Web Audio, без файла) ---------- */

let audioCtx = null;

function playRustle() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    const dur = 0.9;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      // шум с "хрустящей" огибающей: два всплеска, как отгибаемый клапан
      const env = Math.pow(Math.sin(Math.PI * t), 0.5) * (0.55 + 0.45 * Math.sin(t * 34));
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + dur);
    filter.Q.value = 0.9;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  } catch (e) { /* звук не критичен */ }
}

/* ---------- музыка ---------- */

function setMusicUi(playing) {
  musicToggle.setAttribute('aria-pressed', String(playing));
}

function startMusic() {
  if (sessionStorage.getItem('musicMuted') === '1') { setMusicUi(false); return; }
  bgm.volume = 0.55;
  bgm.play().then(() => setMusicUi(true)).catch(() => setMusicUi(false));
}

musicToggle.addEventListener('click', () => {
  if (bgm.paused) {
    sessionStorage.removeItem('musicMuted');
    bgm.volume = 0.55;
    bgm.play().then(() => setMusicUi(true)).catch(() => setMusicUi(false));
  } else {
    bgm.pause();
    sessionStorage.setItem('musicMuted', '1');
    setMusicUi(false);
  }
});

/* ---------- открытие конверта ---------- */

let opened = false;

function openEnvelope() {
  if (opened) return;
  opened = true;

  playRustle();
  startMusic();

  const t = reducedMotion ? { flap: 0, rise: 120, show: 240, done: 500 }
                          : { flap: 350, rise: 1150, show: 1850, done: 2700 };

  scene.classList.add('is-opening');

  setTimeout(() => scene.classList.add('is-rising'), t.rise);

  setTimeout(() => {
    invite.classList.add('is-shown');
    invite.removeAttribute('aria-hidden');
    document.body.classList.remove('locked');
    musicToggle.hidden = false;
    scene.classList.add('is-done');
    observeReveals();
  }, t.show);

  setTimeout(() => {
    scene.remove();
    window.scrollTo(0, 0);
  }, t.done);
}

envelope.addEventListener('click', openEnvelope);
envelope.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openEnvelope();
  }
});

/* ---------- появление секций при скролле ---------- */

function observeReveals() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
}

/* ---------- обратный отсчёт ---------- */

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const cd = {
  d: document.getElementById('cd-d'), dl: document.getElementById('cd-dl'),
  h: document.getElementById('cd-h'), hl: document.getElementById('cd-hl'),
  m: document.getElementById('cd-m'), ml: document.getElementById('cd-ml'),
  s: document.getElementById('cd-s'), sl: document.getElementById('cd-sl'),
};

function tickCountdown() {
  let diff = WEDDING_DATE - Date.now();
  if (diff <= 0) {
    document.querySelector('.section-count .eyebrow').textContent = 'Этот день настал';
    document.getElementById('countdown').innerHTML =
      '<p class="lead-accent">Сегодня мы становимся семьёй!</p>';
    clearInterval(cdTimer);
    return;
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000) % 24;
  const mins = Math.floor(diff / 60000) % 60;
  const secs = Math.floor(diff / 1000) % 60;

  cd.d.textContent = days;
  cd.h.textContent = hours;
  cd.m.textContent = mins;
  cd.s.textContent = secs;
  cd.dl.textContent = plural(days, 'день', 'дня', 'дней');
  cd.hl.textContent = plural(hours, 'час', 'часа', 'часов');
  cd.ml.textContent = plural(mins, 'минута', 'минуты', 'минут');
  cd.sl.textContent = plural(secs, 'секунда', 'секунды', 'секунд');
}

const cdTimer = setInterval(tickCountdown, 1000);
tickCountdown();

/* ---------- золотая пыль на сцене с конвертом ---------- */

(function dust() {
  if (reducedMotion) return;
  const canvas = document.getElementById('dustScene');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, raf;

  function resize() {
    w = canvas.width = canvas.offsetWidth * devicePixelRatio;
    h = canvas.height = canvas.offsetHeight * devicePixelRatio;
  }
  resize();
  window.addEventListener('resize', resize);

  const N = 26;
  const parts = Array.from({ length: N }, () => ({
    x: Math.random(), y: Math.random(),
    r: (0.8 + Math.random() * 2.2) * devicePixelRatio,
    vy: (0.06 + Math.random() * 0.12) / 1000,
    vx: (Math.random() - 0.5) * 0.04 / 1000,
    a: 0.12 + Math.random() * 0.3,
    ph: Math.random() * Math.PI * 2,
  }));

  let last = performance.now();
  function frame(now) {
    if (!document.body.contains(canvas)) { cancelAnimationFrame(raf); return; }
    const dt = Math.min(now - last, 50);
    last = now;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.y -= p.vy * dt;
      p.x += p.vx * dt + Math.sin(now / 2400 + p.ph) * 0.00004 * dt;
      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
      const tw = 0.6 + 0.4 * Math.sin(now / 900 + p.ph);
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(203, 181, 140, ${p.a * tw})`;
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
})();
