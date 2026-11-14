// Сборка страницы: разметка из content.js, язык, анимации скролла, 3D-сцена.
import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TEXT } from './content.js';
import { appMarkup, esc } from './markup.js';
import { typeBsl } from './bsl.js';
import { initOrder, docNumber } from './order.js';

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
// Секции по порядку и кадр камеры для каждой: пауза держит тот же кадр, что и секция после неё
const SECTIONS = ['hero', 'p-forklift', 'services', 'p-tsd', 'cases', 'p-truck', 'process', 'p-server', 'about', 'order'];
const SECTION_KEY = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5];
const KEY_COUNT = 6;

let lang = pickLang();
let theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; // по умолчанию светлая
let scene = null;
let world = null;
let live = null; // «живой склад»: события в 3D по разделу, который читают // режим «мир»: стенды в 3D (выключен, если 3D нет)

function pickLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'ru') return q;
  try { return localStorage.getItem('lang') || 'ru'; } catch { return 'ru'; }
}

function render() {
  const t = TEXT[lang];
  document.documentElement.lang = lang;
  document.title = t.meta.title;
  document.querySelector('meta[name="description"]').setAttribute('content', t.meta.description);
  const today = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB');
  const number = docNumber();

  const app = document.getElementById('app');
  app.innerHTML = appMarkup(t, lang, { number, today });

  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    lang = lang === 'ru' ? 'en' : 'ru';
    try { localStorage.setItem('lang', lang); } catch { /* приватный режим */ }
    ScrollTrigger.getAll().forEach((st) => st.kill());
    const y = scrollY;
    document.documentElement.classList.remove('menu-open');
    render();
    scrollTo(0, y);
  }));

  document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => applyTheme(theme === 'dark' ? 'light' : 'dark', true)));

  // ссылка «3D-модели» в подвале раскрывает список авторов (лицензия CC BY)
  const creditsLink = document.querySelector('.credits-link');
  creditsLink.addEventListener('click', (e) => {
    e.preventDefault();
    const list = document.getElementById('credits');
    list.hidden = !list.hidden;
    creditsLink.setAttribute('aria-expanded', String(!list.hidden));
  });

  const menuBtn = document.querySelector('.menu-btn');
  const menu = document.getElementById('nav-mobile');
  // мобильное меню на весь экран; пока открыто — страница под ним не прокручивается
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    document.documentElement.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  };
  window.__setMenu = setMenu;
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  if (!render.bound) {
    render.bound = true;
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.__setMenu(false); });
  }

  initCases(t);
  initMagnet();
  typeBsl(document.getElementById('bsl'), lang, reduced);
  initOrder(document.querySelector('.order'), t.order, lang);
  animate();
  if (world) {
    world.refresh({ t, lang });
    syncSheet();
  }
}

// ---------- режим «мир»: интерфейс поверх сцены (мини-карта, подсказка, заставка, карточка на телефоне) ----------
const WORLD_IDS = ['hero', 'services', 'cases', 'process', 'about', 'order'];
let sheetId = null;

function worldChrome() {
  const t = TEXT[lang];
  const names = [lang === 'ru' ? 'Вход' : 'Entrance', t.nav.services, t.nav.cases, t.nav.process, t.nav.about, t.nav.order];
  document.body.insertAdjacentHTML('beforeend', `
    <div id="world-css" aria-hidden="false"></div>
    <nav id="world-map" aria-label="${lang === 'ru' ? 'Карта склада' : 'Warehouse map'}">
      ${names.map((n, i) => `<button type="button" class="wm-dot" aria-label="${esc(n)}"><span class="wm-label">${n}</span></button>`).join('')}
    </nav>
    <div id="world-hint" aria-hidden="true"><span class="wh-mouse"></span>${mobile ? (lang === 'ru' ? 'Свайп вверх — дальше' : 'Swipe up to continue') : (lang === 'ru' ? 'Листайте — едем по складу' : 'Scroll to move through the warehouse')}</div>
    <aside id="world-sheet" class="world-sheet" aria-live="polite"></aside>
    <div id="world-splash"><svg viewBox="0 0 32 32" aria-hidden="true"><path class="bulb" d="M16 3.5a9 9 0 0 0-5.4 16.2c.9.7 1.4 1.7 1.4 2.8V24h8v-1.5c0-1.1.5-2.1 1.4-2.8A9 9 0 0 0 16 3.5z"/><g class="filament"><rect x="12" y="9" width="1.4" height="9"/><rect x="14.4" y="9" width=".8" height="9"/><rect x="16.2" y="9" width="2" height="9"/><rect x="19.1" y="9" width=".8" height="9"/></g><rect class="base" x="12" y="25.5" width="8" height="3" rx="1.2"/></svg><b>BSL<i>amp</i></b></div>`);
}

