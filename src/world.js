// Режим «мир»: блоки сайта — стенды внутри 3D-склада (CSS3D: настоящий HTML в пространстве сцены).
// Перемещение по шагам: колесо / свайп / клавиши / мини-карта → перелёт камеры к локации.
// Плоская версия сайта остаётся в разметке: для поисковиков и как запасной вариант без 3D.
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

const IDS = ['hero', 'services', 'cases', 'process', 'about', 'order'];

// Стенды локаций: место в мире, размер (метры), ширина HTML (px). Пока готов «Вход», остальные — таблички «скоро».
const STANDS = [
  // кадр входа: камера (1.7, 6.1, 15.8) → табло чуть левее центра, монитор справа, оба целиком в кадре
  { id: 'hero', pos: [-0.12, 4.35, 9.8], width: 3.8, px: 1000, faceFrom: [1.7, 6.1, 15.8] },
  { id: 'hero-code', pos: [3.0, 3.95, 9.35], width: 1.6, px: 560, faceFrom: [1.7, 6.1, 15.8] },
  { id: 'services', pos: [0.4, 2.6, 2.6], width: 2.4, px: 600, faceFrom: [0.4, 2.3, 7] },
  { id: 'cases', pos: [-0.4, 2.5, -7.6], width: 2.2, px: 600, faceFrom: [-1.31, 2.78, -3.572] },
  { id: 'process', pos: [-4.4, 2.4, -18.6], width: 2.4, px: 600, faceFrom: [-1.5, 2.8, -15.5] },
  { id: 'about', pos: [7.6, 2.2, -31.4], width: 2.4, px: 600, faceFrom: [4.591, 2.2, -30.929] },
  { id: 'order', pos: [-0.2, 4.6, -6.5], width: 2.4, px: 600, faceFrom: [0, 7, -2] },
];

function heroHTML(t) {
  return `
    <div class="stand-board stand-hero">
      <p class="kicker">${t.hero.kicker}</p>
      <h1>${t.hero.title.map((l, i) => `<span${i === 1 ? ' class="mark"' : ''}>${l}</span>`).join('<br>')}</h1>
      <p class="lead">${t.hero.lead}</p>
      <div class="cta">
        <a class="btn btn-y" href="#order">${t.hero.cta}</a>
        <a class="btn btn-ghost" href="#cases">${t.hero.cta2}</a>
      </div>
    </div>`;
}

function codeHTML(lang) {
  return `
    <div class="stand-monitor">
      <div class="code-head"><span></span><span></span><span></span><em>${lang === 'ru' ? 'МодульОбъекта.bsl' : 'ObjectModule.bsl'}</em></div>
      <pre class="bsl" id="world-bsl"></pre>
    </div>`;
}

function soonHTML(t, id) {
  const titles = { services: t.services.title, cases: t.cases.title, process: t.process.title, about: t.about.kicker, order: t.order.title };
  return `<div class="stand-board stand-soon"><p class="kicker">${t.nav[id] ?? ''}</p><h2>${titles[id]}</h2><p class="lead">Стенд в работе</p></div>`;
}

