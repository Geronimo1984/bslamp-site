// Главы в духе кинематографичных сайтов: экран раздела закрепляется, прокрутка ведёт по шагам.
// Содержимое — в компактном «окне BSLamp» (строка заголовка как у формы 1С, внутри крупный текст и BSL-код),
// камера на шагах медленно наезжает, склад отвечает (таблички, сканирование, табло отгрузки).
// Последняя доля прокрутки главы — перелёт к следующему кадру тем же путём камеры, что и раньше.
// Обычная разметка раздела остаётся (поисковики, телефон, без 3D) — в режиме главы она скрыта.
import { esc } from './markup.js';
import { bslHtml } from './bsl.js';

const FLIGHT_SHARE = 0.14; // доля прокрутки главы на перелёт к следующему кадру

export function chapterSupported({ scene, reduced }) {
  return !!scene && !reduced; // и компьютер, и телефон (на телефоне окно снизу, склад сверху)
}

const pad = (n) => String(n).padStart(2, '0');

// Общая глава: id секции, подпись, заголовок окна, «путь» (Справочник · 03 из 06), шаги (HTML), подвал окна.
// dollyStep — метров наезда на шаг, dollySteps — сколько шагов камера едет (дальше стоит), onStep(k) — отклик склада.
function makeChapter({ id, kicker, title, path, of, steps, total = steps.length, foot = '', dollyStep = 0, dollySteps = steps.length, onStep }) {
  const sec = document.getElementById(id);
  sec.classList.add('chapter-on');
  sec.style.setProperty('--ch-steps', steps.length);
  sec.insertAdjacentHTML('beforeend', `
    <div class="ch-stick">
      <div class="ch-col">
        <section class="w1c" aria-label="${esc(title)}">
          <header class="w1c-bar">
            <span class="w1c-logo" aria-hidden="true"></span>
            <b>${esc(title)}</b>
            <em class="w1c-path"><span class="ch-pos">01</span> ${esc(of)} ${pad(total)}</em>
            <span class="w1c-ctl" aria-hidden="true"><i></i><i></i><i></i></span>
          </header>
          <div class="ch-steps">${steps.map((html, k) => `<div class="ch-step" data-step="${k}">${html}</div>`).join('')}</div>
          <footer class="w1c-status">
            ${foot}
            <span class="ch-ticks" aria-hidden="true">${steps.map(() => '<i></i>').join('')}</span>
          </footer>
        </section>
      </div>
    </div>`);
  const stepEls = [...sec.querySelectorAll('.ch-step')];
  const ticks = [...sec.querySelectorAll('.ch-ticks i')];
  const col = sec.querySelector('.ch-col');
  const pos = sec.querySelector('.ch-pos');
  let shown = -1;

  function show(k) {
    if (k === shown) return;
    shown = k;
    stepEls.forEach((el, n) => {
      el.classList.toggle('on', n === k);
      el.classList.toggle('past', n < k);
    });
    ticks.forEach((el, n) => el.classList.toggle('on', n <= k));
    pos.textContent = k < total ? pad(k + 1) : '+';
    onStep?.(k);
  }

  return {
    // состояние по прокрутке: наезд камеры и доля перелёта к следующему кадру
    state(scrollY) {
      const len = sec.offsetHeight - innerHeight;
      const p = Math.min(1, Math.max(0, (scrollY - sec.offsetTop) / len));
      const stepsEnd = 1 - FLIGHT_SHARE;
      const sp = Math.min(1, p / stepsEnd);
      const n = steps.length;
      show(Math.min(n - 1, Math.floor(sp * n)));
      // камера едет непрерывно и «доезжает» к середине шага
      const slot = Math.min(dollySteps - 1, Math.max(0, sp * n - 0.5));
      const flight = p <= stepsEnd ? 0 : (p - stepsEnd) / FLIGHT_SHARE;
      col.style.opacity = String(1 - Math.min(1, flight * 2.2));
      return { dolly: slot * this.dollyStep, flight };
    },
    dollyStep, // меняется панелью настройки (?tune=1)
    refresh() { shown = -1; },
  };
}

