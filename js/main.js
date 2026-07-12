'use strict';

/* ============================================================
   Персональное обращение: ссылка вида index.html?g=roditeli-dashi
   подставит текст из GUESTS вместо общего приветствия.
   EDIT ME: раскомментируйте и заполните под каждого гостя.
   ============================================================ */
const GUESTS = {
  'mama-papa': { address: 'Для мамы и папы', greeting: 'Дорогие мама и папа!' },
  'mama':      { address: 'Для мамы',        greeting: 'Дорогая мама!' },
  'brat':      { address: 'Для Саши',        greeting: 'Дорогой Саша!' },
  'mama-sasha': { address: 'Для Людмилы Ивановны и Саши', greeting: 'Дорогие Людмила Ивановна и Саша!' },
  'lyudmila':       { address: 'Для Людмилы Ивановны',        greeting: 'Дорогая Людмила Ивановна!' },
  'lyudmila-sasha': { address: 'Для Людмилы Ивановны и Саши', greeting: 'Дорогие Людмила Ивановна и Саша!' },
  // EDIT ME: шаблон для новых гостей
  // 'roditeli-dashi': { address: 'Для Ирины и Сергея', greeting: 'Дорогие Ирина и Сергей!' },
};

const WEDDING_DATE = new Date('2026-08-19T09:00:00+04:00'); // сбор в отеле, Тбилиси (UTC+4)

const scene = document.getElementById('scene');
const envelope = document.getElementById('envelope');
const invite = document.getElementById('invite');
const bgm = document.getElementById('bgm');
const musicToggle = document.getElementById('musicToggle');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- персонализация ---------- */