// на телефоне содержимое локации выезжает снизу: в карточку переносится сама секция (с её кнопками и формой)
function syncSheet(id = sheetId) {
  if (!mobile || !world) return;
  const sheet = document.getElementById('world-sheet');
  const back = sheet.querySelector('section');
  if (back) document.querySelector('main').append(back);
  sheetId = id;
  const sec = id && document.getElementById(id);
  if (!sec) return;
  // в карточке нет прокрутки страницы — анимации «по скроллу» показываем сразу
  sec.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  gsap.killTweensOf(sec.querySelectorAll('.ch'));
  gsap.set(sec.querySelectorAll('.ch'), { opacity: 1, yPercent: 0 });
  sheet.append(sec);
  sheet.scrollTop = 0;
  sheet.classList.add('open');
  if (id === 'process') startConsole();
}

async function initWorldMode() {
  if (!scene || reduced) return;
  worldChrome();
  const { initWorld } = await import('./world.js');
  world = initWorld(scene, { t: TEXT[lang], lang, mobile, typeBsl, reduced });
  document.addEventListener('world:location', (e) => syncSheet(e.detail.id));
  syncSheet('hero');
}

function animate() {
  if (scene) bindCamera();

  if (reduced) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    initConsole();
    return;
  }

  // буквы заголовков выезжают по одной
  document.querySelectorAll('.hero h1 .line > span, .sec-head h2, .pause-text').forEach(splitChars);
  gsap.from('.hero h1 .ch', { yPercent: 45, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.018, delay: 0.1 });
  document.querySelectorAll('.sec-head h2, .pause-text').forEach((el) => {
    gsap.from(el.querySelectorAll('.ch'), {
      yPercent: 45, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.014,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
  gsap.from('.hero .kicker, .hero .lead, .hero .cta', { opacity: 0, y: 24, duration: 0.9, stagger: 0.1, delay: 0.5 });

  document.querySelectorAll('.reveal').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => el.classList.add('in') });
  });

  initConsole();
}

// Разбить текст на слова и буквы (для анимации «по одной»); вложенные элементы (жёлтый маркер) сохраняются
function splitChars(el) {
  if (el.dataset.split) return;
  el.dataset.split = '1';
  el.setAttribute('aria-label', el.textContent.trim());
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 1) { walk(n); return; }
      if (n.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(' '); return; }
        const w = document.createElement('span');
        w.className = 'w';
        w.setAttribute('aria-hidden', 'true');
        [...part].forEach((ch) => {
          const c = document.createElement('span');
          c.className = 'ch';
          c.textContent = ch;
          w.append(c);
        });
        frag.append(w);
      });
      n.replaceWith(frag);
    });
  };
  walk(el);
}

// Магнитные кнопки: тянутся за курсором, отпускают с пружинкой
function initMagnet() {
  if (reduced || !matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('.btn').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.3, ease: 'power2.out' });
    });
    b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }));
  });
}

// Кейсы: журнал слева, открытый кейс в окне «Такси» справа; стрелки ‹ › листают
function initCases(t) {
  const items = t.cases.items;
  const L = t.cases.labels;
  const view = document.getElementById('case-view');
  const rows = [...document.querySelectorAll('.journal-row')];
  let cur = 0;
  const show = (i) => {
    cur = (i + items.length) % items.length;
    const c = items[cur];
    rows.forEach((r, k) => { r.classList.toggle('on', k === cur); r.setAttribute('aria-selected', String(k === cur)); });
    view.innerHTML = `
      <span class="sticker" aria-hidden="true">${c.sticker}</span>
      <div class="win">
        <div class="win-title">
          <span class="win-nav">
            <button type="button" data-step="-1" aria-label="${esc(L.prev)}">‹</button>
            <button type="button" data-step="1" aria-label="${esc(L.next)}">›</button>
            <i class="star" aria-hidden="true">☆</i>
          </span>
          <span class="win-title-text">${L.case} ${String(cur + 1).padStart(2, '0')}: ${c.title}</span>
          <span class="win-ctl" aria-hidden="true"><i>⋮</i><i>▢</i><i>×</i></span>
        </div>
        <div class="win-cmd case-cmd">
          <button type="button" class="cmd" data-step="-1">‹ ${L.back}</button>
          <button type="button" class="cmd cmd-main" data-step="1">${L.fwd} ›</button>
          <span class="case-count">${cur + 1} ${L.of} ${items.length}</span>
        </div>
        <div class="win-body">
          <div class="kv"><span>${L.industry}:</span><b>${c.who}</b></div>
          <div class="kv"><span>${L.config}:</span><b>${c.config}</b></div>
          <div class="case-part"><span class="lbl">${L.task}</span><p>${c.task}</p></div>
          <div class="case-part"><span class="lbl">${L.solution}</span><p>${c.solution}</p></div>
          <div class="case-part result"><span class="lbl">${L.result}</span><p>${c.result}</p></div>
        </div>
      </div>`;
    view.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => show(cur + Number(b.dataset.step))));
    if (!reduced) {
      gsap.fromTo(view.querySelector('.win'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
      // наклейка «прилепляется» с лёгким отскоком
      gsap.fromTo(view.querySelector('.sticker'), { scale: 0.4, rotate: -24, opacity: 0 }, { scale: 1, rotate: -7, opacity: 1, duration: 0.55, delay: 0.15, ease: 'back.out(2.2)' });
    }
    // на телефоне журнал — горизонтальная лента: подкручиваем только её, не страницу
    const list = rows[cur].parentElement;
    if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: rows[cur].offsetLeft - 16, behavior: reduced ? 'auto' : 'smooth' });
  };
  rows.forEach((r) => r.addEventListener('click', () => show(Number(r.dataset.case))));
  view.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
  show(0);
}