export function initWorld(scene3d, { t, lang, mobile, typeBsl, reduced }) {
  const { THREE, camera } = scene3d;
  document.body.classList.add('world');

  // ---------- слой CSS3D поверх WebGL ----------
  const layer = document.getElementById('world-css');
  const css = new CSS3DRenderer({ element: layer });
  const cssScene = new THREE.Scene();
  scene3d.onResize((w, h) => css.setSize(w, h));

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2c2b29, roughness: 0.5, metalness: 0.5 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffd400 });
  const stands = [];

  function buildStand(cfg, html) {
    const el = document.createElement('div');
    el.className = `stand stand-${cfg.id}`;
    el.style.width = `${cfg.px}px`;
    el.innerHTML = html;
    // замер реальной высоты содержимого — по ней строится рама стенда
    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    document.body.append(el);
    const hPx = el.offsetHeight || cfg.px * 0.56;
    el.remove();
    el.style.position = '';
    el.style.visibility = '';
    const obj = new CSS3DObject(el);
    obj.position.set(...cfg.pos);
    obj.scale.setScalar(cfg.width / cfg.px);
    obj.lookAt(new THREE.Vector3(...cfg.faceFrom));
    cssScene.add(obj);

    // физическая рама стенда в WebGL: тёмный корпус, жёлтая подсветка снизу, тросы к потолку
    const hM = (hPx * cfg.width) / cfg.px;
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(cfg.width + 0.16, hM + 0.16, 0.08), frameMat);
    body.position.z = -0.05;
    group.add(body);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(cfg.width + 0.16, 0.04, 0.09), lightMat);
    strip.position.set(0, -hM / 2 - 0.1, -0.04);
    group.add(strip);
    const cableLen = Math.max(0, 7.9 - (cfg.pos[1] + hM / 2));
    if (cableLen > 0.2) {
      for (const dx of [-cfg.width * 0.38, cfg.width * 0.38]) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.02, cableLen, 0.02), frameMat);
        c.position.set(dx, hM / 2 + cableLen / 2, -0.05);
        group.add(c);
      }
    }
    group.position.copy(obj.position);
    group.quaternion.copy(obj.quaternion);
    scene3d.scene.add(group);
    stands.push({ cfg, el, obj, group, mats: [body.material] });
    return el;
  }

  function buildAll() {
    stands.splice(0).forEach((s) => { cssScene.remove(s.obj); scene3d.scene.remove(s.group); s.el.remove(); });
    // на телефоне текст локации — в карточке снизу, а в 3D висит компактная табличка с заголовком
    if (mobile) buildStand({ ...STANDS[0], pos: [0.9, 4.6, 9.8], width: 2.2, px: 600 }, `<div class="stand-board stand-soon"><p class="kicker">BSLamp</p><h2>${t.hero.title[0]}</h2></div>`);
    else buildStand(STANDS[0], heroHTML(t));
    STANDS.slice(2).forEach((cfg) => buildStand(cfg, soonHTML(t, cfg.id)));
    if (mobile) return; // на узком экране монитор с кодом не помещается в кадр
    const code = buildStand(STANDS[1], codeHTML(lang));
    typeBsl(code.querySelector('.bsl'), lang, reduced);
  }
  buildAll();

  // каждый кадр: рисуем стенды той же камерой; стенд рядом с камерой гаснет — камера сквозь него не «проходит»
  const tmp = new THREE.Vector3();
  scene3d.onFrame((_, cam) => {
    for (const s of stands) {
      const d = tmp.copy(s.obj.position).distanceTo(cam.position);
      const o = Math.min(1, Math.max(0, (d - 1.6) / 1.4));
      s.el.style.opacity = o.toFixed(2);
      s.el.style.pointerEvents = o > 0.6 ? 'auto' : 'none';
      s.group.visible = o > 0.05;
    }
    css.render(cssScene, cam);
  });

  // ---------- навигация по шагам ----------
  let index = 0;
  let lockedUntil = 0;
  const dots = document.querySelectorAll('.wm-dot');
  const hint = document.getElementById('world-hint');
  function go(i) {
    index = Math.max(0, Math.min(IDS.length - 1, i));
    scene3d.setProgress(index / (IDS.length - 1));
    lockedUntil = performance.now() + 1100;
    dots.forEach((d, k) => d.classList.toggle('on', k === index));
    if (index > 0) hint?.classList.add('gone');
    document.dispatchEvent(new CustomEvent('world:location', { detail: { index, id: IDS[index] } }));
  }
  const step = (dir) => { if (performance.now() >= lockedUntil) go(index + dir); };
  let wheelAcc = 0;
  addEventListener('wheel', (e) => {
    if (e.target?.closest?.('.world-sheet, .nav-mobile, .scrollable')) return; // только там, где есть своя прокрутка
    e.preventDefault();
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 40) { step(Math.sign(wheelAcc)); wheelAcc = 0; }
  }, { passive: false });
  let touchY = null;
  addEventListener('touchstart', (e) => { touchY = e.target?.closest?.('.world-sheet') ? null : e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (touchY === null) return;
    const dy = touchY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) step(Math.sign(dy));
    touchY = null;
  });
  addEventListener('keydown', (e) => {
    if (e.target?.closest?.('input, textarea, select')) return;
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); step(1); }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); step(-1); }
  });
  // ссылки-якоря (#cases, #order…) ведут к локациям, а не прокручивают страницу
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const k = IDS.indexOf(a.getAttribute('href').slice(1));
    if (k < 0) return;
    e.preventDefault();
    go(k);
  });
  dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
  go(0);

  // ---------- заставка: загорается лампочка — включается свет на складе ----------
  const splash = document.getElementById('world-splash');
  if (splash && !reduced) {
    scene3d.setExposure(0.05);
    const t0 = performance.now();
    const DUR = 1700;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      splash.classList.add('off');
      scene3d.setExposure(1);
      setTimeout(() => splash.remove(), 700);
    };
    splash.addEventListener('click', finish);
    const tick = (now) => {
      if (done) return;
      const p = Math.min(1, (now - t0) / DUR);
      splash.style.setProperty('--glow', p.toFixed(3));
      scene3d.setExposure(0.05 + 0.95 * Math.max(0, (p - 0.35) / 0.65));
      if (p < 1) requestAnimationFrame(tick); else finish();
    };
    requestAnimationFrame(tick);
  } else {
    splash?.remove();
  }

  return {
    refresh(next) { t = next.t; lang = next.lang; buildAll(); },
    go,
  };
}
