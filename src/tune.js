// Панель настройки кадров и окон глав на телефоне (только в разработке, адрес с ?tune=1).
// Для текущей главы (услуги / кейсы / этапы): поворот взгляда, сдвиг камеры, наезд на шаг,
// положение окна (низ / верх, отступ, ширина). Итог — в window.__tuneOut (кнопка «Готово» показывает его).
const NAMES = { services: 'Услуги', cases: 'Кейсы', process: 'Этапы' };
const WIN = { services: {}, cases: {}, process: {} }; // положение окна по главам

export function initTune({ CH_LOOK, CH_CAM, chapters, update }) {
  const ids = Object.keys(chapters);
  let cur = ids[0];

  const SLIDERS = [
    { key: 'lx', label: 'Взгляд ← →', min: -3, max: 3, step: 0.05, get: () => CH_LOOK[cur][0], set: (v) => { CH_LOOK[cur][0] = v; } },
    { key: 'ly', label: 'Взгляд ↓ ↑', min: -3, max: 3, step: 0.05, get: () => CH_LOOK[cur][1], set: (v) => { CH_LOOK[cur][1] = v; } },
    { key: 'cx', label: 'Камера ← →', min: -3, max: 3, step: 0.05, get: () => CH_CAM[cur][0], set: (v) => { CH_CAM[cur][0] = v; } },
    { key: 'cy', label: 'Камера ниже / выше', min: -2, max: 3, step: 0.05, get: () => CH_CAM[cur][1], set: (v) => { CH_CAM[cur][1] = v; } },
    { key: 'cz', label: 'Камера ближе / дальше', min: -6, max: 6, step: 0.1, get: () => CH_CAM[cur][2], set: (v) => { CH_CAM[cur][2] = v; } },
    { key: 'dl', label: 'Наезд на шаг, м', min: 0, max: 2.5, step: 0.05, get: () => chapters[cur].dollyStep, set: (v) => { chapters[cur].dollyStep = v; } },
    { key: 'wg', label: 'Окно: отступ от края', min: 0, max: 300, step: 2, get: () => WIN[cur].gap ?? 12, set: (v) => { WIN[cur].gap = v; applyWin(); } },
    { key: 'ww', label: 'Окно: ширина, %', min: 60, max: 100, step: 1, get: () => WIN[cur].width ?? 100, set: (v) => { WIN[cur].width = v; applyWin(); } },
  ];

  function applyWin() {
    for (const id of ids) {
      const sec = document.getElementById(id);
      const w = WIN[id];
      sec.style.setProperty('--chw-align', w.top ? 'flex-start' : 'flex-end');
      sec.style.setProperty('--chw-gap', `${w.top ? 12 : (w.gap ?? 12)}px`);
      sec.style.setProperty('--chw-top', `${w.top ? 64 + (w.gap ?? 12) : 74}px`);
      sec.style.setProperty('--chw-width', `${w.width ?? 100}%`);
    }
  }

  const box = document.createElement('div');
  box.className = 'tune-panel scrollable';
  box.innerHTML = `
    <style>
      .tune-panel { position: fixed; z-index: 60; left: 8px; right: 8px; top: 64px; max-height: 46svh; overflow: auto;
        background: rgba(31,29,25,.92); color: #f3efe6; border-radius: 12px; padding: 10px 12px; font: 12px/1.3 Inter, sans-serif; }
      .tune-panel.min .tune-sliders, .tune-panel.min pre { display: none; }
      .tune-panel header { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
      .tune-sliders { margin-top: 8px; }
      .tune-panel button { font: 600 12px Inter, sans-serif; padding: 6px 9px; border-radius: 8px; border: 0; background: #3a3833; color: #f3efe6; }
      .tune-panel button.on { background: #ffd400; color: #1f1d19; }
      .tune-panel label { display: grid; grid-template-columns: 1fr 52px; gap: 2px 8px; margin: 6px 0; }
      .tune-panel input[type=range] { grid-column: 1 / -1; width: 100%; }
      .tune-panel output { text-align: right; color: #ffd400; font-family: ui-monospace, monospace; }
      .tune-panel pre { white-space: pre-wrap; font-size: 10.5px; background: #111; padding: 8px; border-radius: 8px; user-select: all; }
    </style>
    <header>
      ${ids.map((id) => `<button data-ch="${id}">${NAMES[id]}</button>`).join('')}
      <button data-act="top">Окно сверху</button>
      <button data-act="min">Свернуть</button>
      <button data-act="done">Готово</button>
    </header>
    <div class="tune-sliders"></div>
    <pre hidden></pre>`;
  document.body.append(box);
  const sl = box.querySelector('.tune-sliders');
  const pre = box.querySelector('pre');

  function render() {
    box.querySelectorAll('[data-ch]').forEach((b) => b.classList.toggle('on', b.dataset.ch === cur));
    box.querySelector('[data-act="top"]').classList.toggle('on', !!WIN[cur].top);
    sl.innerHTML = SLIDERS.map((s) => `
      <label>${s.label}<output data-o="${s.key}">${(+s.get()).toFixed(2)}</output>
        <input type="range" data-k="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.get()}"></label>`).join('');
  }
  sl.addEventListener('input', (e) => {
    const s = SLIDERS.find((x) => x.key === e.target.dataset.k);
    if (!s) return;
    s.set(+e.target.value);
    sl.querySelector(`[data-o="${s.key}"]`).textContent = (+e.target.value).toFixed(2);
    update();
  });
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.ch) {
      cur = b.dataset.ch;
      // переходим к первому шагу выбранной главы
      const sec = document.getElementById(cur);
      const mk = [...document.querySelectorAll('.snap-mark')].map((m) => parseInt(m.style.top, 10)).find((y) => y >= sec.offsetTop);
      window.scrollTo({ top: mk ?? sec.offsetTop, behavior: 'instant' });
    }
    if (b.dataset.act === 'top') { WIN[cur].top = !WIN[cur].top; applyWin(); }
    if (b.dataset.act === 'min') box.classList.toggle('min');
    if (b.dataset.act === 'done') {
      window.__tuneOut = {
        look: CH_LOOK, cam: CH_CAM,
        dolly: Object.fromEntries(ids.map((id) => [id, chapters[id].dollyStep])),
        win: WIN,
      };
      pre.hidden = false;
      pre.textContent = JSON.stringify(window.__tuneOut);
    }
    render();
    update();
  });
  // текущая глава — по прокрутке
  addEventListener('scroll', () => {
    const y = scrollY + innerHeight / 2;
    const id = ids.find((k) => { const s = document.getElementById(k); return y >= s.offsetTop && y < s.offsetTop + s.offsetHeight; });
    if (id && id !== cur) { cur = id; render(); }
  }, { passive: true });
  applyWin();
  render();
}
