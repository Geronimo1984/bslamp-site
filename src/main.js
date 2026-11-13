// Сборка страницы: разметка из content.js, язык, анимации скролла, 3D-сцена.
import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TEXT, BRAND, MODEL_CREDITS } from './content.js';
import { typeBsl } from './bsl.js';
import { initOrder, docNumber, contactLinks } from './order.js';

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
// Секции по порядку и кадр камеры для каждой: пауза держит тот же кадр, что и секция после неё
const SECTIONS = ['hero', 'p-forklift', 'services', 'p-tsd', 'cases', 'p-truck', 'process', 'p-server', 'about', 'order'];
const SECTION_KEY = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5];
const KEY_COUNT = 6;
const NAV = ['services', 'cases', 'process', 'about'];
const PAUSE = (id, text) => `<section id="p-${id}" class="pause" aria-label="${esc(text)}"><p class="pause-text reveal">${text}</p></section>`;

let lang = pickLang();
let theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; // по умолчанию светлая
let scene = null;

function pickLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'ru') return q;
  try { return localStorage.getItem('lang') || 'ru'; } catch { return 'ru'; }
}

const ICONS = {
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  plug: '<path d="M7 12h10M9 7V3M15 7V3M6 7h12v4a6 6 0 0 1-12 0zM12 17v4"/>',
  barcode: '<path d="M4 5v14M7 5v14M10 5v14M14 5v14M16 5v14M20 5v14"/>',
  migrate: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  support: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M6.3 6.3l3.5 3.5M14.2 14.2l3.5 3.5M17.7 6.3l-3.5 3.5M9.8 14.2l-3.5 3.5"/>',
  auto: '<rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 4v4M9 13h.01M15 13h.01M9 16h6"/>',
  tg: '<path d="M21 4L3 11l6 2 2 6 3-4 5 4z"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/>',
  phone: '<path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  github: '<path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-1-2.5c3 0 6-2 6-5.5a4.5 4.5 0 0 0-1.3-3.2 4 4 0 0 0-.1-3.3s-1.1-.3-3.4 1.3a12 12 0 0 0-6.2 0C6.7 2.7 5.6 3 5.6 3a4 4 0 0 0-.1 3.3A4.5 4.5 0 0 0 4.2 9.5C4.2 13 7.2 15 10 15a3 3 0 0 0-1 2.5V21"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// Окно в стиле интерфейса 1С «Такси»
function taxiWindow(title, body, { cls = '', commands = '' } = {}) {
  return `
  <div class="win ${cls}">
    <div class="win-title">
      <span class="win-nav" aria-hidden="true"><i>‹</i><i>›</i><i class="star">☆</i></span>
      <span class="win-title-text">${title}</span>
      <span class="win-ctl" aria-hidden="true"><i>⋮</i><i>▢</i><i>×</i></span>
    </div>
    ${commands ? `<div class="win-cmd">${commands}</div>` : ''}
    <div class="win-body">${body}</div>
  </div>`;
}

function render() {
  const t = TEXT[lang];
  document.documentElement.lang = lang;
  document.title = t.meta.title;
  document.querySelector('meta[name="description"]').setAttribute('content', t.meta.description);
  const today = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB');
  const number = docNumber();

  const app = document.getElementById('app');
  app.innerHTML = `
  <header class="top">
    <a class="brand" href="#hero" aria-label="${esc(t.meta.title)}">
      <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
        <path class="bulb" d="M16 3.5a9 9 0 0 0-5.4 16.2c.9.7 1.4 1.7 1.4 2.8V24h8v-1.5c0-1.1.5-2.1 1.4-2.8A9 9 0 0 0 16 3.5z"/>
        <g class="filament"><rect x="12" y="9" width="1.4" height="9"/><rect x="14.4" y="9" width=".8" height="9"/><rect x="16.2" y="9" width="2" height="9"/><rect x="19.1" y="9" width=".8" height="9"/></g>
        <rect class="base" x="12" y="25.5" width="8" height="3" rx="1.2"/>
      </svg>
      <span class="brand-name">BSL<b>amp</b></span>
      <span class="brand-tag">${lang === 'ru' ? 'разработка 1С' : '1C development'}</span>
    </a>
    <nav class="nav">
      ${NAV.map((s) => `<a href="#${s}">${t.nav[s]}</a>`).join('')}
    </nav>
    <div class="top-actions">
      <button class="theme-btn" type="button" data-theme-toggle aria-label="${lang === 'ru' ? 'Переключить тему' : 'Toggle theme'}">
        <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      </button>
      <button class="lang" type="button" data-lang>${t.lang}</button>
      <a class="btn btn-y btn-sm" href="#order">${t.nav.order}</a>
      <button class="menu-btn" type="button" aria-label="${lang === 'ru' ? 'Меню' : 'Menu'}" aria-expanded="false" aria-controls="nav-mobile">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
    </div>
  </header>
  <nav class="nav-mobile" id="nav-mobile">
    ${NAV.map((s) => `<a href="#${s}">${t.nav[s]}</a>`).join('')}
  </nav>

  <main>
    <section id="hero" class="hero">
      <div class="hero-text">
        <p class="kicker">${t.hero.kicker}</p>
        <h1>${t.hero.title.map((l, i) => `<span class="line"><span${i === 1 ? ' class="mark"' : ''}>${l}</span></span>`).join('')}</h1>
        <p class="lead">${t.hero.lead}</p>
        <div class="cta">
          <a class="btn btn-y" href="#order">${t.hero.cta}</a>
          <a class="btn btn-ghost" href="#cases">${t.hero.cta2}</a>
        </div>
      </div>
      <div class="code-card">
        <div class="code-head"><span></span><span></span><span></span><em>${lang === 'ru' ? 'МодульОбъекта.bsl' : 'ObjectModule.bsl'}</em></div>
        <pre class="bsl" id="bsl"></pre>
      </div>
      <span class="scroll-hint" aria-hidden="true"></span>
    </section>

    ${PAUSE('forklift', t.pauses.forklift)}

    <section id="services" class="sec">
      <div class="sec-head reveal">
        <div><p class="kicker">${t.services.kicker}</p><h2>${t.services.title}</h2></div>
        <div class="rate"><strong>${t.services.rate}</strong><span>${t.services.rateNote}</span></div>
      </div>
      <ol class="svc-list">
        ${t.services.main.map((s, i) => `
          <li class="svc reveal" tabindex="0">
            <span class="svc-num">${String(i + 1).padStart(2, '0')}</span>
            <span class="svc-ico">${icon(s.icon)}</span>
            <h3>${s.title}</h3>
            <div class="svc-more"><p>${s.text}</p></div>
          </li>`).join('')}
      </ol>
      <div class="also-block reveal">
        <h3 class="also-title">${t.services.alsoTitle}</h3>
        <div class="also-grid">
          ${t.services.also.map((s) => `<div class="also"><h4>${s.title}</h4><p>${s.text}</p></div>`).join('')}
        </div>
      </div>
    </section>

    ${PAUSE('tsd', t.pauses.tsd)}

    <section id="cases" class="sec">
      <div class="sec-head reveal"><div><p class="kicker">${t.cases.kicker}</p><h2>${t.cases.title}</h2></div></div>
      <div class="journal reveal">
        <div class="journal-list" role="tablist" aria-label="${esc(t.cases.labels.journal)}">
          <div class="journal-head" aria-hidden="true"><span>${t.cases.labels.num}</span><span>${t.cases.labels.name}</span></div>
          ${t.cases.items.map((c, i) => `
            <button type="button" class="journal-row${i === 0 ? ' on' : ''}" role="tab" aria-selected="${i === 0}" data-case="${i}" data-cursor="${esc(t.nav.open)}">
              <span class="j-num">${String(i + 1).padStart(2, '0')}</span>
              <span class="j-name"><b>${c.title}</b><small>${c.who}</small></span>
            </button>`).join('')}
        </div>
        <div class="case-view" id="case-view" role="tabpanel" aria-live="polite"></div>
      </div>
    </section>

    ${PAUSE('truck', t.pauses.truck)}

    <section id="process" class="sec">
      <div class="sec-head reveal"><div><p class="kicker">${t.process.kicker}</p><h2>${t.process.title}</h2></div></div>
      <div class="console reveal">
        <div class="console-title"><span></span><span></span><span></span><em>${t.process.console}</em></div>
        <pre class="console-query" id="console-query" data-text="${esc(t.process.query.map(([k, v]) => `${k} ${v}`).join('\n'))}"></pre>
        <div class="console-result">
          <div class="cr-head"><span>${t.process.result}</span><span>${t.process.steps.length}</span></div>
          ${t.process.steps.map((st, i) => `<div class="cr-row"><span class="cr-n">${i + 1}</span><b>${st.title}</b><span class="cr-t">${st.text}</span></div>`).join('')}
        </div>
      </div>
    </section>

    ${PAUSE('server', t.pauses.server)}

    <section id="about" class="sec">
      <p class="kicker reveal">${t.about.kicker}</p>
      <div class="about glass reveal">
        <div>
          <h2>${t.about.title}</h2>
          <div class="founder">
            <span class="founder-mark" aria-hidden="true">${lang === 'ru' ? 'НР' : 'NR'}</span>
            <span><em>${t.about.founderLabel}</em><b>${t.about.founder}</b><small>${t.about.founderRole}</small></span>
          </div>
          ${t.about.text.map((p) => `<p>${p}</p>`).join('')}
        </div>
        <div class="stats">
          ${t.about.stats.map((s) => `<div class="stat"><strong>${s.value}</strong><span>${s.label}</span></div>`).join('')}
        </div>
      </div>
    </section>

    <section id="order" class="sec">
      <p class="kicker reveal">${t.order.kicker}</p>
      <div class="sec-head reveal"><h2 class="final-title">${t.order.title}</h2></div>
      <div class="order-wrap">
        <div class="order reveal" data-number="${number}">
          ${taxiWindow(`${t.order.doc} (${lang === 'ru' ? 'создание' : 'new'})`, `
            <form novalidate>
              <div class="doc-head">
                <div class="field ro"><label for="f-no">${t.order.docNo}</label><input id="f-no" value="${number}" readonly tabindex="-1"></div>
                <div class="field ro"><label for="f-date">${t.order.from}</label><input id="f-date" value="${today}" readonly tabindex="-1"></div>
              </div>
              <div class="field"><label for="f-name">${t.order.fields.name}</label><input id="f-name" name="name" autocomplete="name" placeholder="${esc(t.order.fields.namePh)}"></div>
              <div class="field-row">
                <div class="field"><label for="f-config">${t.order.fields.config}</label><select id="f-config" name="config">${t.order.fields.configs.map((o) => `<option>${o}</option>`).join('')}</select></div>
                <div class="field"><label for="f-kind">${t.order.fields.kind}</label><select id="f-kind" name="kind">${t.order.fields.kinds.map((o) => `<option>${o}</option>`).join('')}</select></div>
              </div>
              <div class="field"><label for="f-task">${t.order.fields.task}</label><textarea id="f-task" name="task" rows="4" placeholder="${esc(t.order.fields.taskPh)}"></textarea></div>
              <div class="field"><label for="f-contact">${t.order.fields.contact}</label><input id="f-contact" name="contact" autocomplete="tel" placeholder="${esc(t.order.fields.contactPh)}"></div>
              <p class="draft-note">${t.order.draftNote}</p>
            </form>
            <div class="messages" hidden><b>${lang === 'ru' ? 'Сообщения:' : 'Messages:'}</b><ul></ul></div>
            <div class="posted" hidden>
              <p class="posted-title">✓ ${t.order.posted}</p>
              <p>${t.order.postedText}</p>
              <pre></pre>
              <div class="send-row">
                <a class="send send-tg" data-send="tg" target="_blank" rel="noopener">${icon('tg')}<span>Telegram</span></a>
                <a class="send send-wa" data-send="wa" target="_blank" rel="noopener">${icon('wa')}<span>WhatsApp</span></a>
                <a class="send send-mail" data-send="mail">${icon('mail')}<span>${t.order.sendMail}</span></a>
              </div>
              <p class="send-hint" hidden>${t.order.copiedHint}</p>
              <button type="button" class="cmd new-order" data-act="new">＋ ${t.order.newOrder}</button>
            </div>
          `, {
            commands: `
              <button type="button" class="cmd cmd-main" data-act="post">${t.order.buttons.post}</button>
              <button type="button" class="cmd" data-act="write">${t.order.buttons.write}</button>
              <button type="button" class="cmd" data-act="post-only">${t.order.buttons.postOnly}</button>`,
          })}
        </div>
        <aside class="contacts glass reveal">
          <h3>${t.order.contactsTitle}</h3>
          ${contactLinks().map((c) => `<a href="${c.href}" ${c.icon === 'github' ? 'target="_blank" rel="noopener"' : ''}>${icon(c.icon)}<span>${c.label}</span></a>`).join('')}
        </aside>
      </div>
    </section>
  </main>

  <footer class="foot">
    <div class="wordmark" aria-hidden="true">BSL<b>amp</b></div>
    <span>© ${new Date().getFullYear()} ${BRAND} · ${t.footer.owner} · ${t.footer.made} · <a href="#credits" class="credits-link" aria-controls="credits" aria-expanded="false">${t.footer.credits}</a></span>
    <a href="#hero">${t.footer.top} ↑</a>
    <p class="credits" id="credits" hidden>${MODEL_CREDITS.map((m) => m.author).join(', ')} (Sketchfab, CC BY 4.0, ${lang === 'ru' ? 'изменены' : 'modified'})</p>
  </footer>`;

  document.querySelector('[data-lang]').addEventListener('click', () => {
    lang = lang === 'ru' ? 'en' : 'ru';
    try { localStorage.setItem('lang', lang); } catch { /* приватный режим */ }
    ScrollTrigger.getAll().forEach((st) => st.kill());
    const y = scrollY;
    render();
    scrollTo(0, y);
  });

  document.querySelector('[data-theme-toggle]').addEventListener('click', () => applyTheme(theme === 'dark' ? 'light' : 'dark', true));

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
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  };
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  // закрыть меню по Esc и по клику мимо
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#nav-mobile, .menu-btn')) setMenu(false); });

  initCases(t);
  initMagnet();
  typeBsl(document.getElementById('bsl'), lang, reduced);
  initOrder(document.querySelector('.order'), t.order, lang);
  animate();
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
  ScrollTrigger.create({
    trigger: '.console', start: 'top 70%', once: true,
    onEnter: () => {
      let n = 0;
      const timer = setInterval(() => {
        n += 2;
        paint(n);
        if (n >= text.length) {
          clearInterval(timer);
          rows.forEach((r, i) => setTimeout(() => r.classList.add('in'), 200 + i * 160));
        }
      }, 30);
    },
  });
}

// Камера: доля пути между кадрами по положению секций; у каждого кадра — «задержка»
let tops = [];
function measure() {
  tops = SECTIONS.map((id) => document.getElementById(id).offsetTop);
}
function onScroll() {
  const mid = scrollY + innerHeight * 0.5;
  let i = 0;
  while (i < tops.length - 2 && mid >= tops[i + 1]) i++;
  const span = tops[i + 1] - tops[i] || 1;
  const frac = Math.min(1, Math.max(0, (mid - tops[i]) / span));
  const f = Math.min(1, Math.max(0, (frac - 0.45) / 0.55));
  const eased = f * f * (3 - 2 * f);
  const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
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

initScene().then(() => {
  applyTheme(theme, false);
  render();
  initCursor();
});