let startConsole = () => {};
// Консоль запросов: текст запроса печатается, строки результата появляются по одной
function initConsole() {
  const q = document.getElementById('console-query');
  const text = q.dataset.text;
  const rows = document.querySelectorAll('.cr-row');
  const paint = (n) => {
    q.innerHTML = esc(text.slice(0, n)).replace(/^(ВЫБРАТЬ|ИЗ|ГДЕ|SELECT|FROM|WHERE)/gm, '<span class="q-kw">$1</span>');
  };
  if (reduced) {
    paint(text.length);
    rows.forEach((r) => r.classList.add('in'));
    return;
  }
  paint(0);
  let started = false;
  startConsole = () => {
    if (started) return;
    started = true;
    let n = 0;
    const timer = setInterval(() => {
      n += 2;
      paint(n);
      if (n >= text.length) {
        clearInterval(timer);
        rows.forEach((r, i) => setTimeout(() => r.classList.add('in'), 200 + i * 160));
      }
    }, 30);
  };
  ScrollTrigger.create({ trigger: '.console', start: 'top 70%', once: true, onEnter: startConsole });
}

// Камера: доля пути между кадрами по положению секций; у каждого кадра — «задержка»
let tops = [];
function measure() {
  tops = SECTIONS.map((id) => document.getElementById(id).offsetTop);
}
function onScroll() {
  if (world) return; // в режиме «мир» камерой управляют шаги, не прокрутка
  const mid = scrollY + innerHeight * 0.5;
  let i = 0;
  while (i < tops.length - 2 && mid >= tops[i + 1]) i++;
  const span = tops[i + 1] - tops[i] || 1;
  const frac = Math.min(1, Math.max(0, (mid - tops[i]) / span));
  const f = Math.min(1, Math.max(0, (frac - 0.45) / 0.55));
  const eased = f * f * (3 - 2 * f);
  const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
  live?.setSection(atEnd ? SECTIONS[SECTIONS.length - 1] : SECTIONS[mid >= tops[i + 1] ? i + 1 : i]);
  const key = SECTION_KEY[i] + (SECTION_KEY[i + 1] - SECTION_KEY[i]) * eased;
  scene.setProgress(atEnd ? 1 : key / (KEY_COUNT - 1));
}
let cameraBound = false;
function bindCamera() {
  measure();
  onScroll();
  if (cameraBound) return;
  cameraBound = true;
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); });
  document.fonts?.ready.then(() => { measure(); onScroll(); });
}

// Курсор-сканер ТСД: красная линия и скобки, на ссылках «пикает» штрихкодом
function initCursor() {
  if (reduced) return;
  const fine = matchMedia('(pointer: fine)');
  // мышь может появиться позже (планшет с мышью, смена режима) — тогда включаем курсор без перезагрузки
  if (!fine.matches) {
    fine.addEventListener('change', () => { if (fine.matches) initCursor(); }, { once: true });
    return;
  }
  if (initCursor.done) return;
  initCursor.done = true;
  const cur = document.getElementById('cursor');
  cur.classList.add('on');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; });
  const label = cur.querySelector('.cur-label');
  addEventListener('pointerover', (e) => {
    const tip = e.target.closest('[data-cursor]');
    cur.classList.toggle('labeled', !!tip);
    if (tip) label.textContent = tip.dataset.cursor;
    cur.classList.toggle('hot', !tip && !!e.target.closest('a, button, select, input, textarea, .win'));
  });
  // при прокрутке под курсором оказывается другое — подпись «Открыть» снимаем
  addEventListener('scroll', () => cur.classList.remove('labeled'), { passive: true });
  const loop = () => {
    cx += (x - cx) * 0.25;
    cy += (y - cy) * 0.25;
    cur.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(loop);
  };
  loop();
}

// Тема: светлая по умолчанию; выбор хранится в браузере посетителя
function applyTheme(name, save) {
  theme = name;
  if (name === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', name === 'dark' ? '#1b1b1e' : '#f3efe6');
  scene?.setTheme(name);
  if (save) {
    try { localStorage.setItem('theme', name); } catch { /* приватный режим */ }
  }
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

async function initScene() {
  if (reduced || !hasWebGL()) {
    document.body.classList.add('no3d');
    return;
  }
  try {
    const { createScene } = await import('./scene.js');
    scene = createScene(document.getElementById('scene'), { mobile });
    document.body.classList.add('has3d');
  } catch (e) {
    console.warn('3D отключено:', e);
    document.body.classList.add('no3d');
  }
}

initScene().then(async () => {
  applyTheme(theme, false);
  render();
  initCursor();
  if (!scene) return;
  const { initLive } = await import('./live.js');
  live = initLive(scene, { lang, reduced });
  onScroll();
  // await initWorldMode(); // режим «мир» отклонён 14.11 (метка world-proto)
});