(function applyGuestGreeting() {
  const slug = new URLSearchParams(location.search).get('g');
  const guest = slug && GUESTS[slug];
  if (!guest) return; // без параметра остаётся общий вариант из HTML
  if (guest.address) document.getElementById('envAddress').textContent = guest.address;
  if (guest.greeting) document.getElementById('greeting').textContent = guest.greeting;
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

const MUSIC_VOLUME = 0.55;
// music.mp3 «повёрнут» так, что начинается сразу с припева (шов цикла бесшовный)
let fadeTimer = null;

/* плавная громкость; на iOS volume игнорируется — просто играет как есть */
function fadeTo(target, ms, done) {
  clearInterval(fadeTimer);
  const from = bgm.volume;
  const start = performance.now();
  fadeTimer = setInterval(() => {
    const k = Math.min((performance.now() - start) / ms, 1);
    bgm.volume = from + (target - from) * k;
    if (k === 1) { clearInterval(fadeTimer); if (done) done(); }
  }, 40);
}

function setMusicUi(playing) {
  musicToggle.setAttribute('aria-pressed', String(playing));
}

function startMusic() {
  if (sessionStorage.getItem('musicMuted') === '1') { setMusicUi(false); return; }
  bgm.volume = 0;
  bgm.play().then(() => {
    setMusicUi(true);
    fadeTo(MUSIC_VOLUME, 2500); // музыка «выплывает» из конверта вместе с письмом
  }).catch(() => setMusicUi(false));
}

musicToggle.addEventListener('click', () => {
  if (bgm.paused) {
    sessionStorage.removeItem('musicMuted');
    bgm.volume = 0;
    bgm.play().then(() => {
      setMusicUi(true);
      fadeTo(MUSIC_VOLUME, 400);
    }).catch(() => setMusicUi(false));
  } else {
    sessionStorage.setItem('musicMuted', '1');
    setMusicUi(false);
    fadeTo(0, 400, () => bgm.pause());
  }
});

/* ---------- открытие конверта ---------- */

let opened = false;

function openEnvelope() {
  if (opened) return;
  opened = true;

  playRustle();
  startMusic();
  document.dispatchEvent(new CustomEvent('envelope-open'));

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
    startPlanes();
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

/* ---------- самолётики с транспарантами ---------- */

// EDIT ME: слова на флажках и число самолётиков в небе
const PLANE_WORDS = ['Love', 'Лёня ♥ Даша', 'All we need is love', '❤️', '19 · 08 · 2026', 'Ждём вас!', 'ки!'];
const PLANE_COUNT = 2;

const PLANE_SVG =
  '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" ' +
  'stroke="currentColor" stroke-width="1.4" stroke-linejoin="round">' +
  '<path d="M30 16 L3 7 L11 16 L3 25 Z"/><line x1="30" y1="16" x2="11" y2="16"/></svg>';

const ROPE_GAP = 16;  // от центра самолётика до начала верёвки (по дуге следа)
const ROPE_LEN = 34;  // длина верёвки

const planes = [];
let planeWordIdx = 0;
let skyCanvas = null, skyCtx = null;
const pointer = { x: -1e4, y: -1e4 };
let scrollGust = 0, lastScrollY = null;

/* точка на «следе» на расстоянии s (по дуге) позади самолёта;
   след хранится от свежего к старому */
function trailPoint(trail, s) {
  let acc = 0;
  for (let i = 0; i + 1 < trail.length; i++) {
    const a = trail[i], b = trail[i + 1];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + d >= s && d > 1e-6) {
      const t = (s - acc) / d;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
               ang: Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI };
    }
    acc += d;
  }
  const z = trail[trail.length - 1];
  return { x: z.x, y: z.y, ang: 0 };
}

function resetPlane(p, onScreen) {
  const W = window.innerWidth, H = window.innerHeight;
  const speed = 55 + Math.random() * 45; // px/с
  // летим строго слева направо или справа налево, с лёгким дрейфом по высоте
  const side = onScreen ? 'screen' : (Math.random() < 0.5 ? 'left' : 'right');

  p.vy = (Math.random() - 0.5) * 0.5 * speed;
  if (side === 'left')       { p.vx = speed;  p.x = -400; p.baseY = Math.random() * 0.5 * H; }
  else if (side === 'right') { p.vx = -speed; p.x = W + 80; p.baseY = Math.random() * 0.5 * H; }
  else                       { p.vx = (Math.random() < 0.5 ? 1 : -1) * speed; p.x = Math.random() * W; p.baseY = Math.random() * 0.45 * H; }
  p.flagEl.textContent = PLANE_WORDS[planeWordIdx++ % PLANE_WORDS.length];
  p.fw = p.flagEl.offsetWidth;
  p.fh = p.flagEl.offsetHeight;
  const total = ROPE_GAP + ROPE_LEN + p.fw + 60;
  if (side === 'left') p.x = -total;
  // две наложенные синусоиды — волнистая, «живая» траектория
  p.a1 = 24 + Math.random() * 30;  p.f1 = 0.005 + Math.random() * 0.004;  p.ph1 = Math.random() * Math.PI * 2;
  p.a2 = 8 + Math.random() * 14;   p.f2 = 0.011 + Math.random() * 0.007;  p.ph2 = Math.random() * Math.PI * 2;
  p.y = p.baseY;
  p.prevX = p.x;
  p.prevY = p.y;
  p.dodge = 0;                     // сглаженное смещение от курсора
  p.windOff = 0; p.windV = 0;      // «порыв ветра» от скролла
  p.heading = Math.atan2(p.vy, p.vx) * 180 / Math.PI; // нос — по вектору скорости
  p.flagAngle = ((p.heading + 90) % 180 + 180) % 180 - 90;

  // след предзаполняем назад по вектору скорости — флажок сразу летит ровно
  const sp = Math.hypot(p.vx, p.vy) || 1;
  const ux = p.vx / sp, uy = p.vy / sp;
  p.trail = [];
  for (let s = 0; s < total + 120; s += 5) {
    p.trail.push({ x: p.x - ux * s, y: p.y - uy * s });
  }
}

function planeFrame(now, dt) {
  const W = window.innerWidth, H = window.innerHeight;
  const gust = scrollGust; scrollGust = 0;

  skyCtx.clearRect(0, 0, skyCanvas.width, skyCanvas.height);
  skyCtx.strokeStyle = 'rgba(176, 141, 87, 0.75)';
  skyCtx.lineWidth = devicePixelRatio;
  skyCtx.setLineDash([4 * devicePixelRatio, 4 * devicePixelRatio]);

  for (const p of planes) {
    p.x += p.vx * dt;
    p.baseY += p.vy * dt;

    // мягкий отскок от границ «неба» (5–60% экрана)
    if (p.baseY < 0.04 * H && p.vy < 0) p.vy = -p.vy;
    if (p.baseY > 0.6 * H && p.vy > 0) p.vy = -p.vy;

    // курсор рядом — плавное усилие в сторону от него, без рывков
    const dx = p.x - pointer.x, dy = p.y - pointer.y;
    const dist = Math.hypot(dx, dy);
    const want = dist < 160 ? (dy >= 0 ? 1 : -1) * (160 - dist) * 0.8 : 0;
    p.dodge += (want - p.dodge) * Math.min(1, dt * 2.2);

    const wave = Math.sin(p.x * p.f1 + p.ph1) * p.a1 + Math.sin(p.x * p.f2 + p.ph2) * p.a2;
    p.y += (p.baseY + wave + p.dodge - p.y) * Math.min(1, dt * 3);

    const margin = ROPE_GAP + ROPE_LEN + p.fw + 200;
    if (p.x < -margin || p.x > W + margin || p.y < -160 || p.y > 0.8 * H) resetPlane(p, false);

    // «ветер» от скролла: импульс + возврат пружиной (у каждого свой характер)
    p.windV += -gust * p.windK * 2;
    p.windV = Math.max(-240, Math.min(240, p.windV));
    p.windV += (-9 * p.windOff - 4.5 * p.windV) * dt;
    p.windOff += p.windV * dt;
    const ry = p.y + p.windOff;

    // нос самолёта всегда смотрит туда, куда он реально летит
    const mx = p.x - p.prevX, my = ry - p.prevY;
    if (Math.hypot(mx, my) > 0.05) {
      const target = Math.atan2(my, mx) * 180 / Math.PI;
      const delta = ((target - p.heading + 540) % 360) - 180;
      p.heading += delta * Math.min(1, dt * 6);
    }
    p.prevX = p.x;
    p.prevY = ry;

    // след: свежая точка в начало, хвост подрезаем по длине дуги
    p.trail.unshift({ x: p.x, y: ry });
    let arc = 0;
    const maxArc = ROPE_GAP + ROPE_LEN + p.fw + 160;
    for (let i = 0; i + 1 < p.trail.length; i++) {
      arc += Math.hypot(p.trail[i + 1].x - p.trail[i].x, p.trail[i + 1].y - p.trail[i].y);
      if (arc > maxArc) { p.trail.length = i + 2; break; }
    }

    // флажок буксируется по следу: передняя кромка — точно у конца верёвки,
    // угол — хорда по следу на всю ширину флажка (без временно́го сглаживания)
    const fFront = trailPoint(p.trail, ROPE_GAP + ROPE_LEN);
    const fBack = trailPoint(p.trail, ROPE_GAP + ROPE_LEN + p.fw);
    const fcx = (fFront.x + fBack.x) / 2, fcy = (fFront.y + fBack.y) / 2;
    let fa = Math.atan2(fFront.y - fBack.y, fFront.x - fBack.x) * 180 / Math.PI;
    if (fa > 90) fa -= 180; else if (fa < -90) fa += 180; // текст не переворачивается
    const fd = ((fa - p.flagAngle + 540) % 360) - 180;
    p.flagAngle += fd * Math.min(1, dt * 20); // лишь гасим покадровый шум

    p.el.style.transform =
      `translate3d(${(p.x - 15).toFixed(1)}px, ${(ry - 15).toFixed(1)}px, 0) rotate(${p.heading.toFixed(1)}deg)`;
    p.flagEl.style.transform =
      `translate3d(${(fcx - p.fw / 2).toFixed(1)}px, ${(fcy - p.fh / 2).toFixed(1)}px, 0) rotate(${p.flagAngle.toFixed(1)}deg)`;

    // верёвка — кривая вдоль следа, от хвоста самолётика до кромки флажка
    skyCtx.beginPath();
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const pt = trailPoint(p.trail, ROPE_GAP + (ROPE_LEN / steps) * i);
      if (i === 0) skyCtx.moveTo(pt.x * devicePixelRatio, pt.y * devicePixelRatio);
      else skyCtx.lineTo(pt.x * devicePixelRatio, pt.y * devicePixelRatio);
    }
    skyCtx.stroke();
  }
}