// ---------- Услуги: 6 услуг + «также делаем», камера едет вдоль стеллажа к табличкам 01–06 ----------
function servicesChapter(t, live) {
  const s = t.services;
  const ru = t.nav.services === 'Услуги';
  const n = s.main.length;
  const steps = s.main.map((m, k) => `
    <p class="ch-num"><b>${pad(k + 1)}</b><span>/ ${pad(n)}</span></p>
    <h3 class="ch-title">${esc(m.title)}</h3>
    <p class="ch-text">${esc(m.text)}</p>
    ${s.codes?.[k] ? `<pre class="w1c-code bsl">${bslHtml(s.codes[k])}</pre>` : ''}`);
  steps.push(`
    <p class="ch-num"><b>+</b></p>
    <h3 class="ch-title">${esc(s.alsoTitle)}</h3>
    <ul class="ch-list">${s.also.map((a) => `<li><b>${esc(a.title)}</b><span>${esc(a.text)}</span></li>`).join('')}</ul>`);
  return makeChapter({
    id: 'services', kicker: s.kicker, title: s.title, path: ru ? 'Справочник' : 'Catalog', of: ru ? 'из' : 'of',
    steps, total: n,
    foot: `<span class="ch-rate"><strong>${esc(s.rate)}</strong><span class="ch-rate-note"> · ${esc(s.rateNote)}</span></span>`,
    // компьютер: шаг табличек (табличка всё время в 4 м впереди); телефон: камера едет медленнее и держится дальше —
    // в узком кадре одновременно видны стеллаж, текущая табличка и ТСД в конце прохода
    dollyStep: matchMedia('(max-width: 1020px)').matches ? 1.15 : 1.8, dollySteps: n,
    onStep: (k) => live()?.focusSlot(k),
  });
}

// ---------- Кейсы: по кейсу на шаг, ТСД сканирует коробку на каждом ----------
function casesChapter(t, live) {
  const c = t.cases;
  const L = c.labels;
  const ru = t.nav.cases === 'Кейсы';
  const n = c.items.length;
  const steps = c.items.map((it, k) => `
    <p class="ch-num"><b>${pad(k + 1)}</b><span>/ ${pad(n)}</span>${it.sticker ? `<em class="ch-sticker">${esc(it.sticker)}</em>` : ''}</p>
    <h3 class="ch-title">${esc(it.title)}</h3>
    <p class="ch-meta">${esc(it.who)} · ${esc(it.config)}</p>
    <dl class="ch-rows">
      <dt>${esc(L.task)}</dt><dd>${esc(it.task)}</dd>
      <dt>${esc(L.solution)}</dt><dd>${esc(it.solution)}</dd>
      <dt>${esc(L.result)}</dt><dd class="ch-result">${esc(it.result)}</dd>
    </dl>`);
  return makeChapter({
    id: 'cases', kicker: c.kicker, title: c.title, path: ru ? 'Журнал кейсов' : 'Case log', of: ru ? 'из' : 'of',
    steps, dollyStep: 0.12, // камера едва заметно подъезжает к ТСД
    onStep: () => live()?.scan(),
  });
}

// ---------- Этапы: по этапу на шаг, табло у дока считает отгрузку 1/6 → 6/6 ----------
function processChapter(t, live) {
  const p = t.process;
  const ru = t.nav.services === 'Услуги';
  const n = p.steps.length;
  const query = p.query.map(([k, v]) => `${k} ${v}`).join('\n');
  const steps = p.steps.map((st, k) => `
    <p class="ch-num"><b>${pad(k + 1)}</b><span>/ ${pad(n)}</span></p>
    <h3 class="ch-title">${esc(st.title)}</h3>
    <p class="ch-text">${esc(st.text)}</p>
    <pre class="w1c-code bsl">${bslHtml(p.codes?.[k] ?? query)}</pre>`); // у каждого этапа свой фрагмент кода
  return makeChapter({
    id: 'process', kicker: p.kicker, title: p.title, path: p.console, of: ru ? 'из' : 'of',
    steps, dollyStep: matchMedia('(max-width: 1020px)').matches ? 0.35 : 0.25,
    onStep: (k) => live()?.setShip(k + 1),
  });
}

// все главы страницы: { services, cases, process } — ключ совпадает с id секции
export function initChapters(t, live) {
  return {
    services: servicesChapter(t, live),
    cases: casesChapter(t, live),
    process: processChapter(t, live),
  };
}
