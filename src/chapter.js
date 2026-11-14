// Глава «Услуги» в духе кинематографичных сайтов: экран закрепляется, прокрутка ведёт по шагам.
// Шаги 0–5 — шесть услуг: камера едет вдоль стеллажа, загорается табличка, слева одна крупная фраза.
// Шаг 6 — «Также делаем». Последняя доля прокрутки — перелёт к ТСД (как раньше, тем же путём камеры).
// Обычный список услуг остаётся в разметке (поисковики, телефон, без 3D) — в режиме главы он скрыт.
import { esc } from './markup.js';
import { bslHtml } from './bsl.js';

const STEPS = 7;           // 6 услуг + «также делаем»
const FLIGHT_SHARE = 0.12; // доля прокрутки главы на перелёт к следующему кадру
const DOLLY_STEP = 1.8;    // метров вперёд на шаг — шаг табличек на стеллаже, табличка всё время в 4 м впереди

export function chapterSupported({ scene, reduced }) {
  return !!scene && !reduced && matchMedia('(min-width: 1021px) and (pointer: fine)').matches;
}

export function initServicesChapter(t) {
  const sec = document.getElementById('services');
  const s = t.services;
  const total = String(s.main.length).padStart(2, '0');
  sec.classList.add('chapter-on');
  // всё содержимое главы — в одном «окне BSLamp»: строгая рамка формы 1С, внутри крупный текст и пример кода
  const ru = s.alsoTitle === 'Также делаем';
  sec.insertAdjacentHTML('beforeend', `
    <div class="ch-stick">
      <div class="ch-col">
        <p class="kicker">${esc(s.kicker)}</p>
        <section class="w1c" aria-label="${esc(s.title)}">
          <header class="w1c-bar">
            <span class="w1c-logo" aria-hidden="true"></span>
            <b>${esc(s.title)}</b>
            <em class="w1c-path">${ru ? 'Справочник' : 'Catalog'} · <span class="ch-pos">01</span> ${ru ? 'из' : 'of'} ${total}</em>
            <span class="w1c-ctl" aria-hidden="true"><i></i><i></i><i></i></span>
          </header>
          <div class="ch-steps">
            ${s.main.map((m, k) => `
              <div class="ch-step" data-step="${k}">
                <p class="ch-num"><b>${String(k + 1).padStart(2, '0')}</b><span>/ ${total}</span></p>
                <h3 class="ch-title">${esc(m.title)}</h3>
                <p class="ch-text">${esc(m.text)}</p>
                ${s.codes?.[k] ? `<pre class="w1c-code bsl">${bslHtml(s.codes[k])}</pre>` : ''}
              </div>`).join('')}
            <div class="ch-step ch-also" data-step="${s.main.length}">
              <p class="ch-num"><b>+</b></p>
              <h3 class="ch-title">${esc(s.alsoTitle)}</h3>
              <ul>${s.also.map((a) => `<li><b>${esc(a.title)}</b><span>${esc(a.text)}</span></li>`).join('')}</ul>
            </div>
          </div>
          <footer class="w1c-status">
            <span class="ch-rate"><strong>${esc(s.rate)}</strong> · ${esc(s.rateNote)}</span>
            <span class="ch-ticks" aria-hidden="true">${Array.from({ length: STEPS }, () => '<i></i>').join('')}</span>
          </footer>
        </section>
      </div>
    </div>`);
  const steps = [...sec.querySelectorAll('.ch-step')];
  const ticks = [...sec.querySelectorAll('.ch-ticks i')];
  const col = sec.querySelector('.ch-col');
  const pos = sec.querySelector('.ch-pos');
  let shown = -1;

  function show(k) {
    if (k === shown) return;
    shown = k;
    steps.forEach((el, n) => {
      el.classList.toggle('on', n === k);
      el.classList.toggle('past', n < k);
    });
    ticks.forEach((el, n) => el.classList.toggle('on', n <= k));
    pos.textContent = k < s.main.length ? String(k + 1).padStart(2, '0') : '+';
  }
  show(0);

  // состояние главы по прокрутке: шаг, наезд камеры, доля перелёта к следующему кадру
  return {
    state(scrollY) {
      const top = sec.offsetTop;
      const len = sec.offsetHeight - innerHeight;
      const p = Math.min(1, Math.max(0, (scrollY - top) / len));
      const stepsEnd = 1 - FLIGHT_SHARE;
      const sp = Math.min(1, p / stepsEnd);
      const k = Math.min(STEPS - 1, Math.floor(sp * STEPS));
      show(k);
      // камера едет непрерывно, но «доезжает» к табличке в середине шага
      const slot = Math.min(5, sp * STEPS - 0.5);
      const dolly = Math.max(0, slot) * DOLLY_STEP;
      const flight = p <= stepsEnd ? 0 : (p - stepsEnd) / FLIGHT_SHARE;
      col.style.opacity = String(1 - Math.min(1, flight * 2.2));
      return { step: Math.min(k, 5), also: k === STEPS - 1, dolly, flight };
    },
  };
}
