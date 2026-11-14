// «Живой склад»: текст сайта остаётся плоским и читаемым, а склад отвечает на то, что человек читает.
// Каждой части сайта — своё событие в 3D, короткое и без слов длиннее двух-трёх:
//   услуги  — на стеллаже по очереди загораются таблички мест 01–06, наведение на услугу подсвечивает её табличку;
//   кейсы   — ТСД сканирует коробку, над ней всплывает «✓ принято» (и при каждом переключении кейса);
//   этапы   — табло над доком считает отгрузку 0/6 → 6/6 по мере появления этапов;
//   о нас   — над стойками горит «1С · онлайн» с пульсирующей точкой;
//   заявка  — табло «Заявка · черновик», после «Провести» — «проведена ✓» и вспышка света.
const YELLOW = '#ffd400';
const INK = '#1f1d19';
const GREEN = '#2fbf71';
const FONT = 'Unbounded, Arial Black, sans-serif';
const MONO = '"JetBrains Mono", Menlo, monospace';

export function initLive(scene3d, { lang, reduced }) {
  const { THREE, scene } = scene3d;
  const ru = lang === 'ru';

  // холст → текстура; draw вызывается заново при каждом обновлении табло
  function board(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const redraw = (...a) => { g.clearRect(0, 0, w, h); draw(g, w, h, ...a); tex.needsUpdate = true; };
    return { tex, redraw };
  }
  function plate(tex, w, h) {
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  }
  // табло висит на двух тросах и повёрнуто к кадру своей локации (stations: 0 вход … 5 заявка)
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x2c2b29 });
  function hang(mesh, pos, station) {
    mesh.position.set(...pos);
    const cam = new THREE.Vector3(...scene3d.keys[station].pos);
    mesh.lookAt(cam.x, pos[1], cam.z); // только поворот вокруг вертикали — табло не заваливается
    const w = mesh.geometry.parameters.width;
    const h = mesh.geometry.parameters.height;
    const len = 7.9 - pos[1] - h / 2;
    for (const dx of [-w * 0.4, w * 0.4]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.015, len, 0.015), cableMat);
      c.position.set(dx, h / 2 + len / 2, -0.01);
      mesh.add(c);
    }
    scene.add(mesh);
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
  }

  // ---------- 1. таблички мест 01–06 на стеллаже (услуги) ----------
  // флажки торчат из правого стеллажа в проход и смотрят на камеру — как настоящие адресные таблички
  const SLOT_Z = [3.0, 1.2, -0.6, -2.4, -4.2, -6.0];
  const slots = SLOT_Z.map((z, i) => {
    const num = String(i + 1).padStart(2, '0');
    const b = board(256, 160, (g, w, h, on) => {
      roundRect(g, 4, 4, w - 8, h - 8, 18);
      g.fillStyle = on ? YELLOW : '#3a3833';
      g.fill();
      g.fillStyle = on ? INK : '#8b877d';
      g.font = `700 ${h * 0.5}px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(num, w / 2, h / 2 + 4);
    });
    b.redraw(false);
    const m = plate(b.tex, 0.5, 0.31);
    m.position.set(2.32, 3.35, z);
    // крепление к стойке стеллажа
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.03), new THREE.MeshStandardMaterial({ color: 0x2c2b29 }));
    arm.position.set(0.28, 0.17, 0);
    m.add(arm);
    scene.add(m);
    return { m, b, on: false, hot: 0 };
  });
  function setSlot(i, on) {
    const s = slots[i];
    if (!s || s.on === on) return;
    s.on = on;
    s.b.redraw(on);
  }
  let slotTimers = [];
  function slotsOn(on) {
    slotTimers.forEach(clearTimeout);
    slotTimers = slots.map((_, i) => setTimeout(() => setSlot(i, on), reduced ? 0 : (on ? 140 + i * 170 : 0)));
  }
  // наведение на услугу — её табличка «подпрыгивает»
  document.addEventListener('pointerover', (e) => {
    const li = e.target.closest?.('.svc-list .svc');
    if (!li) return;
    const i = [...li.parentElement.children].indexOf(li);
    if (slots[i]) slots[i].hot = 1;
  });

  // ---------- 2. сканирование коробки ТСД (кейсы) ----------
  const tick = board(512, 160, (g, w, h) => {
    roundRect(g, 6, 6, w - 12, h - 12, 40);
    g.fillStyle = GREEN;
    g.fill();
    g.fillStyle = '#fff';
    g.font = `700 ${h * 0.4}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ru ? '✓ Принято' : '✓ Received', w / 2, h / 2 + 3);
  });
  tick.redraw();
  // значок рисуется поверх всего (depthTest: false) и левее ТСД — не «проходит» сквозь модель
  const tickSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tick.tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false }));
  tickSprite.scale.set(1.1, 0.34, 1);
  tickSprite.renderOrder = 10;
  tickSprite.visible = false;
  scene.add(tickSprite);
  const crate = scene.getObjectByName('Коробка со штрихкодом');
  const CRATE = crate ? crate.position.clone() : new THREE.Vector3(0.8, 1.15, -10.6);
  let scanAt = -1;
  const scan = () => { scanAt = performance.now(); };

  // ---------- 3. табло отгрузки над доком 04 (этапы) ----------
  const ship = board(1024, 256, (g, w, h, n) => {
    roundRect(g, 0, 0, w, h, 26);
    g.fillStyle = '#1f1d19';
    g.fill();
    const done = n >= 6;
    g.fillStyle = done ? GREEN : YELLOW;
    g.font = `700 ${h * 0.24}px ${MONO}`;
    g.textBaseline = 'middle';
    g.fillText(done ? (ru ? 'ОТГРУЖЕНО ✓' : 'SHIPPED ✓') : (ru ? 'ОТГРУЗКА' : 'SHIPPING'), 48, h * 0.32);
    g.textAlign = 'right';
    g.fillStyle = '#f3efe6';
    g.fillText(`${n} / 6`, w - 48, h * 0.32);
    // шесть сегментов — шесть этапов
    for (let k = 0; k < 6; k++) {
      g.fillStyle = k < n ? (done ? GREEN : YELLOW) : '#3a3833';
      g.fillRect(48 + k * ((w - 96) / 6), h * 0.62, (w - 96) / 6 - 14, h * 0.18);
    }
  });
  ship.redraw(0);
  const shipBoard = plate(ship.tex, 2.4, 0.6);
  hang(shipBoard, [-4.4, 3.7, -26], 3);
  let shipN = 0;
  let shipTimer = null;
  function shipTo(n) {
    clearInterval(shipTimer);
    if (reduced) { shipN = n; ship.redraw(n); return; }
    shipTimer = setInterval(() => {
      if (shipN === n) return clearInterval(shipTimer);
      shipN += Math.sign(n - shipN);
      ship.redraw(shipN);
    }, 260);
  }

  // ---------- 4. статус базы над серверными стойками (о нас) ----------
  // текстура рисуется один раз; пульсирует отдельный кружок (без перерисовки холста каждый кадр)
  const status = board(1024, 220, (g, w, h) => {
    roundRect(g, 0, 0, w, h, 26);
    g.fillStyle = 'rgba(31,29,25,0.92)';
    g.fill();
    g.fillStyle = '#f3efe6';
    g.font = `700 ${h * 0.3}px ${MONO}`;
    g.textBaseline = 'middle';
    g.fillText(ru ? '1С · ОНЛАЙН' : '1C · ONLINE', 136, h / 2);
  });
  status.redraw();
  const statusBoard = plate(status.tex, 2.0, 0.43);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x2fbf71, transparent: true, toneMapped: false });
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), dotMat);
  dot.position.set(-1.0 + (78 / 1024) * 2.0, 0, 0.005);
  statusBoard.add(dot);
  hang(statusBoard, [11.4, 2.75, -29.4], 4); // перед стойками серверной, справа вверху кадра

  // ---------- 5. табло заявки (заявка) ----------
  const orderB = board(1024, 256, (g, w, h, posted) => {
    roundRect(g, 0, 0, w, h, 26);
    g.fillStyle = posted ? GREEN : '#1f1d19';
    g.fill();
    g.fillStyle = posted ? '#fff' : YELLOW;
    g.font = `700 ${h * 0.26}px ${MONO}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(posted ? (ru ? 'ЗАЯВКА ПРОВЕДЕНА ✓' : 'REQUEST POSTED ✓') : (ru ? 'ЗАЯВКА · ЧЕРНОВИК' : 'REQUEST · DRAFT'), w / 2, h / 2);
  });
  orderB.redraw(false);
  const orderBoard = plate(orderB.tex, 2.6, 0.65);
  hang(orderBoard, [2.5, 5.0, -8.2], 5);
  let flashAt = -1;
  document.addEventListener('order:posted', () => { orderB.redraw(true); flashAt = performance.now(); });

  // ---------- кадр: плавные мелочи ----------
  scene3d.onFrame((t) => {
    const now = performance.now();
    for (const s of slots) {
      if (!s.hot) continue;
      s.hot = Math.max(0, s.hot - 0.03);
      s.m.scale.setScalar(1 + s.hot * 0.25);
    }
    if (scanAt > 0) {
      const p = (now - scanAt) / 1400;
      tickSprite.visible = p < 1;
      if (p >= 1) scanAt = -1;
      else {
        tickSprite.position.set(CRATE.x - 0.45, CRATE.y + 0.5 + p * 0.3, CRATE.z + 0.3);
        tickSprite.material.opacity = p < 0.15 ? p / 0.15 : 1 - Math.max(0, (p - 0.6) / 0.4);
      }
    }
    if (active === 'p-server' || active === 'about') dotMat.opacity = 0.35 + 0.65 * (Math.sin(t * 3) + 1) / 2;
    if (flashAt > 0) {
      const p = (now - flashAt) / 900;
      scene3d.setExposure(p >= 1 ? 1 : 1 + 0.6 * Math.sin(p * Math.PI));
      if (p >= 1) flashAt = -1;
    }
  });

  // ---------- смена раздела ----------
  let active = null;
  let scanTimer = null;
  function setSection(id) {
    if (id === active) return;
    active = id;
    slotsOn(id === 'p-forklift' || id === 'services');
    clearInterval(scanTimer);
    if (id === 'p-tsd' || id === 'cases') {
      scan();
      scanTimer = setInterval(scan, 3200);
    }
    if (id === 'p-truck') shipTo(0);
    if (id === 'process' || id === 'p-server') shipTo(6);
  }
  // переключение кейса — новое сканирование
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('.journal-row, .case-view button')) scan();
  });

  return { setSection };
}
