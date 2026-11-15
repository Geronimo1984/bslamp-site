// Пошаговая прокрутка (компьютер с 3D): одно движение колеса — перелёт к следующей «точке» сайта.
// Точки: первый экран, каждый шаг глав (услуги, кейсы, этапы), «О нас», заявка. Паузы и промежуточные
// кадры не останавливают — камера пролетает их во время анимации прокрутки.
// Внутри полей формы и прокручиваемых списков колесо работает как обычно; после заявки (подвал) — тоже.
const LOCK_MS = 250; // пауза после перелёта, чтобы инерция тачпада не проскакивала через точку

export function initSnap({ chapterIds }) {
  let animating = false;
  let unlockAt = 0;
  let acc = 0;
  let accTimer = null;

  // точки остановки — считаются заново при каждом шаге (высоты могли измениться)
  function stops() {
    const list = [0];
    const H = innerHeight;
    for (const id of ['services', 'cases', 'process', 'about', 'order']) {
      const sec = document.getElementById(id);
      if (!sec) continue;
      const top = sec.offsetTop;
      if (chapterIds.includes(id) && sec.classList.contains('chapter-on')) {
        const n = sec.querySelectorAll('.ch-step').length;
        const len = sec.offsetHeight - H;
        const stepsEnd = 1 - 0.14; // доля шагов в главе (последняя часть — перелёт), как в chapter.js
        for (let k = 0; k < n; k++) list.push(Math.round(top + len * stepsEnd * ((k + 0.5) / n)));
      } else {
        // обычный раздел: начало, и если он выше экрана — ещё точки до его конца
        const start = Math.max(0, top - 24);
        list.push(start);
        for (let y = start + H * 0.8; y < top + sec.offsetHeight - H; y += H * 0.8) list.push(Math.round(y));
      }
    }
    return [...new Set(list)].sort((a, b) => a - b);
  }

  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  function flyTo(y) {
    const from = scrollY;
    const dist = Math.abs(y - from);
    if (dist < 2) return;
    animating = true;
    const dur = Math.min(1700, 700 + dist * 0.12); // дальний перелёт чуть дольше
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      window.scrollTo({ top: from + (y - from) * ease(p), behavior: 'instant' });
      if (p < 1) requestAnimationFrame(tick);
      else { animating = false; unlockAt = performance.now() + LOCK_MS; }
    };
    requestAnimationFrame(tick);
  }

  function step(dir) {
    if (animating || performance.now() < unlockAt) return true;
    const list = stops();
    const y = scrollY;
    const last = list[list.length - 1];
    if (dir > 0 && y >= last - 4) return false; // ниже заявки — обычная прокрутка (подвал)
    const next = dir > 0 ? list.find((s) => s > y + 4) : [...list].reverse().find((s) => s < y - 4);
    if (next === undefined) return false;
    flyTo(next);
    return true;
  }

  const freeZone = (el) => el?.closest?.('input, textarea, select, .journal-list, .nav-mobile, .scrollable');

  addEventListener('wheel', (e) => {
    if (freeZone(e.target) || e.ctrlKey) return;
    const list = stops();
    if (e.deltaY > 0 && scrollY >= list[list.length - 1] - 4) return; // подвал
    e.preventDefault();
    if (animating || performance.now() < unlockAt) return;
    acc += e.deltaY;
    clearTimeout(accTimer);
    accTimer = setTimeout(() => { acc = 0; }, 160);
    if (Math.abs(acc) < 30) return; // мелкое касание тачпада — не шаг
    const dir = Math.sign(acc);
    acc = 0;
    step(dir);
  }, { passive: false });

  addEventListener('keydown', (e) => {
    if (freeZone(e.target) || e.altKey || e.metaKey || e.ctrlKey) return;
    const dir = ['ArrowDown', 'PageDown', ' '].includes(e.key) ? 1 : ['ArrowUp', 'PageUp'].includes(e.key) ? -1 : 0;
    if (!dir) return;
    if (step(dir)) e.preventDefault();
  });

  // ссылки меню (#services, #cases…) — тем же перелётом к первой точке раздела
  return {
    goTo(id) {
      const sec = document.getElementById(id);
      if (!sec) return false;
      const target = stops().find((s) => s >= sec.offsetTop - 30);
      if (target === undefined) return false;
      flyTo(target);
      return true;
    },
  };
}