function startPlanes() {
  if (reducedMotion) return;

  skyCanvas = document.createElement('canvas');
  skyCanvas.className = 'sky';
  skyCanvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(skyCanvas);
  skyCtx = skyCanvas.getContext('2d');
  const sizeSky = () => {
    skyCanvas.width = window.innerWidth * devicePixelRatio;
    skyCanvas.height = window.innerHeight * devicePixelRatio;
  };
  sizeSky();
  window.addEventListener('resize', sizeSky);

  for (let i = 0; i < PLANE_COUNT; i++) {
    const el = document.createElement('div');
    el.className = 'plane-node';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = PLANE_SVG;
    const flagEl = document.createElement('span');
    flagEl.className = 'plane-flag';
    flagEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    document.body.appendChild(flagEl);
    const p = { el, flagEl, windK: 0.10 + Math.random() * 0.12 };
    resetPlane(p, true);
    planes.push(p);
  }

  window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; });

  // скролл «сдувает» самолётики — с инерцией и пружинным возвратом
  lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    scrollGust += window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
  }, { passive: true });

  let last = performance.now();
  (function frame(now) {
    const dt = Math.min(now - last, 50) / 1000;
    last = now;
    planeFrame(now, dt);
    requestAnimationFrame(frame);
  })(last);
}

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

  /* золотой «салют» из-под печати в момент открытия */
  const burst = [];

  document.addEventListener('envelope-open', () => {
    const seal = document.querySelector('.wax-seal');
    if (!seal) return;
    const r = seal.getBoundingClientRect();
    const cx = (r.left + r.width / 2) * devicePixelRatio;
    const cy = (r.top + r.height / 2) * devicePixelRatio;
    for (let i = 0; i < 46; i++) {
      const ang = Math.random() * Math.PI * 2;
      const speed = (0.12 + Math.random() * 0.38) * devicePixelRatio;
      burst.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 0.22 * devicePixelRatio, // вверх
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.006,
        r: (1.2 + Math.random() * 2.6) * devicePixelRatio,
        petal: Math.random() < 0.45,
        life: 0,
        ttl: 1400 + Math.random() * 900,
      });
    }
  });

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
    for (let i = burst.length - 1; i >= 0; i--) {
      const b = burst[i];
      b.life += dt;
      if (b.life > b.ttl) { burst.splice(i, 1); continue; }
      b.vy += 0.00045 * devicePixelRatio * dt; // гравитация
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vrot * dt;
      const fade = 1 - b.life / b.ttl;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.beginPath();
      if (b.petal) {
        ctx.ellipse(0, 0, b.r * 2.2, b.r, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 195, 145, ${0.75 * fade})`;
      } else {
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(203, 181, 140, ${0.85 * fade})`;
      }
      ctx.fill();
      ctx.restore();
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
})();
